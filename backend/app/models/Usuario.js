const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const usuarioSchema = new mongoose.Schema({
    nombre: { type: String, required: true },
    correo: { type: String, unique: true, required: true },
    password: { type: String, required: true },
});

// Antes de guardar, hashear la contraseña.
usuarioSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

// Método para verificar contraseñas.
usuarioSchema.methods.compararPassword = async function (password) {
    return await bcrypt.compare(password, this.password);
};

module.exports = mongoose.model('Usuario', usuarioSchema);
