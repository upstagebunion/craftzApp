const mongoose = require('mongoose');

const categoriasDisenosSchema = new mongoose.Schema({
    nombre: { 
        type: String, 
        required: true, 
        unique: true,
        trim: true,
        maxlength: [50, 'El nombre no puede exceder los 50 caracteres']
    },
    descripcion: {
        type: String,
        trim: true,
        maxlength: [200, 'La descripción no puede exceder los 200 caracteres']
    },
    activo: { 
        type: Boolean, 
        default: true 
    },
    orden: { 
        type: Number, 
        default: 0 
    },
    fechaCreacion: { 
        type: Date, 
        default: Date.now 
    }
});

categoriasDisenosSchema.index({ nombre: 1 });
categoriasDisenosSchema.index({ activo: 1, orden: 1 });

module.exports = mongoose.model('CategoriasDisenos', categoriasDisenosSchema);