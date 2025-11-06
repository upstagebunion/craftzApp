const mongoose = require('mongoose');

const productoOnlineSchema = new mongoose.Schema({
    slug: { type: String, required: true, unique: true }, // Para URL amigables
    nombre: { type: String, required: true, trim: true }, // Ej: "Playera Diseño 'Guerrero Azteca'"
    descripcionCorta: { type:String, required: false, trim: true, maxlength: [200, 'La descripcion no puede exceder los 200 caracteres.']}, //descripcion sencilla que aparece primero en la pagina del produco
    descripcion: { type: String, required: true },
    precioMinimo: { type: Number, required: true, min: 0 }, //precio minimo posible de las combinaciones
    precioMaximo: { type: Number, required: true, min: 0 }, //precio maximo posible de las combinaciones
    diseno: { type: String, required: true },
    imagenes: [{ 
        url: { type: String, required: true },
        esPrincipal: { type: Boolean, default: false },
        orden: { type: Number, required: true }
    }],
    productoBase: { type: mongoose.Schema.Types.ObjectId, ref: 'Producto', required: true },
    varianteSugerida: {
        corte: { type: mongoose.Schema.Types.ObjectId, required: true },    // ej. ID de "Unisex"
        calidad: { type: mongoose.Schema.Types.ObjectId, required: true },  // ej. ID de "Estándar"
        color: { type: mongoose.Schema.Types.ObjectId, required: true },    // ej. ID de "Negro"
        talla: { type: mongoose.Schema.Types.ObjectId, required: false }    // ej. ID de "M"
    },
    configColor: {
        colorFijo: { type: Boolean, default: true }, // (si es false, cliente puede elegir color)
        colorRequerido: { type: String }, // Guarda el nombre del color ("Negro", "Blanco")
    },
    categorias: [{ type: mongoose.Schema.Types.ObjectId, ref: 'CategoriasDisenos' }],
    etiquetas: [{ type: String }],
    activo: { type: Boolean, default: true },
    destacado: { type: Boolean, default: false },
    fechaCreacion: { type: Date, default: Date.now },
    fechaActualizacion: { type: Date, default: Date.now }
});


productoOnlineSchema.index({ productoBase: 1, activo: 1 });
productoOnlineSchema.index({ categorias: 1 });
productoOnlineSchema.index({ etiquetas: 1 });

module.exports = mongoose.model('ProductoOnline', productoOnlineSchema);