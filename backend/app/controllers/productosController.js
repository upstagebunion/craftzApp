const Producto = require('../models/productsRelatedModels/productosModel');
const MovimientoInventario = require('../models/movimientosInventarioModel');
const mongoose = require("mongoose");

// Listar productos
const listarProductos = async (req, res) => {
    try {
        const { categoria, subcategoria, activo } = req.query;
        const filtro = {};

        if (categoria) filtro.categoria = categoria;
        if (subcategoria) filtro.subcategoria = subcategoria;
        if (activo !== undefined) filtro.activo = activo === 'true';

        const productos = await Producto.find(filtro);
        res.status(200).json(productos);
    } catch (error) {
        res.status(500).json({ message: "Error al obtener los productos", error });
    }
};

const obtenerProductoPorId = async (req, res) => {
    try {
        const { id } = req.params;
        
        const producto = await Producto.findById(id)
            .populate('categoria', 'nombre')
            .populate('subcategoria', 'nombre usaTallas');
            
        if (!producto) {
            return res.status(404).json({ message: "Producto no encontrado" });
        }
        
        res.status(200).json(producto);
    } catch (error) {
        console.error("Error al obtener producto:", error);
        
        if (error.name === 'CastError') {
            return res.status(400).json({ message: "ID de producto no válido" });
        }
        
        res.status(500).json({ 
            message: "Error interno al obtener el producto", 
            error: error.message 
        });
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
            configVariantes,
            variantes,
            imagenes,
            activo
        } = req.body;

        if (!nombre || !descripcion || !categoria || !subcategoria) {
            return res.status(400).json({ message: "Nombre, descripción, categoría y subcategoría son obligatorios" });
        }

        let estructuraVariantes = variantes || [];

        if (!configVariantes?.usaVariante) {
            // Si no usa variantes, creamos una estructura base
            const baseVariante = {
                variante: null,
                disponibleOnline: false,
                orden: 0, // Asignamos orden 0 por defecto
                calidades: []
            };

            if (!configVariantes?.usaCalidad) {
                // Si tampoco usa calidad, creamos una calidad base con colores vacíos
                baseVariante.calidades = [{
                    calidad: null,
                    disponibleOnline: false,
                    orden: 0,
                    colores: []
                }];
            }
            
            estructuraVariantes = [baseVariante];
        }

        const nuevoProducto = new Producto({
            nombre,
            descripcion,
            categoria,
            subcategoria,
            configVariantes: {
                usaVariante: configVariantes?.usaVariante || false,
                usaCalidad: configVariantes?.usaCalidad || false
            },
            variantes: estructuraVariantes,
            imagenes,
            activo: activo !== undefined ? activo : true,
            metadata: {
                fechaCreacion: new Date(),
                fechaActualizacion: new Date()
            }
        });
        await nuevoProducto.save();

        res.status(201).json({ message: "Producto creado exitosamente", producto: nuevoProducto });
    } catch (error) {
        console.error(error);
        if (error.name === 'ValidationError') {
            return res.status(400).json({ 
                message: "Error de validación", 
                details: error.errors 
            });
        }
        if (error.code === 11000) {
            return res.status(400).json({ 
                message: "Conflicto con un valor único (orden duplicado en alguna variante/calidad/color/talla)" 
            });
        }
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
        const usuario = req.userId;

        if (!Array.isArray(productosModificados)) {
            return res.status(400).json({ message: "Se esperaba un array de productos" });
        }

        const resultadosActualizacion = await Promise.all(productosModificados.map(async (productoModificado) => {
            try {
                const { _id, variantes, metadata, ...otrosDatos } = productoModificado;

                // Obtener producto existente con toda su estructura
                const productoExistente = await Producto.findById(_id)
                    .populate('subcategoria', 'usaTallas')
                    .lean();

                if (!productoExistente) {
                    console.warn(`Producto no encontrado: ${_id}`);
                    return;
                }

                const updateOperations = {
                    ...otrosDatos, // Incluye todos los otros campos recibidos
                    "metadata.fechaActualizacion": new Date()
                };

                if (variantes) {
                    updateOperations.variantes = variantes;
                }

                await Producto.findByIdAndUpdate(
                    _id,
                    { $set: updateOperations }, // Usa $set para aplicar todos los cambios de una vez
                    { new: true, runValidators: true } // `runValidators` es importante si tienes validadores en tu esquema
                );

                // Procesar cambios en las variantes
                if (variantes && productoExistente.variantes) {
                    for (const varianteMod of variantes) {
                        const varianteExistente = productoExistente.variantes.find(
                            v => v._id.toString() === varianteMod._id
                        );

                        if (!varianteExistente) continue;

                        // Procesar calidades si existen
                        if (varianteMod.calidad && varianteExistente.calidad) {
                            for (const calidadMod of varianteMod.calidad) {
                                const calidadExistente = varianteExistente.calidad.find(
                                    c => c._id.toString() === calidadMod._id
                                );

                                if (!calidadExistente) continue;

                                // Procesar colores si existen
                                if (calidadMod.colores && calidadExistente.colores) {
                                    for (const colorMod of calidadMod.colores) {
                                        const colorExistente = calidadExistente.colores.find(
                                            col => col._id.toString() === colorMod._id
                                        );

                                        if (!colorExistente) continue;

                                        // Productos sin tallas (actualizar stock a nivel color)
                                        if (productoExistente.subcategoria && !productoExistente.subcategoria.usaTallas) {
                                            if (colorMod.stock !== undefined && colorMod.stock !== null) {
                                                const diferencia = colorMod.stock - (colorExistente.stock || 0);
                                                if (diferencia !== 0) {
                                                    const productoInfo = `${productoExistente.nombre} | ${varianteExistente.variante || 'N/A'} | ${calidadExistente.calidad || 'N/A'} | ${colorExistente.color}`;
                                                    await registrarMovimiento(
                                                        _id,
                                                        varianteMod._id,
                                                        calidadMod._id,
                                                        colorMod._id,
                                                        null, // No hay talla
                                                        diferencia,
                                                        usuario,
                                                        productoInfo
                                                    );
                                                }
                                            }
                                        } 
                                        // Productos con tallas (actualizar stock a nivel talla)
                                        else if (colorMod.tallas && colorExistente.tallas) {
                                            for (const tallaMod of colorMod.tallas) {
                                                const tallaExistente = colorExistente.tallas.find(
                                                    t => t._id.toString() === tallaMod._id
                                                );

                                                if (!tallaExistente) continue;

                                                const diferencia = tallaMod.stock - tallaExistente.stock;
                                                if (diferencia !== 0) {
                                                    const productoInfo = `${productoExistente.nombre} | ${varianteExistente.variante || 'N/A'} | ${calidadExistente.calidad || 'N/A'} | ${colorExistente.color} | ${tallaExistente.talla || tallaExistente.codigo}`;
                                                    await registrarMovimiento(
                                                        _id,
                                                        varianteMod._id,
                                                        calidadMod._id,
                                                        colorMod._id,
                                                        tallaMod._id,
                                                        diferencia,
                                                        usuario,
                                                        productoInfo
                                                    );
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }

                return { _id, status: 'success' };

                // Actualizar todas las variantes (reemplazo completo)
                // Esto es más eficiente que actualizar individualmente cada nivel
                /*productoActualizado.variantes = variantes;
                await productoActualizado.save();*/

            } catch (error) {
                console.error(`Error al actualizar producto ${productoModificado._id}:`, error);
                return { _id: productoModificado._id, status: 'failed', error: error.message };
                // Puedes decidir si quieres continuar con otros productos o no
            }
        }));

        const productosActualizadosExitosos = resultadosActualizacion.filter(r => r.status === 'success');
        const productosConErrores = resultadosActualizacion.filter(r => r.status === 'failed' || r.status === 'skipped');

        res.status(200).json({ 
            message: "Proceso de actualización masiva completado",
            productosActualizados: productosActualizadosExitosos.length,
            productosConErrores: productosConErrores.length,
            detallesErrores: productosConErrores
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error al actualizar los productos", error });
    }
};

async function registrarMovimiento(productoId, varianteId, calidadId, colorId, tallaId, diferencia, usuarioId, productoInfo) {
    const movimiento = new MovimientoInventario({
        producto: productoId,
        variante: varianteId,
        calidad: calidadId,
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
        const { variante, disponibleOnline, orden } = req.body; // Datos de la nueva variante
    
        // Buscar el producto en la base de datos
        const producto = await Producto.findById(id);
    
        if (!producto) {
            return res.status(404).json({ message: "Producto no encontrado" });
        }

        if (!producto.configVariantes.usaVariante){
            orden = 0;
        } else {
            if (typeof orden === 'number') {
                producto.variantes.forEach(variante => {
                    if (variante.orden >= orden) {
                        variante.orden++;
                    }
                });                
            } else {
                const maxOrden = producto.variantes.reduce((max, v) => Math.max(max, v.orden), 0);
                orden = maxOrden + 1;
            }
        }
    
        // Crear la nueva variante
        const nuevaVariante = {
            variante,
            orden,
            disponibleOnline: disponibleOnline ?? false,
            calidades: [],
        };
  
        // Agregar la variante al producto
        producto.variantes.push(nuevaVariante);

        producto.variantes.sort((a, b) => a.orden - b.orden);
    
        // Guardar el producto actualizado
        await producto.save();
    
        // Devolver el producto actualizado
        res.status(200).json(producto);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Error al agregar la variante", error });
    }
  };

const agregarCalidad = async (req, res) => {
    try {
      const { id, variante } = req.params; // ID del producto
      const { calidad, disponibleOnline, orden } = req.body; // Datos de la nueva variante
  
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

      if (!producto.configVariantes.usaCalidad){
        orden = 0;
      } else {
        if (typeof orden === 'number') {
            varianteExistente.calidades.forEach(calidadItem => {
                if (calidadItem.orden >= orden) {
                    calidadItem.orden++;
                }
            });
        } else {
            const maxOrden = varianteExistente.calidades.reduce((max, c) => Math.max(max, c.orden), 0);
            orden = maxOrden + 1;
        }
      }
  
      // Crear la nueva variante
      const nuevaCalidad = {
        calidad,
        disponibleOnline: disponibleOnline ?? false,
        orden,
        colores: [],
      };
  
      // Agregar la variante al producto
      varianteExistente.calidades.push(nuevaCalidad);

      varianteExistente.calidades.sort((a, b) => a.orden - b.orden);
  
      // Guardar el producto actualizado
      await producto.save();
  
      // Devolver el producto actualizado
      res.status(200).json(producto);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Error al agregar la calidad", error });
    }
  };

const agregarColor = async (req, res) => {
    try {
      const { id, variante, calidad } = req.params; // ID del producto y ID de la variante
        const {
            color,
            codigoHex,
            disponibleOnline,
            SUK,
            stock,
            costo,
            orden
        } = req.body; // Datos del nuevo color
        const usuario = req.userId;
    
        // Buscar el producto en la base de datos
        const producto = await Producto.findById(id)
            .populate('subcategoria')
            .exec();
    
        if (!producto) {
            return res.status(404).json({ message: "Producto no encontrado" });
        }
    
        // Buscar la variante en el producto
        const varianteExistente = producto.variantes.id(variante);
    
        if (!varianteExistente) {
            return res.status(404).json({ message: "Variante no encontrada" });
        }
        
        const calidadExistente = varianteExistente.calidades.id(calidad);
        
        if (!calidadExistente) {
            return res.status(404).json({ message: "Calidad no encontrada" });
        }

        if (typeof orden === 'number') {
            calidadExistente.colores.forEach(colorItem => {
                if (colorItem.orden >= orden) {
                    colorItem.orden++;
                }
            });
        } else {
            const maxOrden = calidadExistente.colores.reduce((max, c) => Math.max(max, c.orden), 0);
            orden = maxOrden + 1;
        }

        // Crear el nuevo color
        const nuevoColor = {
            color,
            codigoHex,
            disponibleOnline: disponibleOnline ?? false,
            orden,
            tallas: [],
            _id: new mongoose.Types.ObjectId()
        };

        if (!producto.subcategoria.usaTallas) {
            nuevoColor.stock = stock;
            nuevoColor.costo = costo;
            nuevoColor.SUK = SUK;
            if (typeof stock === 'undefined' || typeof costo === 'undefined') {
                return res.status(400).json({ message: 'Stock y costo son requeridos para colores sin tallas.' });
            }
        }

        // Agregar el color a la variante
        calidadExistente.colores.push(nuevoColor);

        calidadExistente.colores.sort((a, b) => a.orden - b.orden);
    
        // Guardar el producto actualizado
        await producto.save();

        if (!producto.subcategoria.usaTallas && stock > 0) {
            let productoInfo = producto.nombre + ' | ' + (varianteExistente.tipo ?? '') + ' | ' + (calidadExistente.calidad ?? '') + ' | ' + color;
            await registrarMovimiento(
                producto._id,
                varianteExistente._id,
                calidadExistente._id,
                nuevoColor._id,
                null, // No hay talla
                stock,
                usuario,
                productoInfo
            );
        }

        const productoRespuesta = await Producto.findById(id);
    
        // Devolver el producto actualizado
        res.status(200).json(productoRespuesta);
    } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al agregar el color", error });
    }
};

  const agregarTalla = async (req, res) => {
    try {
        const { id, variante, calidad, color } = req.params; // ID del producto, variante y color
        const {
            talla,
            codigo,
            disponibleOnline,
            SUK,
            stock,
            costo,
            orden} = req.body; // Datos de la nueva talla
        const usuario = req.userId;
    
        // Buscar el producto en la base de datos
        const producto = await Producto.findById(id)
            .populate('subcategoria')
            .exec();
    
        if (!producto) {
            return res.status(404).json({ message: "Producto no encontrado" });
        }

        if (!producto.subcategoria.usaTallas) {
            return res.status(400).json({ 
            message: "Esta subcategoría no permite tallas" 
            });
        }
    
        // Buscar la variante en el producto
        const varianteExistente = producto.variantes.id(variante);
    
        if (!varianteExistente) {
            return res.status(404).json({ message: "Variante no encontrada" });
        }

        // Buscar la calidad en el producto
        const calidadExistente = varianteExistente.calidades.id(calidad);
    
        if (!calidadExistente) {
            return res.status(404).json({ message: "Calidad no encontrada" });
        }
    
        // Buscar el color en la variante
        const colorExistente = calidadExistente.colores.id(color);
    
        if (!colorExistente) {
            return res.status(404).json({ message: "Color no encontrado" });
        }

        if (typeof orden === 'number') {
            colorExistente.tallas.forEach(talla => {
                if (talla.orden >= orden) {
                    talla.orden++;
                }
            });
        } else {
            const maxOrden = colorExistente.tallas.reduce((max, c) => Math.max(max, c.orden), 0);
            orden = maxOrden + 1;
        }
  
        // Crear la nueva talla
        const nuevaTalla = {
            talla,
            SUK,
            codigo,
            disponibleOnline,
            stock,
            costo,
            orden,
            _id: new mongoose.Types.ObjectId()
        };
    
        // Agregar la talla al color
        colorExistente.tallas.push(nuevaTalla);

        colorExistente.tallas.sort((a, b) => a.orden - b.orden);
    
        // Guardar el producto actualizado
        await producto.save();
        
        if (producto.subcategoria.usaTallas && stock > 0) {
            let productoInfo = producto.nombre + ' | ' + (varianteExistente.tipo ?? '') + ' | ' + (calidadExistente.calidad ?? '') + ' | ' + colorExistente.color + ' | ' + talla;
            await registrarMovimiento(
            producto._id,
            varianteExistente._id,
            calidadExistente._id,
            colorExistente._id,
            nuevaTalla._id,
            stock,
            usuario,
            productoInfo,
            );
        }

        const productoRespuesta = await Producto.findById(id);
    
        // Devolver el producto actualizado
        res.status(200).json(productoRespuesta);
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

const eliminarCalidad = async (req, res) => {
    try {
      const { id, variante, calidad } = req.params; // ID del producto, variante y color
  
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
      varianteExistente.calidades.pull(calidad);
  
      // Guardar el producto actualizado
      await producto.save();
  
      // Devolver el producto actualizado
      res.status(200).json(producto);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Error al eliminar el calidad", error });
    }
};

const eliminarColor = async (req, res) => {
    try {
      const { id, variante, calidad, color } = req.params; // ID del producto, variante y color
  
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

      // Buscar la calidad en el producto
      const calidadExistente = varianteExistente.calidades.id(calidad);
  
      if (!calidadExistente) {
        return res.status(404).json({ message: "Calidad no encontrada" });
      }
  
      // Eliminar el color de la variante
      calidadExistente.colores.pull(color);
  
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
      const { id, variante, calidad, color, talla } = req.params; // ID del producto, variante, color y talla
  
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

      // Buscar la calidad en el producto
      const calidadExistente = varianteExistente.calidades.id(calidad);
  
      if (!calidadExistente) {
        return res.status(404).json({ message: "Calidad no encontrada" });
      }
  
      // Buscar el color en la variante
      const colorExistente = calidadExistente.colores.id(color);
  
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
    agregarVariante,
    agregarCalidad,
    agregarColor,
    agregarTalla,
    eliminarVariante,
    eliminarCalidad,
    eliminarColor,
    eliminarTalla
};
