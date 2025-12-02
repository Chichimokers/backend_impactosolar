const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });
const playerController = require('../controllers/playerController');
const { requireAuth } = require('../middlewares/auth');

// Public: list players (no auto-update here)
router.get('/', playerController.listPlayers);

// Protected: add single player
router.post('/', requireAuth, playerController.addPlayer);

// Protected: import via Excel
router.post('/import', requireAuth, upload.single('file'), playerController.importExcel);

// Protected: trigger OpenDota sync manually
router.post('/sync', requireAuth, playerController.syncOpenDota);

// Public/Protected: check sync status
router.get('/sync/status', requireAuth, playerController.getSyncStatus);

module.exports = router;
