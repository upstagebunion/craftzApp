const mongoose = require("mongoose");

const ExtraSchema = new mongoose.Schema({
    nombre: { type: String, required: true },
    unidad: { type: String, enum: ['pieza', 'cm_cuadrado'], required: true },
    monto: { type: Number, required: true } // Costo fijo o por cm²
  });

module.exports = mongoose.model("Extra", ExtraSchema);