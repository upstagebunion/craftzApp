const Usuario = require('../models/usuariosModel');
const jwt = require('jsonwebtoken');
const config = require('../../config');

const generarToken = (usuario) => {
    return jwt.sign(
        { 
            id: usuario._id,
            rol: usuario.rol 
        }, 
        config.jwtSecret, 
        { expiresIn: '1d' }
    );
};

exports.registrar = async (req, res) => {
    const { nombre, correo, password, rol } = req.body;
    
    try {
        // Validar rol si se proporciona
        if (rol && !Object.values(Usuario.ROLES).includes(rol)) {
            return res.status(400).json({ message: 'Rol no válido.' });
        }

        const usuarioExistente = await Usuario.findOne({ correo });
        if (usuarioExistente) {
            return res.status(400).json({ message: 'El correo ya está registrado.' });
        }

        const nuevoUsuario = new Usuario({ 
            nombre, 
            correo, 
            password,
            rol: rol || Usuario.ROLES.VENDEDOR // Rol por defecto
        });

        await nuevoUsuario.save();
        const token = generarToken(nuevoUsuario);
        
        res.status(201).json({ 
            token,
            usuario: {
                id: nuevoUsuario._id,
                nombre: nuevoUsuario.nombre,
                correo: nuevoUsuario.correo,
                rol: nuevoUsuario.rol
            }
        });
    } catch (error) {
        console.error("Error al registrar el usuario:", error);
        res.status(500).json({ message: 'Error al registrar el usuario.' });
    }
};

exports.login = async (req, res) => {
    const { correo, password } = req.body;
    
    try {
        const usuario = await Usuario.findOne({ correo });
        if (!usuario) {
            return res.status(404).json({ message: 'Usuario no encontrado.' });
        }

        const esValido = await usuario.compararPassword(password);
        if (!esValido) {
            return res.status(400).json({ message: 'Credenciales incorrectas.' });
        }

        // Actualizar último acceso
        usuario.ultimoAcceso = new Date();
        await usuario.save();

        const token = generarToken(usuario);
        
        res.status(200).json({ 
            token,
            usuario: {
                id: usuario._id,
                nombre: usuario.nombre,
                correo: usuario.correo,
                rol: usuario.rol,
                ultimoAcceso: usuario.ultimoAcceso
            }
        });
    } catch (error) {
        console.error("Error al iniciar sesión:", error);
        res.status(500).json({ message: 'Error al iniciar sesión.' });
    }
};

exports.verificarToken = async (req, res) => {
    const token = req.headers['authorization'];

    if (!token) {
        return res.status(401).json({ message: 'Acceso denegado. No se proporcionó un token.' });
    }

    try {
        const decoded = jwt.verify(token, config.jwtSecret);
        
        // Obtener información actualizada del usuario
        const usuario = await Usuario.findById(decoded.id).select('-password');
        
        if (!usuario) {
            return res.status(404).json({ message: 'Usuario no encontrado.' });
        }

        return res.status(200).json({ 
            message: 'Token válido',
            usuario: {
                id: usuario._id,
                nombre: usuario.nombre,
                correo: usuario.correo,
                rol: usuario.rol,
                ultimoAcceso: usuario.ultimoAcceso
            }
        });
    } catch (error) {
        return res.status(401).json({ message: 'Token inválido o expirado.' });
    }
};


