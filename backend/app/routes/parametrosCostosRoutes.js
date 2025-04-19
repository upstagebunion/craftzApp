const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth'); // Middleware de autenticación
const {
    crearCostoElaboracion,
    obtenerCostosElaboracion,
    obtenerCostoElaboracion,
    actualizarCostoElaboracion,
    eliminarCostoElaboracion,
    obtenerCostosPorSubcategoria,
} = require('../controllers/parametrosCostosController');

router.post('/', authMiddleware, crearCostoElaboracion);
router.get('/', authMiddleware, obtenerCostosElaboracion);
router.get('/:id', authMiddleware, obtenerCostoElaboracion);
router.patch('/:id', authMiddleware, actualizarCostoElaboracion);
router.delete('/:id', authMiddleware, eliminarCostoElaboracion);
router.get('por-subcategoria/:subcategoriaId', authMiddleware, obtenerCostosPorSubcategoria)

module.exports = router;