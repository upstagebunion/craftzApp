const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth'); // Middleware de autenticación
const {
    agregarCategoria,
    crearSubcategoria,
    obtenerCategorias
} = require('../controllers/categoriasController');

router.get('/', authMiddleware, obtenerCategorias);
router.post('/', authMiddleware, agregarCategoria);
router.post('/:id/subcategorias', authMiddleware, crearSubcategoria);

module.exports = router;
