const Usuario = require('../models/usuariosModel');

exports.verificarRol = (...rolesPermitidos) => {
    return async (req, res, next) => {
        try {
            // Obtener usuario desde la base de datos para asegurar que tenemos la información más reciente
            const usuario = await Usuario.findById(req.userId);
            
            if (!usuario) {
                return res.status(404).json({ message: 'Usuario no encontrado.' });
            }

            // Verificar si el usuario tiene uno de los roles permitidos
            if (!rolesPermitidos.includes(usuario.rol)) {
                return res.status(403).json({ 
                    message: `Acceso denegado. Se requieren los roles: ${rolesPermitidos.join(', ')}` 
                });
            }

            // Adjuntar información del usuario a la solicitud
            req.usuario = usuario;
            next();
        } catch (error) {
            console.error("Error al verificar roles:", error);
            res.status(500).json({ message: 'Error al verificar permisos.' });
        }
    };
};