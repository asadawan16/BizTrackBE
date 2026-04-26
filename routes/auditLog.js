const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/auditController');

router.get('/recent', ctrl.getRecent);
router.get('/', ctrl.getAll);

module.exports = router;
