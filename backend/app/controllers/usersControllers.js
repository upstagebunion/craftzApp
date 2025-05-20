const Usuario = require('../models/usuariosModel');

exports.obtenerPerfil = async (req, res) => {
    try {
        const usuario = await Usuario.findById(req.userId).select('-password');
        
        if (!usuario) {
            return res.status(404).json({ message: 'Usuario no encontrado.' });
        }

        res.status(200).json(usuario);
    } catch (error) {
        console.error("Error al obtener perfil:", error);
        res.status(500).json({ message: 'Error al obtener perfil de usuario.' });
    }
};

exports.actualizarUsuario = async (req, res) => {
    try {
        const { nombre, password, fbtoken } = req.body;
        const updates = {};
        
        if (nombre) updates.nombre = nombre;
        if (password) {
            // Hashear la nueva contraseña
            const salt = await bcrypt.genSalt(10);
            updates.password = await bcrypt.hash(password, salt);
        }
        if (fbtoken) updates.fbtoken = fbtoken;

        const usuarioActualizado = await Usuario.findByIdAndUpdate(
            req.userId,
            updates,
            { new: true, runValidators: true }
        ).select('-password');

        res.status(200).json(usuarioActualizado);
    } catch (error) {
        console.error("Error al actualizar usuario:", error);
        res.status(500).json({ message: 'Error al actualizar usuario.' });
    }
};

// Solo para administradores
exports.actualizarRolUsuario = async (req, res) => {
    try {
        const { id } = req.params;
        const { rol } = req.body;

        if (!Object.values(Usuario.ROLES).includes(rol)) {
            return res.status(400).json({ message: 'Rol no válido.' });
        }

        const usuario = await Usuario.findByIdAndUpdate(
            id,
            { rol },
            { new: true }
        ).select('-password');

        if (!usuario) {
            return res.status(404).json({ message: 'Usuario no encontrado.' });
        }

        res.status(200).json(usuario);
    } catch (error) {
        console.error("Error al actualizar rol:", error);
        res.status(500).json({ message: 'Error al actualizar rol de usuario.' });
    }
};

// Solo para administradores
exports.listarUsuarios = async (req, res) => {
    try {
        const usuarios = await Usuario.find().select('-password');
        res.status(200).json(usuarios);
    } catch (error) {
        console.error("Error al listar usuarios:", error);
        res.status(500).json({ message: 'Error al listar usuarios.' });
    }
};