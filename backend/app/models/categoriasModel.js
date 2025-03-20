const mongoose = require('mongoose');

const SubcategoriaSchema = new mongoose.Schema({
    nombre: { type: String, required: true, unique: true },
    usaTallas: { type: Boolean, required: true},
    categoria: { type: mongoose.Schema.Types.ObjectId, ref: 'Categoria', required: true },
});

const CategoriaSchema = new mongoose.Schema({
    nombre: { type: String, required: true, unique: true },
    subcategorias: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Subcategoria' }],
});

const Categoria = mongoose.model('Categoria', CategoriaSchema);
const Subcategoria = mongoose.model('Subcategoria', SubcategoriaSchema);

module.exports = { Categoria, Subcategoria };
