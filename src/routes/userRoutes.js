const { Router } = require('express');
const controller = require('../controllers/userController');
const auth = require('../middleware/auth');

const router = Router();

// Rotas públicas: cadastro e login
router.post('/token', controller.token);
router.post('/', controller.create);
router.get('/:id', controller.getById);

// Rotas protegidas por JWT
router.put('/:id', auth, controller.update);
router.delete('/:id', auth, controller.remove);

module.exports = router;
