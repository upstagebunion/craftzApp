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
    // Campo para identificar si es temporal (no referenciado en BD)
    esTemporal: { type: Boolean, default: false },
    
    // Referencia al producto (solo si no es temporal)
    productoRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Producto',
      required: function() { return !this.esTemporal; }
    },
    
    // Datos completos del producto (siempre presentes)
    producto: {
      nombre: { type: String, required: true },
      descripcion: { type: String, required: true }
    },
    
    // Variante, color, talla (estructura unificada)
    variante: {
      id: { type: mongoose.Schema.Types.ObjectId, required: false },
      tipo: { type: String },
      nombreCompleto: { type: String }
    },
    color: {
      id: { type: mongoose.Schema.Types.ObjectId, required: false },
      nombre: { type: String }
    },
    talla: {
      id: { type: mongoose.Schema.Types.ObjectId, required: false },
      nombre: { type: String }
    },
    
    // Extras (unificados para registrados y temporales)
    extras: [{
      esTemporal: { type: Boolean, default: false },
      // Referencia solo si no es temporal
      extraRef: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Extra',
        required: function() { return !this.esTemporal; }
      },
      // Datos completos del extra (siempre presentes)
      nombre: { type: String, required: true },
      unidad: { 
        type: String, 
        required: true,
        enum: ['pieza', 'cm_cuadrado'] 
      },
      monto: { type: Number, required: true },
      // Para extras por área
      anchoCm: { type: Number },
      largoCm: { type: Number },
      // Metadata para cálculo
      parametroCalculo: {
        nombre: { type: String },
        valor: { type: Number }
      },
    }],
    cantidad: { type: Number, required: true, default: 1, min: 1 },
    descuento: {
      razon: String,
      tipo: { type: String, enum: ['cantidad', 'porcentaje'] },
      valor: Number
    },
    precioBase: { type: Number, required: true }, // Precio unitario sin extras
    precio: { type: Number, required: true }, // Precio unitario con extras
    precioFinal: { type: Number, required: true }, // Precio total (precio * cantidad)
  }],
  estado: {
    type: String,
    enum: ['pendiente', 'confirmado', 'preparado', 'liquidado', 'entregado', 'devuelto'],
    default: 'pendiente'
  },
  pagos: [{
    razon: String,
    monto: { type: Number, required: true, min: 0 },
    metodo: { type: String, enum: ['efectivo', 'tarjeta', 'transferencia'], required: true },
    fecha: { type: Date, default: Date.now },
    _id: false
  }],
  ventaEnLinea: { type: Boolean, default: false },
  descuentoGlobal: {
    type: {
      razon: String,
      tipo: { type: String, enum: ['cantidad', 'porcentaje'] },
      valor: Number
    },
    required: false,
    default: null
  },
  vendedor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Usuario',
    required: true
  },
  restante: { type: Number, default: 0, min: 0 },
  fechaCreacion: { type: Date, default: Date.now },
  fechaLiquidacion: Date
});

module.exports = mongoose.model("Venta", VentaSchema);
