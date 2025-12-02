const axios = require('axios');
const playerModel = require('../models/playerModel');
const websocketService = require('./websocketService');

const delay = ms => new Promise(res => setTimeout(res, ms));

const accountIdFromSteamId = (steam_id) => {
  try {
    const accountId = BigInt(steam_id) - BigInt('76561197960265728');
    return accountId.toString();
  } catch (e) {
    return null;
  }
};

const updatePlayerFromOpenDota = async (steam_id) => {
  const accountId = accountIdFromSteamId(steam_id);
  if (!accountId) return null;
  try {
    const response = await axios.get(`https://api.opendota.com/api/players/${accountId}`);
    const data = response.data;
    const nuevaInfo = {
      mmr_estimate: data.mmr_estimate?.estimate ?? null,
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
