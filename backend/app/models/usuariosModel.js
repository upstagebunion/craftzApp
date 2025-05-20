const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

// Definir los roles permitidos usando un enum
const ROLES = {
  VENDEDOR: 'vendedor',
  GERENTE: 'gerente',
  ADMIN: 'admin'
};

const usuarioSchema = new mongoose.Schema({
    nombre: {
        type: String,
        required: [true, 'El nombre es obligatorio'],
        trim: true,
        maxlength: [50, 'El nombre no puede exceder los 50 caracteres'],
        match: [/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/, 'El nombre solo puede contener letras']
    },
    correo: {
        type: String,
        unique: true,
        required: [true, 'El correo es obligatorio'],
        trim: true,
        lowercase: true,
    },
    password: {
        type: String,
        required: true
    },
    fbtoken: {
        type: String,
        required: false
    },
    rol: {
        type: String,
        enum: {
        values: Object.values(ROLES),
        message: '{VALUE} no es un rol válido'
        },
        default: ROLES.VENDEDOR,
        required: true
    },
    ultimoAcceso: {
        type: Date,
        default: Date.now
    }
});

// Antes de guardar, hashear la contraseña.
usuarioSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
  
    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// Método para verificar contraseñas.
usuarioSchema.methods.compararPassword = async function (password) {
    return await bcrypt.compare(password, this.password);
};

usuarioSchema.methods.tieneRol = function(...roles) {
  return roles.includes(this.rol);
};

usuarioSchema.statics.ROLES = ROLES;
module.exports = mongoose.model('Usuario', usuarioSchema);
