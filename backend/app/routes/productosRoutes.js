const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth'); // Middleware de autenticación
const {
    listarProductos,
    crearProducto,
    editarProducto,
    eliminarProducto,
    agregarVariantes,
    editarColor,
    editarTalla,
    editarVariante
} = require('../controllers/productosController'); // Importamos los controladores

// Rutas protegidas
router.get('/', authMiddleware, listarProductos);
router.post('/', authMiddleware, crearProducto);
router.patch('/:id', authMiddleware, editarProducto);
router.post('/:id/variantes', authMiddleware, agregarVariantes);
router.patch('/:id/variantes/:variante', authMiddleware, editarVariante);
router.patch('/:id/variantes/:variante/:color', authMiddleware, editarColor);
router.patch('/:id/variantes/:variante/:color/:talla', authMiddleware, editarTalla);
router.delete('/:id', authMiddleware, eliminarProducto);

module.exports = router;
