const mongoose = require("mongoose");

const CotizacionSchema = new mongoose.Schema({
  cliente: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Cliente',
    required: true
  },
  subTotal: { type: Number, required: true },
  total: { type: Number, required: true },
  productos: [{
    // Referencia al producto (para operaciones futuras)
    productoRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Producto',
      required: true
    },
    // Datos completos de lo cotizado (inmutable)
    producto: {
      nombre: { type: String, required: true },
      descripcion: { type: String, required: true }
    },
    variante: {
      id: { type: mongoose.Schema.Types.ObjectId },
      tipo: { type: String, required: true }
    },
    color: {
      id: { type: mongoose.Schema.Types.ObjectId },
      nombre: { type: String, required: true }
    },
    talla: {
      id: { type: mongoose.Schema.Types.ObjectId },
      nombre: { type: String }
    },
    extras: [{
      id: { type: mongoose.Schema.Types.ObjectId },
      nombre: { type: String, required: true },
      unidad: { type: String, required: true},
      monto: { type: Number, required: true }
    }],
    cantidad: { type: Number, required: true, default: 1, min: 1 },
    descuento: {
      razon: String,
      tipo: { type: String, enum: ['cantidad', 'porcentaje'] },
      valor: Number
    },
    precio: { type: Number, required: true },
    precioFinal: { type: Number, required: true },
    _id: false
  }],
  descuentoGlobal: {
    razon: String,
    tipo: { type: String, enum: ['cantidad', 'porcentaje'] },
    valor: Number
  },
  ventaEnLinea: { type: Boolean, default: false },
  fechaCreacion: { type: Date, default: Date.now },
  expira: { type: Date, default: () => Date.now() + 15*24*60*60*1000 }, // 15 días
  convertidaAVenta: { 
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Venta',
    default: null
  }
});

module.exports = mongoose.model("Cotizacion", CotizacionSchema);