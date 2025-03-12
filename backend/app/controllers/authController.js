const Usuario = require('../models/usuariosModel');
const jwt = require('jsonwebtoken');
const config = require('../../config');

const generarToken = (usuario) => {
    return jwt.sign({ id: usuario._id }, config.jwtSecret, { expiresIn: '1d' });
};

exports.registrar = async (req, res) => {
    const { nombre, correo, password } = req.body;
    try {
        const usuarioExistente = await Usuario.findOne({ correo });
        if (usuarioExistente) {
            return res.status(400).json({ message: 'El correo ya está registrado.' });
        }
        const nuevoUsuario = new Usuario({ nombre, correo, password });
        await nuevoUsuario.save();
        const token = generarToken(nuevoUsuario);
        res.status(201).json({ token });
    } catch (error) {
        console.error("Error al registrar el usuario:", error); // Aquí se imprime el error en el servidor
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
        const token = generarToken(usuario);
        res.status(200).json({ token });
    } catch (error) {
        console.error("Error al Iniciar sesión:", error); // Aquí se imprime el error en el servidor
        res.status(500).json({ message: 'Error al iniciar sesión.' });
    }
};

exports.verificarToken = async (req, res) => {
    const token = req.headers['authorization'];

    if (!token) {
        return res.status(401).json({ message: 'Acceso denegado. No se proporcionó un token.' });
    }

    try {
        const decoded = jwt.verify(token, config.jwtSecret); // Verifica la validez del token
        req.usuarioId = decoded.id; // Guarda el ID del usuario decodificado en la solicitud
        return res.status(200).json({ message: 'token valido' });
    } catch (error) {
        return res.status(401).json({ message: 'Token inválido o expirado.', error });
    }
}


