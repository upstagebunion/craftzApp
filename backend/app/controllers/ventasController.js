const mongoose = require("mongoose");
const Venta = require("../models/ventasModel");
const Cliente = require('../models/clienteModel');
const Producto = require("../models/productsRelatedModels/productosModel");
const Extra = require("../models/extrasModel");
const Cotizacion = require("../models/cotizacionModel");
const MovimientoInventario = require("../models/movimientosInventarioModel");

exports.crearVenta = async (req, res) => {
  try {
    console.log('Datos recibidos:', JSON.stringify(req.body, null, 2)); // Debug
    
    // Obtener los datos completos de los productos
    const productosConInfo = await Promise.all(req.body.productos.map(async item => {
      console.log('Procesando producto:', item.productoRef); // Debug
      
      const producto = await Producto.findById(item.productoRef);
      if (!producto) {
        throw new Error(`Producto con ID ${item.productoRef} no encontrado`);
      }
      
      console.log('Producto encontrado:', producto.nombre); // Debug
      
      // Buscar la variante específica
      const variante = producto.variantes.find(v => v._id.equals(item.variante));
      if (!variante) {
        throw new Error(`Variante con ID ${item.variante} no encontrada en el producto`);
      }
      
      console.log('Variante encontrada:', variante.tipo); // Debug

      // Buscar la calidad específica
      const calidad = variante.calidades.find(v => v._id.equals(item.calidad));
      if (!calidad) {
        throw new Error(`Variante con ID ${item.calidad} no encontrada en el producto`);
      }
      
      console.log('Calidad encontrada:', calidad.calidad); // Debug
      
      // Buscar el color específico
      const color = calidad.colores.find(c => c._id.equals(item.color.id));
      if (!color) {
        throw new Error(`Color con ID ${item.color.id} no encontrado en la variante`);
      }
      
      console.log('Color encontrado:', color.color); // Debug
      
      // Buscar talla si existe
      let talla = null;
      if (item.talla?.id) {
        talla = color.tallas.find(t => t._id.equals(item.talla.id));
        if (!talla) {
          throw new Error(`Talla con ID ${item.talla.id} no encontrada en el color`);
        }
        console.log('Talla encontrada:', talla.talla); // Debug
      }
      
      // Obtener extras si existen
      let extrasInfo = [];
      if (item.extras && item.extras.length > 0) {
        extrasInfo = await Promise.all(item.extras.map(async extraId => {
          const extra = await Extra.findById(extraId);
          if (!extra) {
            throw new Error(`Extra con ID ${extraId} no encontrado`);
          }
          return {
            id: extra._id,
            nombre: extra.nombre,
            unidad: extra.unidad,
            monto: extra.monto
          };
        }));
      }
      
      return {
        productoRef: item.productoRef,
        producto: {
          nombre: producto.nombre,
          descripcion: producto.descripcion,
          // ... otros campos que necesites
        },
        variante: {
          id: variante._id,
          tipo: variante.tipo ?? '',
        },
        calidad: {
          id: calidad._id,
          tipo: calidad.calidad ?? '',
        },
        color: {
          id: color._id,
          nombre: color.color ?? '',
          codigoHex: color.codigoHex ?? '#FFFFFF'
        },
        talla: talla ? {
          id: talla._id,
          nombre: talla.talla,
          codigo: talla.codigo
        } : null,
        extras: extrasInfo,
        precio: item.precio,
        precioFinal: item.precioFinal,
        descuento: item.descuento
      };
    }));
    
    const ventaData = {
      ...req.body,
      productos: productosConInfo
    };
    
    console.log('Datos finales de venta:', JSON.stringify(ventaData, null, 2)); // Debug
    
    const nuevaVenta = new Venta(ventaData);
    await nuevaVenta.save();
    
    res.status(201).json(nuevaVenta);
  } catch (error) {
    console.error('Error en crearVenta:', error);
    res.status(500).json({ 
      msg: 'Error al crear la venta', 
      error: error.message,
      stack: error.stack // Solo para desarrollo
    });
  }
};
  
exports.liquidarVenta = async (req, res) => {
  try {
    const venta = await Venta.findById(req.params.id);
    if (!venta) {
      return res.status(404).json({ msg: 'Venta no encontrada' });
    }
    
    // Marcar venta como liquidada
    venta.estado = 'liquidado';
    venta.fechaLiquidacion = new Date();
    await venta.save();

    const ventaActualizada = await Venta.findById(req.params.id)
      .populate('cliente')
      .populate('vendedor', 'nombre');
    
    res.json({ msg: 'Venta liquidada y stock actualizado', ventaActualizada });
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: 'Error al liquidar la venta', error: error.message });
  }
};

exports.obtenerVentas = async (req, res) => {
  try {
    const { fecha_inicio, fecha_fin } = req.query;
    
    // Si hay parámetros de fecha, hacer búsqueda por rango
    if (fecha_inicio && fecha_fin) {
      const startDate = new Date(fecha_inicio);
      const endDate = new Date(fecha_fin);
      endDate.setHours(23, 59, 59, 999);
      
      const ventas = await Venta.find({
        fechaCreacion: {
          $gte: startDate,
          $lte: endDate
        }
      })
      .populate('cliente')
      .populate('vendedor', 'nombre')
      .sort({ fechaCreacion: -1 });
      
      return res.status(200).json(ventas);
    }

    // Primero obtenemos las ventas no finalizadas (sin límite)
    const ventasNoFinalizadas = await Venta.find({
      $or: [
        { estado: { $in: ['pendiente', 'confirmado', 'preparado'] } },
        { 
          $and: [
            { estado: { $in: ['entregado', 'devuelto'] } },
            { liquidado: false }
          ]
        }
      ]
    })
    .populate('cliente')
    .populate('vendedor', 'nombre')
    .sort({ fechaCreacion: -1 }); // Ordenamos por fecha más reciente primero

    // Luego obtenemos las últimas 10 ventas finalizadas (entregadas/devueltas y liquidadas)
    const ventasFinalizadas = await Venta.find({
      estado: { $in: ['entregado', 'devuelto'] },
      liquidado: true
    })
    .populate('cliente')
    .populate('vendedor', 'nombre')
    .sort({ fechaCreacion: -1 }) // Ordenamos por fecha más reciente primero
    .limit(10); // Limitamos a 10 resultados

    // Combinamos los resultados (primero las no finalizadas, luego las finalizadas)
    const ventasCombinadas = [...ventasNoFinalizadas, ...ventasFinalizadas];

    res.status(200).json(ventasCombinadas);
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: 'Error al obtener las ventas', error: error.message });
  }
};

exports.obtenerVentasPorFecha = async (req, res) => {
  try {
    const { fecha_inicio, fecha_fin } = req.query;
    
    // Validar que vengan ambos parámetros
    if (!fecha_inicio || !fecha_fin) {
      return res.status(400).json({ msg: 'Debes proporcionar fecha_inicio y fecha_fin' });
    }
    
    // Convertir a objetos Date (asumiendo formato YYYY-MM-DD)
    const startDate = new Date(fecha_inicio);
    const endDate = new Date(fecha_fin);
    
    // Ajustar endDate para incluir todo el día final
    endDate.setHours(23, 59, 59, 999);
    
    // Consulta a la base de datos
    const ventas = await Venta.find({
      fechaCreacion: {
        $gte: startDate,
        $lte: endDate
      }
    })
    .populate('cliente')
    .populate('vendedor', 'nombre')
    .sort({ fechaCreacion: -1 }); // Ordenar por fecha más reciente primero
    
    res.status(200).json(ventas);
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: 'Error al obtener ventas por fecha', error: error.message });
  }
};

exports.obtenerVenta = async (req, res) => {
  const { id } = req.params;
  try {
    const venta = await Venta.findById(id)
      .populate('cliente')
      .populate('vendedor', 'nombre');
      
    if (!venta) {
      return res.status(404).json({ msg: 'Venta no encontrada' });
    }
    res.status(200).json(venta);
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: 'Error al obtener la venta', error: error.message });
  }
};

exports.agregarPago = async (req, res) => {
  try {
    const { id } = req.params;
    const { razon, monto, metodo } = req.body;

    // Validar ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'ID de venta no válido' });
    }

    // Validar datos del pago
    if (!monto || !metodo) {
      return res.status(400).json({ message: 'Faltan campos requeridos: razon, monto, metodo' });
    }

    if (monto <= 0) {
      return res.status(400).json({ message: 'El monto debe ser mayor a cero' });
    }

    const venta = await Venta.findById(id);
    if (!venta) {
      return res.status(404).json({ message: 'Venta no encontrada' });
    }

    // No permitir pagos si ya está liquidada
    if (venta.liquidado === true) {
      return res.status(400).json({ 
        message: 'No se pueden agregar pagos a una venta liquidada'
      });
    }

    // Calcular nuevo restante
    const nuevoRestante = venta.restante - monto;

    // Validar que el pago no exceda el restante
    if (nuevoRestante < 0) {
      return res.status(400).json({ 
        message: 'El pago excede el restante de la venta',
        restanteActual: venta.restante,
        montoIntento: monto
      });
    }

    // Crear nuevo pago
    const nuevoPago = {
      razon,
      monto,
      metodo
    };

    // Agregar pago y actualizar restante
    venta.pagos.push(nuevoPago);
    venta.restante = nuevoRestante;

    // Verificar si se liquidó completamente
    if (nuevoRestante === 0) {
      venta.liquidado = true;
      venta.fechaLiquidacion = new Date();
    }

    await venta.save();

    const ventaActualizada = await Venta.findById(id)
      .populate('cliente')
      .populate('vendedor', 'nombre');

    res.status(200).json({
      success: true,
      message: "Pago agregado correctamente",
      venta: ventaActualizada,
      liquidada: nuevoRestante === 0
    });

  } catch (error) {
    console.error("Error al agregar pago:", error);
    res.status(500).json({ 
      success: false,
      message: "Error al agregar pago",
      error: error.message 
    });
  }
};

exports.actualizarEstadoVenta = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const { id } = req.params;
    const { estado } = req.body;
    const usuarioId = req.userId;

    // Validaciones básicas
    if (!mongoose.Types.ObjectId.isValid(id)) {
      await session.abortTransaction();
      return res.status(400).json({ message: 'ID de venta no válido' });
    }

    const estadosPermitidos = ['pendiente', 'confirmado', 'preparado', 'entregado', 'devuelto'];
    if (!estadosPermitidos.includes(estado)) {
      await session.abortTransaction();
      return res.status(400).json({ 
        message: 'Estado no válido',
        estadosPermitidos: estadosPermitidos
      });
    }

    // Obtener venta con bloqueo para evitar condiciones de carrera
    const venta = await Venta.findById(id).session(session);
    if (!venta) {
      await session.abortTransaction();
      return res.status(404).json({ message: 'Venta no encontrada' });
    }

    // 1. Manejo para cuando se marca como ENTREGADO
    if (estado === 'entregado') {
      for (const item of venta.productos) {
        if (!item.productoRef) continue; // Saltar items temporales
        let infoProducto = '';
        
        const producto = await Producto.findById(item.productoRef).session(session);
        if (!producto) continue;

        // Actualizar stock
        if (item.variante?.id) {
          const variante = producto.variantes.id(item.variante.id);
          if (item.calidad?.id){
            const calidad = variante.calidades.id(item.calidad.id);
            if (item.color?.id) {
              const color = calidad.colores.id(item.color.id);
              
              if (item.talla?.id) {
                // Producto con talla
                const talla = color.tallas.id(item.talla.id);
                if (talla.stock < item.cantidad) {
                  await session.abortTransaction();
                  return res.status(400).json({
                    message: `Stock insuficiente para el producto ${producto.nombre} (talla ${item.talla.nombre})`
                  });
                }
                talla.stock -= item.cantidad;
                infoProducto = producto.nombre + ' | ' + variante.tipo + ' | ' + calidad.calidad + ' | ' + color.color + ' | ' + talla.talla;
              } else {
                // Producto sin talla pero con color
                if (color.stock < item.cantidad) {
                  await session.abortTransaction();
                  await session.endSession();
                  return res.status(400).json({
                    message: `Stock insuficiente para el producto ${producto.nombre} (color ${item.color.nombre})`
                  });
                }
                color.stock -= item.cantidad;
                infoProducto = producto.nombre + ' | ' + variante.tipo + ' | ' + calidad.calidad + ' | ' + color.color;
              }
            } 
          }
        }
        await producto.save();

        // Registrar movimiento de inventario
        const movimiento = new MovimientoInventario({
          producto: item.productoRef,
          variante: item.variante?.id,
          calidad: item.calidad?.id,
          color: item.color?.id,
          talla: item.talla?.id,
          productoInfo: infoProducto,
          tipo: 'salida',
          cantidad: item.cantidad,
          motivo: 'venta',
          referencia: {
            tipo: 'Venta',
            id: venta._id
          },
          usuario: usuarioId,
          comentarios: `Venta #${venta._id}`
        });
        await movimiento.save({ session });
      }

      const cliente = await Cliente.findById(venta.cliente).session(session);
      if (cliente) {
        cliente.compras = cliente.compras + 1;
        await cliente.save();
      }
    } else if (estado === 'devuelto') { // 2. Manejo para cuando se marca como DEVUELTO
      // Buscar movimientos de inventario relacionados a esta venta
      const movimientos = await MovimientoInventario.find({
        'referencia.id': venta._id,
        'referencia.tipo': 'Venta',
        motivo: 'venta'
      }).session(session);

      if (movimientos.length > 0) {
        // Si hay movimientos previos, actualizarlos a "pérdida"
        for (const movimiento of movimientos) {
          movimiento.motivo = 'perdida';
          movimiento.comentarios = `Producto devuelto pero no reintegrado a inventario (Venta #${venta._id})`;
          await movimiento.save({ session });
        }
      } else {
        // Si no hay movimientos previos, crear nuevos como pérdida
        for (const item of venta.productos) {
          if (!item.productoRef) continue;
          let infoProducto = '';

          const producto = await Producto.findById(item.productoRef).session(session);
          if (!producto) continue;

          // Actualizar stock
          if (item.variante?.id) {
            const variante = producto.variantes.id(item.variante.id);
            if (item.calidad?.id) {
                const calidad = variante.calidades.id(item.calidad.id);
                if (item.color?.id) {
                  const color = calidad.colores.id(item.color.id);
                  
                  if (item.talla?.id) {
                    // Producto con talla
                    const talla = color.tallas.id(item.talla.id);
                    if (talla.stock < item.cantidad) {
                      await session.abortTransaction();
                      return res.status(400).json({
                        message: `Stock insuficiente para el producto ${producto.nombre} (talla ${item.talla.nombre})`
                      });
                    }
                    talla.stock -= item.cantidad;
                    infoProducto = producto.nombre + ' | ' + variante.tipo + ' | ' + calidad.calidad + ' | ' + color.color + ' | ' + talla.talla;
                  } else {
                    // Producto sin talla pero con color
                    if (color.stock < item.cantidad) {
                      await session.abortTransaction();
                      return res.status(400).json({
                        message: `Stock insuficiente para el producto ${producto.nombre} (color ${item.color.nombre})`
                      });
                    }
                    color.stock -= item.cantidad;
                    infoProducto = producto.nombre + ' | ' + variante.tipo + ' | ' + calidad.calidad + ' | ' + color.color;
                  }
                } 
            }
          }
          await producto.save();
          
          const movimiento = new MovimientoInventario({
            producto: item.productoRef,
            variante: item.variante?.id,
            calidad: item.calidad?.id,
            color: item.color?.id,
            talla: item.talla?.id,
            productoInfo: infoProducto,
            tipo: 'salida',
            cantidad: item.cantidad,
            motivo: 'perdida',
            referencia: {
              tipo: 'Venta',
              id: venta._id
            },
            usuario: usuarioId,
            comentarios: `Producto devuelto marcado como pérdida (Venta #${venta._id})`
          });
          await movimiento.save({ session });
        }
      }

      const cliente = await Cliente.findById(venta.cliente).session(session);
      if (cliente) {
        cliente.compras = cliente.compras - 1;
        await cliente.save();
      }
    } else {
      const movimientos = await MovimientoInventario.find({
        'referencia.id': venta._id,
        'referencia.tipo': 'Venta'
      }).session(session);

      // Revertir cada movimiento encontrado
      for (const movimiento of movimientos) {
        const producto = await Producto.findById(movimiento.producto).session(session);
        if (!producto) continue;

        // Revertir el stock según la estructura del producto
        if (movimiento.talla) {
          // Producto con talla específica
          const variante = producto.variantes.id(movimiento.variante);
          const calidad = variante.calidades.id(movimiento.calidad);
          const color = calidad.colores.id(movimiento.color);
          const talla = color.tallas.id(movimiento.talla);
          talla.stock += movimiento.cantidad;
        } else if (movimiento.color) {
          // Producto con color pero sin talla
          const variante = producto.variantes.id(movimiento.variante);
          const calidad = variante.calidades.id(movimiento.calidad);
          const color = calidad.colores.id(movimiento.color);
          color.stock += movimiento.cantidad;
        } else {
          // Producto sin variantes específicas (no debería ocurrir)
          continue;
        }

        await producto.save();
        
        // Eliminar el movimiento de inventario
        await MovimientoInventario.deleteOne({ _id: movimiento._id }).session(session);
      }
      const cliente = await Cliente.findById(venta.cliente).session(session);
      if (cliente) {
        cliente.compras = cliente.compras - 1;
        await cliente.save();
      }
    }

    // Actualizar estado de la venta
    venta.estado = estado;
    
    await venta.save({ session });

    // Commit de la transacción
    await session.commitTransaction();
    
    // Obtener venta actualizada para respuesta
    const ventaActualizada = await Venta.findById(id)
      .populate('cliente')
      .populate('vendedor', 'nombre')
      .session(session);

    res.status(200).json({
      success: true,
      message: "Estado de venta actualizado",
      venta: ventaActualizada
    });

  } catch (error) {
    await session.abortTransaction();
    console.error("Error al actualizar estado de venta:", error);
    res.status(500).json({ 
      success: false,
      message: "Error al actualizar estado de venta",
      error: error.message 
    });
  } finally {
    session.endSession();
  }
};

exports.revertirACotizacion = async (req, res) => {
  try {
    const { id } = req.params;

    // Validar ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'ID de venta no válido' });
    }

    const venta = await Venta.findById(id);
    if (!venta) {
      return res.status(404).json({ message: 'Venta no encontrada' });
    }

    // Verificar que la venta no haya avanzado más allá de "pendiente"
    if (venta.estado !== 'pendiente') {
      return res.status(400).json({ 
        message: 'Solo se pueden revertir ventas en estado "pendiente"'
      });
    }

    // Crear nueva cotización con los datos de la venta
    const cotizacionData = {
      cliente: venta.cliente,
      productos: venta.productos,
      subTotal: venta.subTotal,
      total: venta.total,
      descuentoGlobal: venta.descuentoGlobal,
      ventaEnLinea: venta.ventaEnLinea,
      vendedor: venta.vendedor,
      expira: new Date(Date.now() + 15*24*60*60*1000) // 15 días
    };

    const cotizacion = new Cotizacion(cotizacionData);
    await cotizacion.save();

    await Venta.findByIdAndDelete(id);

    res.status(201).json({
      success: true,
      message: "Cotización recreada exitosamente y venta eliminada",
      cotizacion: cotizacion
    });

  } catch (error) {
    console.error("Error al revertir venta a cotización:", error);
    res.status(500).json({ 
      success: false,
      message: "Error al revertir venta a cotización",
      error: error.message 
    });
  }
};

exports.liquidarVenta = async (req, res) => {
  try {
    const { id } = req.params;

    // Validar ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'ID de venta no válido' });
    }

    const venta = await Venta.findById(id);
    if (!venta) {
      return res.status(404).json({ message: 'Venta no encontrada' });
    }

    // Verificar si ya está liquidada
    if (venta.liquidado === true) {
      return res.status(400).json({ 
        message: 'La venta ya está liquidada',
        fechaLiquidacion: venta.fechaLiquidacion
      });
    }

    // Verificar que el restante sea 0
    if (venta.restante > 0) {
      return res.status(400).json({ 
        message: 'No se puede liquidar una venta con restante pendiente',
        restanteActual: venta.restante
      });
    }

    // Liquidar venta
    venta.liquidado = true;
    venta.fechaLiquidacion = new Date();
    await venta.save();

    const ventaActualizada = await Venta.findById(id)
      .populate('cliente')
      .populate('vendedor', 'nombre');

    res.status(200).json({
      success: true,
      message: "Venta liquidada correctamente",
      venta: ventaActualizada
    });

  } catch (error) {
    console.error("Error al liquidar venta:", error);
    res.status(500).json({ 
      success: false,
      message: "Error al liquidar venta",
      error: error.message 
    });
  }
};

exports.obtenerResumenPagos = async (req, res) => {
  try {
    const { id } = req.params;

    // Validar ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'ID de venta no válido' });
    }

    const venta = await Venta.findById(id);
    if (!venta) {
      return res.status(404).json({ message: 'Venta no encontrada' });
    }

    // Calcular total pagado
    const totalPagado = venta.pagos.reduce((sum, pago) => sum + pago.monto, 0);

    res.status(200).json({
      success: true,
      vendedor: venta.vendedor,
      totalVenta: venta.total,
      totalPagado: totalPagado,
      restante: venta.restante,
      liquidada: venta.estado === 'liquidado',
      pagos: venta.pagos,
      fechaLiquidacion: venta.fechaLiquidacion
    });

  } catch (error) {
    console.error("Error al obtener resumen de pagos:", error);
    res.status(500).json({ 
      success: false,
      message: "Error al obtener resumen de pagos",
      error: error.message 
    });
  }
};