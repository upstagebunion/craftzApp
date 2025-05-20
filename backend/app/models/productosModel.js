const mongoose = require('mongoose');

const tallaSchema = new mongoose.Schema({
    talla: { type: String, required: false, trim: true }, // Ej: "CH", "M", "G"
    stock: { type: Number, required: true, min: 0 },
    costo: { type: Number, required: true, min: 0 }
  });
  
  const colorSchema = new mongoose.Schema({
    color: { type: String, required: true, trim: true }, // Ej: "Negro", "Blanco"
    tallas: [tallaSchema], // Opcional, solo para ropa
    stock: { type: Number, required: false }, // Stock total para este color si no hay tallas
    costo: { type: Number, required: false } // Precio por color si no hay tallas
  });
  
  const varianteSchema = new mongoose.Schema({
    tipo: { type: String, required: false, trim: true }, // Ej: "Blanca", "Mágica", solo para accesorios
    colores: [colorSchema], // Variantes agrupadas por color
  });
  
  const productoSchema = new mongoose.Schema({
    nombre: { type: String, required: true, trim: true }, // Ej: "Playera personalizada", "Taza mágica"
    descripcion: { type: String, required: true }, // Descripción del producto
    categoria: { type: mongoose.Schema.Types.ObjectId, ref: 'Categoria', required: true, index: true }, // Ej: "Ropa", "Artículos"
    subcategoria: { type: mongoose.Schema.Types.ObjectId, ref: 'Subcategoria', required: true, index: true }, // Ej: "Playeras", "Tazas"
    calidad: { type: String, required: false, trim: true },
    corte: { type: String, required: false, trim: true },
    variantes: [varianteSchema], // Variantes flexibles
    imagenes: [{ type: String, required: false}], // URLs de imágenes
    activo: { type: Boolean, default: true },
    fechaCreacion: { type: Date, default: Date.now }
  });

module.exports = mongoose.model('Producto', productoSchema);
