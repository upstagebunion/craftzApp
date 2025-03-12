const Producto = require('../models/productosModel'); // Asegúrate de que este sea el modelo correcto

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
        const {
            nombre,
            descripcion,
            categoria,
            subcategoria,
            calidad,
            corte,
            variantes,
            imagenes,
            activo
        } = req.body;

        if (!nombre || !descripcion || !categoria || !subcategoria) {
            return res.status(400).json({ message: "Todos los campos son obligatorios" });
        }

        const nuevoProducto = new Producto({
            nombre,
            descripcion,
            categoria,
            subcategoria,
            calidad: calidad || null,
            corte: corte || null,
            variantes: variantes || [],
            imagenes: imagenes || [],
            activo: activo !== undefined ? activo : true,
        });
        await nuevoProducto.save();

        res.status(200).json({ message: "Producto creado exitosamente", producto: nuevoProducto });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error al crear el producto", error });
    }
};

const agregarVariantes = async (req, res) => {
    try {
        const productoId = req.params.id;
        const { variantes } = req.body;  // Recibimos un array de variantes

        if (!productoId) {
            return res.status(400).json({ message: "Producto ID es requerido" });
        }

        const producto = await Producto.findById(productoId);
        if (!producto) {
            return res.status(404).json({ message: "Producto no encontrado" });
        }

        // Iteramos sobre todas las variantes
        for (let i = 0; i < variantes.length; i++) {
            const { tipo, colores } = variantes[i];

            // Buscar o crear la variante de tipo
            let variante = producto.variantes.find(v => v.tipo === tipo);
            if (!variante) {
                variante = { tipo, colores: [] };
                producto.variantes.push(variante);
            }

            // Iteramos sobre los colores dentro de cada variante
            for (let j = 0; j < colores.length; j++) {
                const { color, tallas } = colores[j];
                console.log(colores[j].color);

                // Buscar o crear el color dentro de la variante
                let colorObj = variante.colores.find(c => c.color === color);
                if (!colorObj) {
                    colorObj = { color, tallas: [] };
                    variante.colores.push(colorObj);
                }

                // Iteramos sobre las tallas dentro de cada color
                for (let k = 0; k < tallas.length; k++) {
                    const { talla, stock, precio } = tallas[k];
                    console.log(tallas[k]);

                    // Buscar o crear la talla dentro del color
                    let tallaObj = colorObj.tallas.find(t => t.talla === talla);
                    if (!tallaObj) {
                        tallaObj = { talla, stock, precio };
                        colorObj.tallas.push(tallaObj);
                    } else {
                        // Actualizar stock y precio si ya existe
                        tallaObj.stock = stock;
                        tallaObj.precio = precio;
                    }
                }
            }
        }

        // Guardar cambios
        await producto.save();

        res.status(200).json({
            message: "Variantes agregadas o actualizadas exitosamente",
            producto,
        });
    } catch (error) {
        console.error("Error al agregar variantes:", error);
        res.status(500).json({
            message: "Error al agregar variantes",
            error: error.message || error,
        });
    }
};

// Editar producto
const editarProducto = async (req, res) => {
    try {
        const { productoId } = req.params.id;
        const {
            nombre,
            descripcion,
            categoria,
            subcategoria,
            calidad,
            corte,
            imagenes,
            activo
        } = req.body;

        if (!productoId) {
            return res.status(400).json({ message: "Producto ID es requerido" });
        }

        const producto = await Producto.findById(productoId);
        if (!producto) {
            return res.status(404).json({ message: "Producto no encontrado" });
        }

        producto.nombre = nombre || producto.nombre;
        producto.descripcion = descripcion || producto.descripcion;
        producto.categoria = categoria || producto.categoria;
        producto.subcategoria = subcategoria || producto.subcategoria;
        producto.calidad = calidad || producto.calidad;
        producto.corte = corte || producto.corte;
        producto.imagenes = imagenes || producto.imagenes;
        producto.activo = activo !== undefined ? activo : producto.activo;

        await producto.save();

        res.status(200).json({ message: "Producto actualizado exitosamente", producto });
    } catch (error) {
        console.error("Error al editar producto:", error);
        res.status(500).json({ message: "Error al editar producto", error });
    }
};

const editarVariante = async (req, res) => {
    try {
        const productoId = req.params.id;
        const varianteId = req.params.variante;
        const nuevoTipo = req.body;

        if (!productoId || !varianteId) {
            return res.status(400).json({ message: "Producto ID y Variante ID son requeridos" });
        }

        const producto = await Producto.findById(productoId);
        if (!producto) {
            return res.status(404).json({ message: "Producto no encontrado" });
        }

        const variante = producto.variantes.id(varianteId);
        if (!variante) {
            return res.status(404).json({ message: "Variante no encontrada" });
        }

        variante.tipo = nuevoTipo || variante.tipo;

        await producto.save();

        res.status(200).json({ message: "Variante actualizada exitosamente", producto });
    } catch (error) {
        console.error("Error al editar variante:", error);
        res.status(500).json({ message: "Error al editar variante", error });
    }
};

const editarColor = async (req, res) => {
    try {
        const productoId = req.params.id;
        const varianteId = req.params.variante;
        const colorId = req.params.color;
        const {
            nuevoColor,
            nuevoStock,
            nuevoPrecio
        } = req.body;

        if (!productoId || !varianteId || !colorId) {
            return res.status(400).json({ message: "Producto ID, Variante ID y Color ID son requeridos" });
        }

        const producto = await Producto.findById(productoId);
        if (!producto) {
            return res.status(404).json({ message: "Producto no encontrado" });
        }

        const variante = producto.variantes.id(varianteId);
        if (!variante) {
            return res.status(404).json({ message: "Variante no encontrada" });
        }

        const color = variante.colores.id(colorId);
        if (!color) {
            return res.status(404).json({ message: "Color no encontrado" });
        }

        color.color = nuevoColor || color.color;
        color.stock = nuevoStock !== undefined ? nuevoStock : color.stock;
        color.precio = nuevoPrecio !== undefined ? nuevoPrecio : color.precio;

        await producto.save();

        res.status(200).json({ message: "Color actualizado exitosamente", producto });
    } catch (error) {
        console.error("Error al editar color:", error);
        res.status(500).json({ message: "Error al editar color", error });
    }
};

const editarTalla = async (req, res) => {
    try {
        const productoId = req.params.id;
        const varianteId = req.params.variante;
        const colorId = req.params.color;
        const tallaId = req.params.talla;
        const {
            nuevaTalla,
            nuevoStock,
            nuevoPrecio
        } = req.body;

        if (!productoId || !varianteId || !colorId || !tallaId) {
            return res.status(400).json({ message: "Producto ID, Variante ID, Color ID y Talla ID son requeridos" });
        }

        const producto = await Producto.findById(productoId);
        if (!producto) {
            return res.status(404).json({ message: "Producto no encontrado" });
        }

        const variante = producto.variantes.id(varianteId);
        if (!variante) {
            return res.status(404).json({ message: "Variante no encontrada" });
        }

        const color = variante.colores.id(colorId);
        if (!color) {
            return res.status(404).json({ message: "Color no encontrado" });
        }

        const talla = color.tallas.id(tallaId);
        if (!talla) {
            return res.status(404).json({ message: "Talla no encontrada" });
        }

        talla.talla = nuevaTalla || talla.talla;
        talla.stock = nuevoStock !== undefined ? nuevoStock : talla.stock;
        talla.precio = nuevoPrecio !== undefined ? nuevoPrecio : talla.precio;

        await producto.save();

        res.status(200).json({ message: "Talla actualizada exitosamente", producto });
    } catch (error) {
        console.error("Error al editar talla:", error);
        res.status(500).json({ message: "Error al editar talla", error });
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
    eliminarProducto,
    agregarVariantes,
    editarColor,
    editarTalla,
    editarVariante
};
