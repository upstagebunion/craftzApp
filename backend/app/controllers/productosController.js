const Producto = require('../models/Producto'); // Asegúrate de que este sea el modelo correcto

// Listar productos
const listarProductos = async (req, res) => {
    try {
        const productos = await Producto.find();
        res.status(200).json(productos);
    } catch (error) {
        res.status(500).json({ message: "Error al obtener los productos", error });
    }
};

// Crear producto
const crearProducto = async (req, res) => {
    try {
        const { nombre, descripcion, precio } = req.body;

        if (!nombre || !descripcion || !precio) {
            return res.status(400).json({ message: "Todos los campos son obligatorios" });
        }

        const nuevoProducto = new Producto({ nombre, descripcion, precio });
        await nuevoProducto.save();

        res.status(201).json({ message: "Producto creado exitosamente", producto: nuevoProducto });
    } catch (error) {
        res.status(500).json({ message: "Error al crear el producto", error });
    }
};

// Editar producto
const editarProducto = async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre, descripcion, precio, stock } = req.body;

        const productoActualizado = await Producto.findByIdAndUpdate(
            id,
            { nombre, descripcion, precio, stock },
            { new: true }
        );

        if (!productoActualizado) {
            return res.status(404).json({ message: "Producto no encontrado" });
        }

        res.status(200).json({ message: "Producto actualizado", producto: productoActualizado });
    } catch (error) {
        res.status(500).json({ message: "Error al actualizar el producto", error });
    }
};

// Eliminar producto
const eliminarProducto = async (req, res) => {
    try {
        const { id } = req.params;

        const productoEliminado = await Producto.findByIdAndDelete(id);

        if (!productoEliminado) {
            return res.status(404).json({ message: "Producto no encontrado" });
        }

        res.status(200).json({ message: "Producto eliminado", producto: productoEliminado });
    } catch (error) {
        res.status(500).json({ message: "Error al eliminar el producto", error });
    }
};

module.exports = {
    listarProductos,
    crearProducto,
    editarProducto,
    eliminarProducto
};
