const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth'); // Middleware de autenticación
const {
    obtenerClientes,
    obtenerCliente,
    crearCliente,
    eliminarCliente,
    actualizarCliente,
} = require('../controllers/clientesController');

router.get('/', authMiddleware, obtenerClientes);
router.get('/:id', authMiddleware, obtenerCliente);
router.post('/', authMiddleware, crearCliente);
router.delete('/:id', authMiddleware, eliminarCliente);
router.put('/:id', authMiddleware, actualizarCliente);

module.exports = router;