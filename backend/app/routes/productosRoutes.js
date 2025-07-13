const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth'); // Middleware de autenticación
const {
    listarProductos,
    crearProducto,
    actualizarProductos,
    eliminarProducto,
    agregarVariantes,
    agregarVariante,
    agregarCalidad,
    agregarColor,
    agregarTalla,
    eliminarVariante,
    eliminarCalidad,
    eliminarColor,
    eliminarTalla
} = require('../controllers/productosController'); // Importamos los controladores

// Rutas protegidas
router.get('/', authMiddleware, listarProductos);
router.post('/', authMiddleware, crearProducto);
router.patch('/actualizar', authMiddleware, actualizarProductos);
//router.post('/:id/variantes', authMiddleware, agregarVariantes);
router.post('/:id/variante', authMiddleware, agregarVariante);
router.post('/:id/:variante/calidad', authMiddleware, agregarCalidad);
router.post('/:id/:variante/:calidad/color', authMiddleware, agregarColor);
router.post('/:id/:variante/:calidad/:color/talla', authMiddleware, agregarTalla);
router.delete('/:id', authMiddleware, eliminarProducto);
router.delete('/:id/:variante', authMiddleware, eliminarVariante);
router.delete('/:id/:variante/:calidad', authMiddleware, eliminarCalidad);
router.delete('/:id/:variante/:calidad/:color', authMiddleware, eliminarColor);
router.delete('/:id/:variante/:calidad/:color/:talla', authMiddleware, eliminarTalla);

module.exports = router;
