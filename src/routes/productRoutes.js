const { Router } = require('express');
const controller = require('../controllers/productController');
const auth = require('../middleware/auth');

const router = Router();

// "/search" precisa vir antes de "/:id"
router.get('/search', controller.search);
router.get('/:id', controller.getById);

router.post('/', auth, controller.create);
router.put('/:id', auth, controller.update);
router.delete('/:id', auth, controller.remove);

module.exports = router;
