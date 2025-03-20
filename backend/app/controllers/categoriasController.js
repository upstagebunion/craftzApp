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

        res.status(200).json({ message: "Categoria Creada jiji", categoria: nuevaCategoria });
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

        const subcategoriaExistente = await Subcategoria.findOne({ nombre, categoriaId });
        if(subcategoriaExistente){
            return res.status(400).json({ message: "Subcategoria ya existe xd", error });
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

module.exports = {
    agregarCategoria,
    crearSubcategoria,
    obtenerCategorias
};