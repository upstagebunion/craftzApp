const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth'); // Middleware de autenticación
const {
    obtenerProductoPorSlug,
    listarProductosOnline,
    crearProductoOnline,
    actualizarProductoOnline,
    eliminarProductoOnline
} = require('../controllers/productosOnlineController'); // Importamos los controladores

// Rutas protegidas
router.get('/', authMiddleware, listarProductosOnline);
router.get('/:slug', authMiddleware, obtenerProductoPorSlug);
router.post('/', authMiddleware, crearProductoOnline);
router.patch('/actualizar/:id', authMiddleware, actualizarProductoOnline);
router.delete('/:id', authMiddleware, eliminarProductoOnline);

module.exports = router;
