const mongoose = require('mongoose');

const CostoElaboracionSchema = new mongoose.Schema({
  nombre: { type: String, required: true, trim: true },
  descripcion: String,
  unidad: { 
    type: String, 
    enum: ['pieza', 'cm_cuadrado', 'porcentaje'], 
    required: true 
  },
  monto: { type: Number, required: true },
  anchoPlancha: { type: Number, required: false },
  largoPlancha: { type: Number, required: false },
  tipoAplicacion: {
    type: String,
    enum: ['fijo', 'variable'],
    required: true,
    default: 'fijo'
  },
  prioridad: {
    type: Number,
    required: false,
    default: 0
  },
  subcategoriasAplica: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subcategoria',
    index: true
  }]
}, { timestamps: true });

// Validación condicional
CostoElaboracionSchema.pre('validate', function(next) {
  if (this.unidad === 'cm_cuadrado') {
    if (!this.anchoPlancha || !this.largoPlancha) {
      this.invalidate('unidad', 'Para unidad cm_cuadrado se requieren anchoPlancha y largoPlancha');
    }
  }
  
  if (this.tipoAplicacion === 'fijo' && (this.prioridad === undefined || this.prioridad < 0)) {
    this.invalidate('prioridad', 'Los costos fijos deben tener una prioridad válida');
  }
  next();
});

module.exports = mongoose.model("CostoElaboracion", CostoElaboracionSchema);