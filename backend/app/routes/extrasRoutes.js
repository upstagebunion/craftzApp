const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth'); // Middleware de autenticación
const {
    getExtras,
    crearExtra,
    eliminarExtra
} = require('../controllers/extrasController');

router.get('/', authMiddleware, getExtras);
router.post('/', authMiddleware, crearExtra);
router.delete('/:id', authMiddleware, eliminarExtra);

module.exports = router;