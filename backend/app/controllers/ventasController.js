const mongoose = require("mongoose");
const Venta = require("../models/ventasModel");
const Producto = require("../models/productosModel");
const Extra = require("../models/extrasModel");
const Cotizacion = require("../models/cotizacionModel");

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
      
      // Buscar el color específico
      const color = variante.colores.find(c => c._id.equals(item.color.id));
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
          tipo: variante.tipo,
        },
        color: {
          id: color._id,
          nombre: color.color
        },
        talla: talla ? {
          id: talla._id,
          nombre: talla.talla
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
    
    // Actualizar el stock para cada producto
    for (const item of venta.productos) {
      const producto = await Producto.findById(item.productoRef);
      
      // Encontrar la variante, color y talla exactos
      const variante = producto.variantes.id(item.variante.id);
      const color = variante.colores.id(item.color.id);
      
      if (item.talla?.id) {
        // Producto con talla
        const talla = color.tallas.id(item.talla.id);
        talla.stock -= 1; // O la cantidad vendida
      } else {
        // Producto sin talla
        color.stock -= 1; // O la cantidad vendida
      }
      
      await producto.save();
    }
    
    // Marcar venta como liquidada
    venta.estado = 'liquidado';
    venta.fechaLiquidacion = new Date();
    await venta.save();
    
    res.json({ msg: 'Venta liquidada y stock actualizado', venta });
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: 'Error al liquidar la venta', error: error.message });
  }
};

exports.obtenerVentas = async (req, res) => {
  try {
    const ventas = await Venta.find()
      .populate('cliente')
    
    res.status(200).json(ventas);
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: 'Error al obtener las ventas', error: error.message });
  }
};

exports.obtenerVenta = async (req, res) => {
  const { id } = req.params;
  try {
    const venta = await Venta.findById(id)
      .populate('cliente')
      
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
    if (!razon || !monto || !metodo) {
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
    if (venta.estado === 'liquidado') {
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
      venta.estado = 'liquidado';
      venta.fechaLiquidacion = new Date();
    }

    await venta.save();

    const ventaActualizada = await Venta.findById(id)
      .populate('cliente')

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
  try {
    const { id } = req.params;
    const { estado } = req.body;

    // Validar ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'ID de venta no válido' });
    }

    // Validar estado
    const estadosPermitidos = ['pendiente', 'confirmado', 'preparado', 'entregado', 'devuelto'];
    if (!estadosPermitidos.includes(estado)) {
      return res.status(400).json({ 
        message: 'Estado no válido',
        estadosPermitidos: estadosPermitidos
      });
    }

    const venta = await Venta.findById(id);
    if (!venta) {
      return res.status(404).json({ message: 'Venta no encontrada' });
    }

    // No permitir cambiar estado si ya está liquidada
    if (venta.estado === 'liquidado') {
      return res.status(400).json({ 
        message: 'No se puede modificar el estado de una venta liquidada'
      });
    }

    // Actualizar estado
    venta.estado = estado;
    await venta.save();

    res.status(200).json({
      success: true,
      message: "Estado de venta actualizado",
      venta: venta
    });

  } catch (error) {
    console.error("Error al actualizar estado de venta:", error);
    res.status(500).json({ 
      success: false,
      message: "Error al actualizar estado de venta",
      error: error.message 
    });
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
    if (venta.estado === 'liquidado') {
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
    venta.estado = 'liquidado';
    venta.fechaLiquidacion = new Date();
    await venta.save();

    res.status(200).json({
      success: true,
      message: "Venta liquidada correctamente",
      venta: venta
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