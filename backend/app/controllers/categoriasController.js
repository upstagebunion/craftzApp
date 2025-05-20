const mongoose = require('mongoose');
const {Categoria, Subcategoria} = require('../models/categoriasModel');

const agregarCategoria = async (req, res) => {
    try{
        const { nombre } = req.body;

        const categoriaExistente = await Categoria.findOne({ nombre });
        if(categoriaExistente){
            return res.status(400).json({ message: "La categoria ya existe.", error })
        }

        const nuevaCategoria = new Categoria({ nombre });
        await nuevaCategoria.save();

        res.status(201).json({ message: "Categoria Creada", categoria: nuevaCategoria });
    } catch (error) {
        res.status(500).json({ message: "Error al crear la categoria", error });
    }
}

const crearSubcategoria = async (req, res) => {
    try{
        const categoriaId = req.params.id;
        const { nombre, usaTallas } = req.body;

        const categoria = await Categoria.findById(categoriaId);
        if (!categoria){
            return res.status(404).json({ message: "Categoria no encontrada.", error });
        }

        const nuevaSubcategoria = new Subcategoria({ nombre, categoria: categoriaId, usaTallas: usaTallas ?? false });
        await nuevaSubcategoria.save();

        categoria.subcategorias.push(nuevaSubcategoria._id);
        await categoria.save();

        res.status(201).json({ message: "Subcategoria Creada.", subcategoria: nuevaSubcategoria});
    } catch {
        res.status(500).json({ message: "Error al crear la subcategoria", error });
    }
}

const obtenerCategorias = async (req, res) => {
    try {
        const categorias = await Categoria.find().populate('subcategorias');
        res.status(200).json({ message: 'Categorias obtenidas con exito', categorias });
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener las categorías', error });
    }
};

const eliminarCategoria = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
        const { id } = req.params;
        // 1. Eliminar todas las subcategorías relacionadas
        await Subcategoria.deleteMany({ categoria: id }).session(session);

        // 2. Eliminar la categoría
        const categoriaEliminada = await Categoria.findByIdAndDelete(id).session(session);

        if (!categoriaEliminada) {
            await session.abortTransaction();
            return res.status(404).json({ message: "Categoría no encontrada." });
        }

        await session.commitTransaction();
        res.status(200).json({ message: "Categoría y subcategorías eliminadas correctamente" });
    } catch (error) {
        await session.abortTransaction();
        res.status(500).json({ message: "Error al eliminar la categoría", error: error.message });
    } finally {
        session.endSession();
    }
};

const eliminarSubcategoria = async (req, res) => {
    try {
        const { idSubcategoria } = req.params;

        const subcategoriaEliminada = await Subcategoria.findByIdAndDelete(idSubcategoria);

        if (!subcategoriaEliminada) {
            return res.status(404).json({ message: "Subcategoria no encontrada" });
        }

        res.status(200).json({ message: "Subcategoria eliminada" });
    } catch (error) {
        res.status(500).json({ message: "Error al eliminar la subcategoria", error });
    }
};

module.exports = {
    agregarCategoria,
    crearSubcategoria,
    obtenerCategorias,
    eliminarSubcategoria,
    eliminarCategoria
};