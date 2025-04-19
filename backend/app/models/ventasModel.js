const mongoose = require("mongoose");

const VentaSchema = new mongoose.Schema({
  cliente: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Cliente',
    required: true
  },
  subTotal: { type: Number, required: true, min: 0 },
  total: { type: Number, required: true, min: 0 },
  productos: [{
    // Referencia al producto (para operaciones futuras)
    productoRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Producto',
      required: true
    },
    // Datos completos de lo vendido (inmutable)
    producto: {
      nombre: { type: String, required: true },
      descripcion: { type: String, required: true },
      // ... otros campos básicos que necesites
    },
    variante: {
      id: { type: mongoose.Schema.Types.ObjectId }, // Referencia
      tipo: { type: String, required: true },
    },
    color: {
      id: { type: mongoose.Schema.Types.ObjectId }, // Referencia
      nombre: { type: String, required: true }
    },
    talla: {
      id: { type: mongoose.Schema.Types.ObjectId }, // Referencia (opcional)
      nombre: { type: String }
    },
    extras: [{
      id: { type: mongoose.Schema.Types.ObjectId }, // Referencia
      nombre: { type: String, required: true },
      unidad: { type: String, required: true},
      monto: { type: Number, required: true }
    }],
    descuento: {
      type: {
        razon: String,
        tipo: { type: String, enum: ['cantidad', 'porcentaje'], required: true },
        valor: { type: Number, required: true }
      },
      required: false
    },
    cantidad: { type: Number, required: true, default: 1, min: 1 },
    precio: { type: Number, required: true, min: 0 },
    precioFinal: { type: Number, required: true, min: 0 },
  }],
  estado: {
    type: String,
    enum: ['confirmado', 'preparado', 'liquidado', 'entregado'],
    default: 'confirmado'
  },
  pagos: [{
    razon: String,
    monto: { type: Number, required: true, min: 0 },
    metodo: { type: String, enum: ['efectivo', 'tarjeta', 'transferencia'], required: true },
    _id: false
  }],
  ventaEnLinea: { type: Boolean, default: false },
  descuentoGlobal: {
    type: {
      razon: String,
      tipo: { type: String, enum: ['cantidad', 'porcentaje'] },
      valor: Number
    },
    required: false
  },
  restante: { type: Number, default: 0, min: 0 },
  fechaCreacion: { type: Date, default: Date.now },
  fechaLiquidacion: Date
});

module.exports = mongoose.model("Venta", VentaSchema);
