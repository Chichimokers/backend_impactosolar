const db = require('../db');

const getAllPlayers = () => db.prepare('SELECT * FROM players').all();

const findBySteamId = (steam_id) => db.prepare('SELECT * FROM players WHERE steam_id = ?').get(steam_id);

const insertOrIgnorePlayer = (steam_id, name = null, dotabuff = null) => {
  try {
    db.prepare('INSERT OR IGNORE INTO players (steam_id, name, dotabuff, last_update) VALUES (?, ?, ?, ?)')
      .run(steam_id, name, dotabuff, 0);
    // if exists, optionally update name/dotabuff
    db.prepare('UPDATE players SET name = COALESCE(?, name), dotabuff = COALESCE(?, dotabuff) WHERE steam_id = ?')
      .run(name, dotabuff, steam_id);
    return findBySteamId(steam_id);
  } catch (e) {
    throw e;
  }
};

const updatePlayerOpenDota = (steam_id, data = {}) => {
  db.prepare(`
    UPDATE players SET
      mmr_estimate = COALESCE(?, mmr_estimate),
      rank_tier = COALESCE(?, rank_tier),
      rank_leaderboard = COALESCE(?, rank_leaderboard),
      profile = COALESCE(?, profile),
      avatar = COALESCE(?, avatar),
      recent_win_rate = COALESCE(?, recent_win_rate),
      recent_kda = COALESCE(?, recent_kda),
      recent_gpm = COALESCE(?, recent_gpm),
      recent_xpm = COALESCE(?, recent_xpm),
      most_played_hero_id = COALESCE(?, most_played_hero_id),
      region_cluster = COALESCE(?, region_cluster),
      last_update = ?
    WHERE steam_id = ?
  `).run(
    data.mmr_estimate,
    data.rank_tier,
    data.rank_leaderboard,
    data.profile,
    data.avatar,
    data.recent_win_rate,
    data.recent_kda,
    data.recent_gpm,
    data.recent_xpm,
    data.most_played_hero_id,
    data.region_cluster,
    Date.now(),
    steam_id
  );
  return findBySteamId(steam_id);
};

module.exports = {
  getAllPlayers,
  findBySteamId,
  insertOrIgnorePlayer,
  updatePlayerOpenDota,
};
