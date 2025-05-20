const mongoose = require("mongoose");

const ClienteSchema = new mongoose.Schema({
    nombre: { type: String, required: true, trim: true },
    apellido_paterno: { type: String, required: false, trim: true },
    apellido_materno: { type: String, required: false, trim: true },
    alias: { type: String, required: false },
    compras: { type: Number, default: 0 }, // Contador de compras realizadas
    correo: { type: String, unique: true, sparse: true }, // Opcional pero único si existe
    telefono: { type: String, required: false },
    fecha_registro: { type: Date, default: Date.now },
    ultima_compra: { type: Date },
    historial_compras: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Venta', index: true}]
  });

module.exports = mongoose.model("Cliente", ClienteSchema);