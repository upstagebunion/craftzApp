const mongoose = require("mongoose");

const VentaSchema = new mongoose.Schema({
  usuario: { type: mongoose.Schema.Types.ObjectId, ref: "Usuario", required: true },
  productos: [
    {
      producto: { type: mongoose.Schema.Types.ObjectId, ref: "Producto", required: true },
      cantidad: { type: Number, required: true },
      subtotal: { type: Number, required: true },
    },
  ],
  total: { type: Number, required: true },
  fecha: { type: Date, default: Date.now },
  estado: { type: String, enum: ["pendiente", "completado", "cancelado"], default: "pendiente" },
});

module.exports = mongoose.model("Venta", VentaSchema);
