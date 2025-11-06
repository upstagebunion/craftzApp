const express = require('express');
const router = express.Router();
const {
  obtenerProductosPublicos,
  obtenerProductoPublicoPorSlug,
  obtenerCategoriasPublicas,
  obtenerCategoriasDisenos,
  crearCategoriaDiseno,
  actualizarCategoriaDiseno,
  eliminarCategoriaDiseno,
  obtenerProductosDestacados,
  obtenerProductosBase,
  crearProductoOnline
} = require('../controllers/storeController');

// Rutas públicas para la tienda
router.get('/health', (req, res) => res.json({ status: 'Store API funcionando', timestamp: new Date() }));
router.get('/productos', obtenerProductosPublicos);
router.get('/productos/destacados', obtenerProductosDestacados);
router.get('/productos/:slug', obtenerProductoPublicoPorSlug);
router.get('/categorias', obtenerCategoriasPublicas);
router.get('/categorias-disenos', obtenerCategoriasDisenos);
router.post('/categorias-disenos', crearCategoriaDiseno);
router.put('/categorias-disenos/:id', actualizarCategoriaDiseno);
router.delete('/categorias-disenos/:id', eliminarCategoriaDiseno);

// Rutas para gestión de productos online
router.get('/productos-base', obtenerProductosBase);
router.post('/productos', crearProductoOnline);

module.exports = router;