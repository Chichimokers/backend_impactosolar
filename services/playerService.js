const axios = require('axios');
const playerModel = require('../models/playerModel');
const websocketService = require('./websocketService');

const delay = ms => new Promise(res => setTimeout(res, ms));

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
    // Segment 1: Rank 1-1000 (13000 -> 8000) -> ~5 MMR per rank
    // Segment 2: Rank 1001-5000 (8000 -> 5620) -> ~0.6 MMR per rank
    if (leaderboard_rank <= 1000) {
      return 13000 - (leaderboard_rank * 5);
    } else {
      return Math.floor(8000 - ((leaderboard_rank - 1000) * 0.6));
    }
  }

  return null;
};

const updatePlayerFromOpenDota = async (steam_id) => {
  const accountId = accountIdFromSteamId(steam_id);
  if (!accountId) return null;
  try {
    const response = await axios.get(`https://api.opendota.com/api/players/${accountId}`);
    const data = response.data;
    
    // Calculate MMR
    let mmr = data.mmr_estimate?.estimate;
    const calculatedMMR = calculateEstimatedMMR(data.rank_tier, data.leaderboard_rank);
    if (calculatedMMR) {
      mmr = calculatedMMR;
    }

    const nuevaInfo = {
      mmr_estimate: mmr,
      rank_tier: data.rank_tier ?? null,
      profile: data.profile?.personaname ?? null,
      avatar: data.profile?.avatarfull ?? null,
    };
    const updated = playerModel.updatePlayerOpenDota(steam_id, nuevaInfo);
    return updated;
  } catch (e) {
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
      // 1500ms = ~40 req/min (safe)
      await delay(10000);
    }
    syncState.running = false;
    websocketService.broadcastAdmin({ type: 'SYNC_COMPLETE', data: syncState });
  })();

  return syncState;
};

module.exports = { updateAllPlayersFromOpenDota, updatePlayerFromOpenDota, getSyncState };
