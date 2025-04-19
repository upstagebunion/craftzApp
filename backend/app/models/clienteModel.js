const mongoose = require("mongoose");

const ClienteSchema = new mongoose.Schema({
    nombre: { type: String, required: true },
    compras: { type: Number, default: 0 }, // Contador de compras realizadas
    correo: { type: String, unique: true, sparse: true }, // Opcional pero único si existe
    telefono: { type: String, required: true }
  });

module.exports = mongoose.model("Cliente", ClienteSchema);