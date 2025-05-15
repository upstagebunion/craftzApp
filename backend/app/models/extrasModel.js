const mongoose = require('mongoose');

const ExtraSchema = new mongoose.Schema({
  nombre: { type: String, required: true },
  unidad: { 
    type: String, 
    enum: ['pieza', 'cm_cuadrado'], 
    required: true 
  },
  monto: { type: Number, required: false }, // Ahora es opcional para cm_cuadrado
  anchoCm: { type: Number, required: false },
  largoCm: { type: Number, required: false },
  parametroCalculoId: { 
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CostoElaboracion',
    required: false
  }
}, { timestamps: true });

// Validación condicional
ExtraSchema.pre('validate', function(next) {
  if (this.unidad === 'cm_cuadrado') {
    if (!this.anchoCm || !this.largoCm || !this.parametroCalculoId) {
      this.invalidate('unidad', 'Para unidad cm_cuadrado se requieren anchoCm, largoCm y parametroCalculoId');
    }
  } else {
    if (!this.monto) {
      this.invalidate('monto', 'Para unidad pieza se requiere monto');
    }
  }
  next();
});

module.exports = mongoose.model("Extra", ExtraSchema);