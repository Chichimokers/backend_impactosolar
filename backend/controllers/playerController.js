const playerModel = require('../models/playerModel');
const excelService = require('../services/excelService');

const addPlayer = (req, res) => {
  const { steam_id, name, dotabuff } = req.body;
  if (!steam_id) return res.status(400).json({ error: 'steam_id requerido' });
  try {
    const p = playerModel.insertOrIgnorePlayer(steam_id, name, dotabuff);
    res.json({ message: 'Player agregado/actualizado', player: p });
  } catch (e) {
    res.status(500).json({ error: 'Error insertando player' });
  }
};

const importExcel = async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Falta archivo' });
  try {
    const rows = excelService.parseExcelBuffer(req.file.buffer);
    const processed = [];
    for (const r of rows) {
      const steam_id = r.ID || r.id || r.Id || r.SteamID || null;
      const name = r.JUGADOR || r.Jugador || r.player || r.player_name || r.name || null;
      const dotabuff = r.Dotabuff || r.dotabuff || r.DOTABUFF || null;
      if (!steam_id) continue;
      const p = playerModel.insertOrIgnorePlayer(String(steam_id), name, dotabuff);
      processed.push(p);
    }
    res.json({ count: processed.length, processed });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error procesando Excel' });
  }
};

const listPlayers = (req, res) => {
  const players = playerModel.getAllPlayers();
  res.json({ count: players.length, players });
};

module.exports = { addPlayer, importExcel, listPlayers };
