const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth'); // Middleware de autenticación
const {
    crearExtra
} = require('../controllers/extrasController');

router.post('/', authMiddleware, crearExtra);

module.exports = router;