const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/eggsController');
const auditMiddleware = require('../middleware/auditMiddleware');

router.use(auditMiddleware(ctrl.fetchById));

router.get('/today', ctrl.getToday);
router.get('/profit-split', ctrl.getProfitSplit);
router.get('/previous-closing', ctrl.getPreviousClosing);
router.get('/', ctrl.getAll);
router.get('/:id', ctrl.getOne);
router.post('/', ctrl.create);
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);

module.exports = router;
