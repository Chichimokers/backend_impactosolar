const XLSX = require('xlsx');

const parseExcelBuffer = (buffer) => {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const json = XLSX.utils.sheet_to_json(sheet, { defval: null });
  // Normalize keys to try to find ID, JUGADOR, Dotabuff
  return json.map(row => {
    const normalized = {};
    for (const k of Object.keys(row)) {
      const key = k.toString().trim();
      normalized[key] = row[k];
    }
    return normalized;
  });
};

module.exports = { parseExcelBuffer };
