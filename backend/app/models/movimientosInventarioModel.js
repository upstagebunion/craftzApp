// models/MovimientoInventario.js
const mongoose = require("mongoose");

const MovimientoInventarioSchema = new mongoose.Schema({
  producto: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Producto',
    required: true,
    index: true
  },
  variante: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true
  },
  calidad: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true
  },
  color: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true
  },
  talla: {
    type: mongoose.Schema.Types.ObjectId,
    required: false,
    index: true
  },
  productoInfo: {
    type: String,
    required: true,
  },
  tipo: {
    type: String,
    enum: ['entrada', 'salida'],
    required: true
  },
  cantidad: {
    type: Number,
    required: true,
    min: 1
  },
  motivo: {
    type: String,
    enum: ['compra', 'venta', 'ajuste', 'devolucion', 'perdida'],
    required: true
  },
  referencia: {
    // Puede referenciar una venta, compra, etc.
    tipo: String,
    id: mongoose.Schema.Types.ObjectId
  },
  usuario: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Usuario',
    required: true
  },
  fecha: {
    type: Date,
    default: Date.now
  },
  comentarios: String
});

module.exports = mongoose.model("MovimientoInventario", MovimientoInventarioSchema);