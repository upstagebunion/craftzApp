const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth'); // Middleware de autenticación
const {
    crearCliente
} = require('../controllers/clientesController');

router.post('/', authMiddleware, crearCliente);

module.exports = router;