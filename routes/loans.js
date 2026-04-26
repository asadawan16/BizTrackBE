const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/loansController');
const auditMiddleware = require('../middleware/auditMiddleware');

router.use(auditMiddleware(ctrl.fetchById));

router.get('/summary', ctrl.getSummary);
router.get('/', ctrl.getAll);
router.get('/:id', ctrl.getOne);
router.post('/', ctrl.create);
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);

module.exports = router;
