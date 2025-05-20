const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth'); // Middleware de autenticación
const {
    agregarCategoria,
    crearSubcategoria,
    obtenerCategorias,
    eliminarCategoria,
    eliminarSubcategoria
} = require('../controllers/categoriasController');

router.get('/', authMiddleware, obtenerCategorias);
router.post('/', authMiddleware, agregarCategoria);
router.post('/:id/subcategorias', authMiddleware, crearSubcategoria);
router.delete('/:id', authMiddleware, eliminarCategoria);
router.delete('/subcategorias/:idSubcategoria', authMiddleware, eliminarSubcategoria);

module.exports = router;
