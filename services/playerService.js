const axios = require('axios');
const playerModel = require('../models/playerModel');

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

const updateAllPlayersFromOpenDota = async () => {
  const players = playerModel.getAllPlayers();
  const results = [];
  for (const p of players) {
    const r = await updatePlayerFromOpenDota(p.steam_id);
    results.push(r);
    await delay(1000);
  }
  return results;
};

module.exports = { updateAllPlayersFromOpenDota, updatePlayerFromOpenDota };
