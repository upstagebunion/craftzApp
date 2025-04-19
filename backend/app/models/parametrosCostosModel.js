const mongoose = require("mongoose");

const CostoElaboracionSchema = new mongoose.Schema({
    nombre: { type: String, required: true },
    descripcion: String,
    unidad: { type: String, enum: ['pieza', 'cm_cuadrado'], required: true },
    costo: { type: Number, required: true }, // Ej: $250 por metro de DTF
    anchoPlancha: { type: Number, required: false }, // 58 cm (ancho fijo)
    largoPlancha: { type: Number, required: false }, // 100 cm (largo fijo)
    subcategoriasAplica: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subcategoria'
    }]
  });

module.exports = mongoose.model("CostoElaboracion", CostoElaboracionSchema);