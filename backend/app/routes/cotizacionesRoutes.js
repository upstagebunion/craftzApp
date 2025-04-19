const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth'); // Middleware de autenticación
const {
    crearCotizacion,
    convertirCotizacionAVenta,
    obtenerCotizacionesActivas,
    obtenerCotizacionPorId,
    obtenerCotizacionesFiltradas
} = require('../controllers/cotizacionesController');

router.get('/', authMiddleware, obtenerCotizacionesActivas);
router.get('/:id', authMiddleware, obtenerCotizacionPorId);
router.get('/filtradas', authMiddleware, obtenerCotizacionesFiltradas);
router.post('/', authMiddleware, crearCotizacion);
router.patch('/convertir-a-venta/:cotizacionId', authMiddleware, convertirCotizacionAVenta);

module.exports = router;