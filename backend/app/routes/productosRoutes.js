const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth'); // Middleware de autenticación
const {
    listarProductos,
    crearProducto,
    actualizarProductos,
    eliminarProducto,
    agregarVariantes,
    agregarColor,
    agregarTalla,
    agregarVariante,
    eliminarVariante,
    eliminarColor,
    eliminarTalla
} = require('../controllers/productosController'); // Importamos los controladores

// Rutas protegidas
router.get('/', authMiddleware, listarProductos);
router.post('/', authMiddleware, crearProducto);
router.patch('/actualizar', authMiddleware, actualizarProductos);
router.post('/:id/variantes', authMiddleware, agregarVariantes);
router.post('/:id/variante', authMiddleware, agregarVariante);
router.post('/:id/:variante/color', authMiddleware, agregarColor);
router.post('/:id/:variante/:color/talla', authMiddleware, agregarTalla);
router.delete('/:id', authMiddleware, eliminarProducto);
router.delete('/:id/:variante', authMiddleware, eliminarVariante);
router.delete('/:id/:variante/:color', authMiddleware, eliminarColor);
router.delete('/:id/:variante/:color/:talla', authMiddleware, eliminarTalla);

module.exports = router;
