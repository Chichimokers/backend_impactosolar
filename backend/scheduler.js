const cron = require('node-cron');
const playerService = require('./services/playerService');

// Run at minute 0 every hour
cron.schedule('0 * * * *', async () => {
  console.log('Scheduler: actualizando players desde OpenDota...');
  try {
    const res = await playerService.updateAllPlayersFromOpenDota();
    console.log('Scheduler: actualización finalizada. Players actualizados:', res.length);
  } catch (e) {
    console.error('Scheduler error:', e);
  }
});

module.exports = {};
