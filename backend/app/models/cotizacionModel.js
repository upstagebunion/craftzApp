const mongoose = require("mongoose");

const CotizacionSchema = new mongoose.Schema({
  cliente: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Cliente',
    required: true,
    index: true
  },
  subTotal: { type: Number, required: true },
  total: { type: Number, required: true },
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
      nombre: { type: String, required: true, trim: true},
      descripcion: { type: String, required: true }
    },
    
    // Variante, color, talla (estructura unificada)
    variante: {
      id: { type: mongoose.Schema.Types.ObjectId, required: false },
      tipo: { type: String, trim: true },
      // Para elementos temporales:
      nombreCompleto: { type: String } // Ej: "Playera blanca manga larga"
    },
    calidad: {
      id: { type: mongoose.Schema.Types.ObjectId, required: false },
      // Para elementos temporales:
      calidad: { type: String, trim: true } // Ej: "Premium/estandar"
    },
    color: {
      id: { type: mongoose.Schema.Types.ObjectId, required: false },
      nombre: { type: String, trim: true },
      codigoHex: { type:String, trim: true }
    },
    talla: {
      id: { type: mongoose.Schema.Types.ObjectId, required: false },
      nombre: { type: String, trim: true },
      codigo: { type: String, trim:true }
    },
    
    // Extras (unificados para registrados y temporales)
    extras: [{
      esTemporal: { type: Boolean, default: false },
      // Referencia solo si no es temporal
      extraRef: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Extra',
        required: function() { return !this.esTemporal; },
        index: true
      },
      // Datos completos del extra (siempre presentes)
      nombre: { type: String, required: true, trim: true },
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
        nombre: { type: String, trim: true}, // Guardamos el nombre por si el parámetro se elimina
        valor: { type: Number } // Guardamos el valor histórico
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
  descuentoGlobal: {
    razon: String,
    tipo: { type: String, enum: ['cantidad', 'porcentaje'] },
    valor: Number
  },
  ventaEnLinea: { type: Boolean, default: false },
  fechaCreacion: { type: Date, default: Date.now },
  expira: { type: Date, default: () => Date.now() + 15*24*60*60*1000 }, // 15 días
  vendedor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Usuario',
    required: true
  },
  activa: {type: Boolean, default: true}
});

module.exports = mongoose.model("Cotizacion", CotizacionSchema);