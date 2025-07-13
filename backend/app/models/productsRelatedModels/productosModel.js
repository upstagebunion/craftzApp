const mongoose = require('mongoose');

const tallaSchema = new mongoose.Schema({
    SUK: { type:String, required: false, trim:true }, //Identificador unico de producto, opcional por si no tuviera
    codigo: { type:String, required: true, trim: true }, //Ej: "CH", "M", "G" 
    talla: { type: String, required: false, trim: true }, //Ej: "Chica", "Mediana", "Doble Extra Grande"
    stock: { type: Number, required: true, min: 0 },
    costo: { type: Number, required: true, min: 0 },
    orden: { type: Number, required: true, unique: true }, //Indice para organizar el orden de display
    disponibleOnline: { type:Boolean, required: true, default: false }
  });
  
  const colorSchema = new mongoose.Schema({
    color: { type: String, required: true, trim: true }, // Ej: "Negro", "Blanco"
    codigoHex: { type: String, required: true},
    disponibleOnline: { type:Boolean, required: true, default: false }, // control de disponibilidad en linea, si esta disponible se muestra como opcion de compra
    tallas: [tallaSchema], // Opcional, solo para ropa
    SUK: { type:String, required: false, trim:true }, //Identificador unico de producto, opcional por si no tuviera y solo si no tuviera tallas
    stock: { type: Number, required: false }, // Stock total para este color si no hay tallas
    costo: { type: Number, required: false }, // Precio por color si no hay tallas
    orden: { type: Number, required: true, unique: true } //Indice para organizar el orden de display
  });

  const calidadSchema = new mongoose.Schema({
    calidad: { type: String, required: false, trim: true }, // Ej: "Estandar", "Premium" playeras; "AA", "AAA" para tazas
    disponibleOnline: { type:Boolean, required: true, default: false }, // control de disponibilidad en linea, si esta disponible se muestra como opcion de compra
    colores: [colorSchema], // Variantes agrupadas por color
    orden: { type: Number, required: true, unique: true } //Indice para organizar el orden de display
  });

  calidadSchema.index({ variante: 1, orden: 1 }, { unique: true });
  
  const varianteSchema = new mongoose.Schema({
    variante: { type: String, required: false, trim: true }, // Ej: "Unisex", "Dama", "Oversized" para playeras; "blanca", "magica" para tazas; "rectangular" para accesorios
    disponibleOnline: { type:Boolean, required: true, default: false }, // control de disponibilidad en linea, si esta disponible se muestra como opcion de compra
    calidades: [calidadSchema], // Variantes agrupadas por color
    orden: { type: Number, required: true, unique: true } //Indice para organizar el orden de display
  });

  varianteSchema.index({ producto: 1, orden: 1 }, { unique: true });
  varianteSchema.index({ producto: 1, 'tipo': 1 });

  
  const productoSchema = new mongoose.Schema({
    nombre: { type: String, required: true, trim: true }, // Ej: "Playera Manga Corta", "Taza 11Oz"
    descripcion: { type: String, required: true }, // Descripción del producto
    categoria: { type: mongoose.Schema.Types.ObjectId, ref: 'Categoria', required: true, index: true }, // Ej: "Ropa", "Artículos"
    subcategoria: { type: mongoose.Schema.Types.ObjectId, ref: 'Subcategoria', required: true, index: true }, // Ej: "Playeras", "Tazas"
    //control de variantes, si no usa un nivel de variante solo puede tener un hijo en esa variante solamente conteniendo la referencia al siguiente nivel
    configVariantes: {
        usaVariante: { type: Boolean, required: true, default: false }, //Control de uso, si usa variantes se considera este nivel, si no, pasa directo al siguiente
        usaCalidad: { type: Boolean, required: true, default: false }, //Control de uso, si usa calidades se considera este nivel, si no, pasa directo al siguiente
    },
    variantes: [varianteSchema], // Variantes flexibles
    imagenes: [{ 
        url: { type: String, required: true },
        esPrincipal: { type: Boolean, default: false },
        orden: { type: Number, required: true }
    }], // URLs de imágenes
    activo: { type: Boolean, default: true },
    metadata: {
        fechaCreacion: { type: Date, default: Date.now },
        fechaActualizacion: { type: Date, default: Date.now }
    }
  }, { collection: 'productos' });

  productoSchema.index({ categoria: 1, subcategoria: 1 });
  productoSchema.index({ nombre: 'text', descripcion: 'text' });

module.exports = mongoose.model('Producto', productoSchema);
