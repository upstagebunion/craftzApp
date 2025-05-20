const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const roleMiddleware = require('../middleware/roleMiddleware');
const userController = require('../controllers/usersControllers');
const Usuario = require('../models/usuariosModel');

// Rutas protegidas que requieren autenticación
router.use(authMiddleware);

// Obtener perfil del usuario actual
router.get('/me', userController.obtenerPerfil);

// Actualizar usuario actual
router.put('/me', userController.actualizarUsuario);

// Rutas solo para administradores
router.use(roleMiddleware.verificarRol(Usuario.ROLES.ADMIN));

// Listar todos los usuarios (solo admin)
router.get('/', userController.listarUsuarios);

// Actualizar rol de usuario (solo admin)
router.put('/:id/rol', userController.actualizarRolUsuario);

module.exports = router;