const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth'); // Middleware de autenticación
const {
    crearCotizacion,
    convertirAVenta,
    listarCotizaciones,
    obtenerCotizacion,
    obtenerCotizacionesFiltradas,
    actualizarCotizacion,
    eliminarCotizacion
} = require('../controllers/cotizacionesController');

router.get('/', authMiddleware, listarCotizaciones);
router.get('/:id', authMiddleware, obtenerCotizacion);
router.get('/filtradas', authMiddleware, obtenerCotizacionesFiltradas);
router.post('/', authMiddleware, crearCotizacion);
router.patch('/:id', authMiddleware, actualizarCotizacion);
router.patch('/convertir-a-venta/:id', authMiddleware, convertirAVenta);
router.delete('/:id', authMiddleware, eliminarCotizacion);

module.exports = router;