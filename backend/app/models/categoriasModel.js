const mongoose = require('mongoose');

const SubcategoriaSchema = new mongoose.Schema({
    nombre: { 
        type: String, 
        required: true, 
        trim: true,
        maxlength: [50, 'El nombre no puede exceder los 50 caracteres']
    },
    usaTallas: { type: Boolean, required: true},
    categoria: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Categoria', 
        required: true,
        index: true
    },
});

const CategoriaSchema = new mongoose.Schema({
    nombre: { 
        type: String, 
        required: true, 
        unique: true,
        trim: true,
        maxlength: [50, 'El nombre no puede exceder los 50 caracteres']
    },
    subcategorias: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Subcategoria' }],
});

const Categoria = mongoose.model('Categoria', CategoriaSchema);
const Subcategoria = mongoose.model('Subcategoria', SubcategoriaSchema);

module.exports = { Categoria, Subcategoria };
