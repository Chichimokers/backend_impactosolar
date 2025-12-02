const axios = require('axios');
const playerModel = require('../models/playerModel');
const websocketService = require('./websocketService');

const delay = ms => new Promise(res => setTimeout(res, ms));

const REGION_NAMES = {
  1: "US WEST",
  2: "US EAST",
  3: "EUROPE",
  5: "SINGAPORE",
  6: "DUBAI",
  7: "AUSTRALIA",
  8: "STOCKHOLM",
  9: "AUSTRIA",
  10: "BRAZIL",
  11: "SOUTHAFRICA",
  12: "PW TELECOM SHANGHAI",
  13: "PW UNICOM",
  14: "CHILE",
  15: "PERU",
  16: "INDIA",
  17: "PW TELECOM GUANGDONG",
  18: "PW TELECOM ZHEJIANG",
  19: "JAPAN",
  20: "PW TELECOM WUHAN",
  25: "PW UNICOM TIANJIN",
  37: "TAIWAN",
  38: "ARGENTINA"
};

const accountIdFromSteamId = (steam_id) => {
  const idStr = String(steam_id);
  // Si es corto (menos de 16 caracteres), asumimos que ya es un Account ID (32-bit)
  if (idStr.length < 16) {
    return idStr;
  }
  try {
    const accountId = BigInt(steam_id) - BigInt('76561197960265728');
    return accountId.toString();
  } catch (e) {
    return null;
  }
};

const calculateEstimatedMMR = (rank_tier, leaderboard_rank) => {
  if (!rank_tier) return null;

  const rank = Math.floor(rank_tier / 10); // 1 to 8
  const stars = rank_tier % 10; // 1 to 5

  // Herald (1) to Ancient (6)
  // Formula: (Rank - 1) * 770 + (Stars - 1) * 154
  if (rank >= 1 && rank <= 6) {
    const baseRankMMR = (rank - 1) * 770;
    const starMMR = (stars > 0 ? stars - 1 : 0) * 154;
    return baseRankMMR + starMMR;
  }

  // Divine (7) - Step 200
  if (rank === 7) {
    const baseDivine = 4620;
    const starMMR = (stars > 0 ? stars - 1 : 0) * 200;
    return baseDivine + starMMR;
  }

  // Immortal (8)
  if (rank === 8) {
    // Base Immortal if no rank
    if (!leaderboard_rank) return 5620;
    
    // Estimate based on leaderboard rank
    // Adjusted: Rank 3551 is approx 9500 MMR
    // Segment 1: Rank 1-1000 (13500 -> 11000) -> ~2.5 MMR per rank
    // Segment 2: Rank 1001+ (11000 -> ...) -> ~0.6 MMR per rank
    if (leaderboard_rank <= 1000) {
      return Math.floor(13500 - (leaderboard_rank * 2.5));
    } else {
      return Math.floor(11000 - ((leaderboard_rank - 1000) * 0.6));
    }
  }

  return null;
};

const updatePlayerFromOpenDota = async (steam_id) => {
  const accountId = accountIdFromSteamId(steam_id);
  if (!accountId) return null;
  try {
    // Fetch Profile & Recent Matches in parallel
    // Use catch on BOTH to allow partial updates or just keeping old data
    const [profileRes, matchesRes] = await Promise.all([
      axios.get(`https://api.opendota.com/api/players/${accountId}`).catch(e => {
        console.error(`Error fetching profile for ${steam_id}:`, e.message);
        return { data: {} };
      }),
      axios.get(`https://api.opendota.com/api/players/${accountId}/recentMatches`).catch(e => {
        console.error(`Error fetching matches for ${steam_id}:`, e.message);
        return { data: [] };
      })
    ]);

    const data = profileRes.data || {};
    const matches = matchesRes.data || [];
    
    // Calculate MMR
    let mmr = data.mmr_estimate?.estimate;
    const calculatedMMR = calculateEstimatedMMR(data.rank_tier, data.leaderboard_rank);
    if (calculatedMMR) {
      mmr = calculatedMMR;
    }

    // Calculate Stats from Recent Matches
    let recent_win_rate = null;
    let recent_kda = null;
    let recent_gpm = null;
    let recent_xpm = null;
    let most_played_hero_id = null;
    let region_cluster = null;

    if (matches.length > 0) {
      let wins = 0;
      let totalKills = 0;
      let totalDeaths = 0;
      let totalAssists = 0;
      let totalGpm = 0;
      let totalXpm = 0;
      const heroCounts = {};

      matches.forEach(m => {
        // Win calculation
        const isRadiant = m.player_slot < 128;
        if ((isRadiant && m.radiant_win) || (!isRadiant && !m.radiant_win)) {
          wins++;
        }

        // KDA sums
        totalKills += m.kills;
        totalDeaths += m.deaths;
        totalAssists += m.assists;

        // GPM/XPM sums
        totalGpm += m.gold_per_min;
        totalXpm += m.xp_per_min;

        // Hero frequency
        heroCounts[m.hero_id] = (heroCounts[m.hero_id] || 0) + 1;
      });

      recent_win_rate = (wins / matches.length) * 100;
      recent_kda = totalDeaths === 0 ? (totalKills + totalAssists) : ((totalKills + totalAssists) / totalDeaths);
      recent_gpm = Math.round(totalGpm / matches.length);
      recent_xpm = Math.round(totalXpm / matches.length);

      // Find most played hero
      most_played_hero_id = Object.keys(heroCounts).reduce((a, b) => heroCounts[a] > heroCounts[b] ? a : b);
      
      // Determine Region from recent matches (fetch details for top 3)
      const regionCounts = {};
      // Take up to 3 recent matches to check region
      const matchesToFetch = matches.slice(0, 3);
      
      for (const m of matchesToFetch) {
        try {
          const matchDetail = await axios.get(`https://api.opendota.com/api/matches/${m.match_id}`);
          const region = matchDetail.data?.region;
          console.log(`Match ${m.match_id} region:`, region);
          // Validate that it is a known region (and not a cluster ID or garbage)
          if (region !== undefined && REGION_NAMES[region]) {
            regionCounts[region] = (regionCounts[region] || 0) + 1;
          }
          // Small delay to avoid bursting too hard
          await delay(300);
        } catch (err) {
          console.error(`Error fetching match ${m.match_id}:`, err.message);
        }
      }

      if (Object.keys(regionCounts).length > 0) {
        region_cluster = Object.keys(regionCounts).reduce((a, b) => regionCounts[a] > regionCounts[b] ? a : b);
      }
    }

    // If we have a valid region_cluster, we use it.
    // If we don't (it's null), we might want to keep the old one OR clear it if it's invalid.
    // But playerModel uses COALESCE, so nulls are ignored.
    // To fix the "122" issue, we need to ensure that if we successfully checked matches and found NO valid region,
    // we don't just send null if we want to overwrite bad data.
    // However, without knowing the current DB state, we can't selectively overwrite.
    // The best approach is: if we have matches but no valid region, maybe the player hasn't played in valid regions recently.
    
    const nuevaInfo = {
      mmr_estimate: mmr,
      rank_tier: data.rank_tier ?? null,
      rank_leaderboard: data.leaderboard_rank ?? null,
      profile: data.profile?.personaname ?? null,
      avatar: data.profile?.avatarfull ?? null,
      recent_win_rate: recent_win_rate ? parseFloat(recent_win_rate.toFixed(2)) : null,
      recent_kda: recent_kda ? parseFloat(recent_kda.toFixed(2)) : null,
      recent_gpm,
      recent_xpm,
      most_played_hero_id: most_played_hero_id ? parseInt(most_played_hero_id) : null,
      region_cluster: region_cluster ? parseInt(region_cluster) : null
    };
    
    // Force update if we have a valid region, otherwise let COALESCE handle it.
    // If the user wants to purge invalid regions (like 122), we would need to change playerModel logic
    // or pass a flag. For now, we rely on finding a valid region to overwrite the bad one.
    
    const updated = playerModel.updatePlayerOpenDota(steam_id, nuevaInfo);
    return updated;
  } catch (e) {
    console.error(e);
    return { steam_id, error: 'No se pudo obtener info de OpenDota' };
  }
};

let syncState = {
  running: false,
  total: 0,
  processed: 0,
  errors: 0,
  lastRun: null
};

const getSyncState = () => syncState;

const updateAllPlayersFromOpenDota = async () => {
  if (syncState.running) return; // Prevent concurrent runs

  const players = playerModel.getAllPlayers();
  syncState = {
    running: true,
    total: players.length,
    processed: 0,
    errors: 0,
    lastRun: new Date()
  };

  // Run in background (do not await this function call in controller)
  (async () => {
    for (const p of players) {
      try {
        const result = await updatePlayerFromOpenDota(p.steam_id);
        // Emit individual player update
        websocketService.broadcast({ type: 'PLAYER_UPDATE', data: result });
      } catch (e) {
        syncState.errors++;
      }
      syncState.processed++;
      
      // Emit progress update ONLY to admins
      websocketService.broadcastAdmin({ type: 'SYNC_PROGRESS', data: syncState });

      // Delay to respect rate limits (OpenDota free tier ~60/min)
      // We make multiple requests per player now (profile + recentMatches + ~3 matches)
      // ~5 requests per player -> 12 players/min -> 5000ms delay
      await delay(5000);
    }
    syncState.running = false;
    websocketService.broadcastAdmin({ type: 'SYNC_COMPLETE', data: syncState });
  })();

  return syncState;
};

module.exports = { updateAllPlayersFromOpenDota, updatePlayerFromOpenDota, getSyncState };
