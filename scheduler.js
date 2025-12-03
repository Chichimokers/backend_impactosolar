const cron = require('node-cron');
const playerService = require('./services/playerService');

// Run every 8 hours to respect OpenDota free tier limits (3000 calls/day)
cron.schedule('0 */8 * * *', async () => {
  console.log('Scheduler: actualizando players desde OpenDota...');
  try {
    const res = await playerService.updateAllPlayersFromOpenDota();
    console.log('Scheduler: actualización finalizada. Players actualizados:', res.length);
  } catch (e) {
    console.error('Scheduler error:', e);
  }
});

module.exports = {};
