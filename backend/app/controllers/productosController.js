const Producto = require('../models/productosModel'); // Asegúrate de que este sea el modelo correcto
const MovimientoInventario = require('../models/movimientosInventarioModel');

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
                const { color, tallas, costoColor } = colores[j];
                console.log(colores[j].color);

                // Buscar o crear el color dentro de la variante
                let colorObj = variante.colores.find(c => c.color === color);
                if (!colorObj) {
                    colorObj = { color, tallas: [], costo: costoColor != undefined ? costoColor : null };
                    variante.colores.push(colorObj);
                }

                // Iteramos sobre las tallas dentro de cada color
                for (let k = 0; k < tallas.length; k++) {
                    const { talla, stock, costo } = tallas[k];
                    console.log(tallas[k]);

                    // Buscar o crear la talla dentro del color
                    let tallaObj = colorObj.tallas.find(t => t.talla === talla);
                    if (!tallaObj) {
                        tallaObj = { talla, stock, costo };
                        colorObj.tallas.push(tallaObj);
                    } else {
                        // Actualizar stock y costo si ya existe
                        tallaObj.stock = stock;
                        tallaObj.costo = costo;
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

const actualizarProductos = async (req, res) => {
    try {
        const productosModificados = req.body;
        const usuario = req.userId; // Asumiendo que tienes el usuario en el request

        if (!Array.isArray(productosModificados)) {
            return res.status(400).json({ message: "Se esperaba un array de productos" });
        }

        for (const productoModificado of productosModificados) {
            const { _id, variantes, ...otrosDatos } = productoModificado;

            const productoExistente = await Producto.findById(_id)
                .lean(); // Usamos lean() para obtener objeto plano

            if (!productoExistente) {
                continue; // O manejar el error como prefieras
            }

            // Actualizar datos básicos
            const productoActualizado = await Producto.findByIdAndUpdate(
                _id, 
                { $set: otrosDatos },
                { new: true }
            );

            // Comparar variantes para detectar cambios en stock
            if (variantes && productoExistente.variantes) {
                for (const varianteMod of variantes) {
                    const varianteExistente = productoExistente.variantes.find(
                        v => v._id.toString() === varianteMod._id
                    );

                    if (!varianteExistente) continue;

                    for (const colorMod of varianteMod.colores) {
                        const colorExistente = varianteExistente.colores.find(
                            c => c._id.toString() === colorMod._id
                        );

                        if (!colorExistente) continue;

                        // Productos sin tallas
                        if (colorMod.stock !== undefined && colorMod.stock !== null) {
                            const diferencia = colorMod.stock - (colorExistente.stock || 0);
                            if (diferencia !== 0) {
                                await registrarMovimiento(
                                    _id,
                                    varianteMod._id,
                                    colorMod._id,
                                    null, // No hay talla
                                    diferencia,
                                    usuario
                                );
                            }
                        }
                        // Productos con tallas
                        else if (colorMod.tallas && colorExistente.tallas) {
                            for (const tallaMod of colorMod.tallas) {
                                const tallaExistente = colorExistente.tallas.find(
                                    t => t._id.toString() === tallaMod._id
                                );

                                if (!tallaExistente) continue;

                                const diferencia = tallaMod.stock - tallaExistente.stock;
                                if (diferencia !== 0) {
                                    await registrarMovimiento(
                                        _id,
                                        varianteMod._id,
                                        colorMod._id,
                                        tallaMod._id,
                                        diferencia,
                                        usuario
                                    );
                                }
                            }
                        }
                    }
                }
            }

            // Actualizar variantes completas (reemplazar)
            if (variantes) {
                productoActualizado.variantes = variantes;
                await productoActualizado.save();
            }
        }

        res.status(200).json({ message: "Productos actualizados exitosamente" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error al actualizar los productos", error });
    }
};

async function registrarMovimiento(productoId, varianteId, colorId, tallaId, diferencia, usuarioId) {
    const producto = await Producto.findById(productoId).lean();
    let productoInfo = producto.nombre;
    
    // Construir info de variante/color/talla si es necesario
    // ...

    const movimiento = new MovimientoInventario({
        producto: productoId,
        variante: varianteId,
        color: colorId,
        talla: tallaId,
        productoInfo,
        tipo: diferencia > 0 ? 'entrada' : 'salida',
        cantidad: Math.abs(diferencia),
        motivo: diferencia > 0 ? 'compra' : 'ajuste',
        usuario: usuarioId
    });

    await movimiento.save();
}

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
      const { color, stock, costo } = req.body; // Datos del nuevo color
  
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
        costo,
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
      const { talla, stock, costo } = req.body; // Datos de la nueva talla
  
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
        costo,
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
