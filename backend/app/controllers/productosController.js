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

        res.status(201).json({ message: "Producto creado exitosamente", producto: nuevoProducto });
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
/*const editarProducto = async (req, res) => {
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
};*/

const actualizarProductos = async (req, res) => {
    try {
        const productosModificados = req.body; // Array de productos modificados

        if (!Array.isArray(productosModificados)) {
            return res.status(400).json({ message: "Se esperaba un array de productos" });
        }

        // Recorremos cada producto modificado
        for (const productoModificado of productosModificados) {
            const { _id, ...datosActualizados } = productoModificado;

            if (!_id) {
                return res.status(400).json({ message: "Cada producto debe incluir un _id" });
            }

            // Buscamos el producto en la base de datos
            const productoExistente = await Producto.findById(_id);

            if (!productoExistente) {
                return res.status(404).json({ message: `Producto con id ${_id} no encontrado` });
            }

            // Actualizamos solo los campos que han sido modificados
            for (const [key, value] of Object.entries(datosActualizados)) {
                if (value !== undefined) {
                    productoExistente[key] = value;
                }
            }

            // Guardamos los cambios
            await productoExistente.save();
        }

        res.status(200).json({ message: "Productos actualizados exitosamente" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error al actualizar los productos", error });
    }
};

const agregarVariante = async (req, res) => {
    try {
      const { id } = req.params; // ID del producto
      const { tipo } = req.body; // Datos de la nueva variante
  
      // Buscar el producto en la base de datos
      const producto = await Producto.findById(id);
  
      if (!producto) {
        return res.status(404).json({ message: "Producto no encontrado" });
      }
  
      // Crear la nueva variante
      const nuevaVariante = {
        tipo,
        colores: [],
      };
  
      // Agregar la variante al producto
      producto.variantes.push(nuevaVariante);
  
      // Guardar el producto actualizado
      await producto.save();
  
      // Devolver el producto actualizado
      res.status(200).json(producto);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Error al agregar la variante", error });
    }
  };

  const agregarColor = async (req, res) => {
    try {
      const { id, variante } = req.params; // ID del producto y ID de la variante
      const { color, stock, precio } = req.body; // Datos del nuevo color
  
      // Buscar el producto en la base de datos
      const producto = await Producto.findById(id);
  
      if (!producto) {
        return res.status(404).json({ message: "Producto no encontrado" });
      }
  
      // Buscar la variante en el producto
      const varianteExistente = producto.variantes.id(variante);
  
      if (!varianteExistente) {
        return res.status(404).json({ message: "Variante no encontrada" });
      }
  
      // Crear el nuevo color
      const nuevoColor = {
        color,
        stock,
        precio,
        tallas: [],
      };
  
      // Agregar el color a la variante
      varianteExistente.colores.push(nuevoColor);
  
      // Guardar el producto actualizado
      await producto.save();
  
      // Devolver el producto actualizado
      res.status(200).json(producto);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Error al agregar el color", error });
    }
  };

  const agregarTalla = async (req, res) => {
    try {
      const { id, variante, color } = req.params; // ID del producto, variante y color
      const { talla, stock, precio } = req.body; // Datos de la nueva talla
  
      // Buscar el producto en la base de datos
      const producto = await Producto.findById(id);
  
      if (!producto) {
        return res.status(404).json({ message: "Producto no encontrado" });
      }
  
      // Buscar la variante en el producto
      const varianteExistente = producto.variantes.id(variante);
  
      if (!varianteExistente) {
        return res.status(404).json({ message: "Variante no encontrada" });
      }
  
      // Buscar el color en la variante
      const colorExistente = varianteExistente.colores.id(color);
  
      if (!colorExistente) {
        return res.status(404).json({ message: "Color no encontrado" });
      }
  
      // Crear la nueva talla
      const nuevaTalla = {
        talla,
        stock,
        precio,
      };
  
      // Agregar la talla al color
      colorExistente.tallas.push(nuevaTalla);
  
      // Guardar el producto actualizado
      await producto.save();
  
      // Devolver el producto actualizado
      res.status(200).json(producto);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Error al agregar la talla", error });
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

        res.status(200).json({ message: "Producto eliminado" });
    } catch (error) {
        res.status(500).json({ message: "Error al eliminar el producto", error });
    }
};

const eliminarVariante = async (req, res) => {
    try {
      const { id, variante } = req.params;
      const producto = await Producto.findById(id);
      producto.variantes.pull(variante);
      await producto.save();
      res.status(200).json(producto);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Error al eliminar la variante", error });
    }
};

const eliminarColor = async (req, res) => {
    try {
      const { id, variante, color } = req.params; // ID del producto, variante y color
  
      // Buscar el producto en la base de datos
      const producto = await Producto.findById(id);
  
      if (!producto) {
        return res.status(404).json({ message: "Producto no encontrado" });
      }
  
      // Buscar la variante en el producto
      const varianteExistente = producto.variantes.id(variante);
  
      if (!varianteExistente) {
        return res.status(404).json({ message: "Variante no encontrada" });
      }
  
      // Eliminar el color de la variante
      varianteExistente.colores.pull(color);
  
      // Guardar el producto actualizado
      await producto.save();
  
      // Devolver el producto actualizado
      res.status(200).json(producto);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Error al eliminar el color", error });
    }
};

const eliminarTalla = async (req, res) => {
    try {
      const { id, variante, color, talla } = req.params; // ID del producto, variante, color y talla
  
      // Buscar el producto en la base de datos
      const producto = await Producto.findById(id);
  
      if (!producto) {
        return res.status(404).json({ message: "Producto no encontrado" });
      }
  
      // Buscar la variante en el producto
      const varianteExistente = producto.variantes.id(variante);
  
      if (!varianteExistente) {
        return res.status(404).json({ message: "Variante no encontrada" });
      }
  
      // Buscar el color en la variante
      const colorExistente = varianteExistente.colores.id(color);
  
      if (!colorExistente) {
        return res.status(404).json({ message: "Color no encontrado" });
      }
  
      // Eliminar la talla del color
      colorExistente.tallas.pull(talla);
  
      // Guardar el producto actualizado
      await producto.save();
  
      // Devolver el producto actualizado
      res.status(200).json(producto);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Error al eliminar la talla", error });
    }
};

module.exports = {
    listarProductos,
    crearProducto,
    actualizarProductos,
    eliminarProducto,
    agregarVariantes,
    agregarColor,
    agregarTalla,
    agregarVariante,
    eliminarVariante,
    eliminarColor,
    eliminarTalla
};
