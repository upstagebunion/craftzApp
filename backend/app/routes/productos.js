const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth'); // Middleware de autenticación
const {
    listarProductos,
    crearProducto,
    editarProducto,
    eliminarProducto
} = require('../controllers/productosController'); // Importamos los controladores

// Rutas protegidas
router.get('/', authMiddleware, listarProductos);
router.post('/', authMiddleware, crearProducto);
router.put('/:id', authMiddleware, editarProducto);
router.delete('/:id', authMiddleware, eliminarProducto);

module.exports = router;
