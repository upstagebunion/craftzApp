const Venta = require("../models/ventasModel");
const Producto = require("../models/productosModel");
const Extra = require("../models/extrasModel");

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
      .populate('productos.productoRef', 'nombre'); // Solo para referencia
    
    res.json(ventas);
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
      .populate('productos.productoRef', 'nombre');
      
    if (!venta) {
      return res.status(404).json({ msg: 'Venta no encontrada' });
    }
    res.json(venta);
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: 'Error al obtener la venta', error: error.message });
  }
};

exports.registrarPago = async (req, res) => {
  try {
    const { idVenta } = req.params;
    const { razon, monto, metodo } = req.body;

    // Validaciones básicas
    if (!monto || monto <= 0 || !metodo) {
      return res.status(400).json({ 
        success: false,
        message: "Monto y método de pago son requeridos" 
      });
    }

    // Obtener la venta
    const venta = await Venta.findById(idVenta);
    if (!venta) {
      return res.status(404).json({ 
        success: false,
        message: "Venta no encontrada" 
      });
    }

    // Verificar estado de la venta
    if (venta.estado === 'liquidado' || venta.estado === 'entregado') {
      return res.status(400).json({ 
        success: false,
        message: "No se pueden registrar pagos en ventas ya liquidadas" 
      });
    }

    // Calcular saldo pendiente antes del pago
    const saldoAnterior = venta.restante;
    
    // Validar que el pago no exceda el saldo
    if (monto > saldoAnterior) {
      return res.status(400).json({ 
        success: false,
        message: `El monto excede el saldo pendiente de $${saldoAnterior}`,
        saldoPendiente: saldoAnterior
      });
    }

    // Registrar el nuevo pago
    const nuevoPago = {
      razon: razon || `Abono ${venta.pagos.length + 1}`,
      monto,
      metodo
    };

    venta.pagos.push(nuevoPago);
    venta.restante = saldoAnterior - monto;

    // Verificar si la venta queda liquidada
    let liquidada = false;
    if (venta.restante <= 0) {
      // Liquidar la venta (actualizar inventario)
      for (const item of venta.productos) {
        const producto = await Producto.findById(item.productoRef);
        
        const variante = producto.variantes.id(item.variante.id);
        const color = variante.colores.id(item.color.id);
        
        if (item.talla?.id) {
          const talla = color.tallas.id(item.talla.id);
          talla.stock -= item.cantidad; // Restar la cantidad comprada
        } else {
          color.stock -= item.cantidad; // Restar la cantidad comprada
        }
        
        await producto.save();
      }

      venta.estado = 'liquidado';
      venta.fechaLiquidacion = new Date();
      liquidada = true;
    }

    await venta.save();

    res.json({
      success: true,
      message: liquidada 
        ? "Pago registrado y venta liquidada" 
        : "Pago registrado exitosamente",
      liquidada,
      venta: {
        _id: venta._id,
        total: venta.total,
        pagado: venta.total - venta.restante,
        restante: venta.restante,
        estado: venta.estado,
        pagos: venta.pagos
      }
    });

  } catch (error) {
    console.error("Error al registrar pago:", error);
    res.status(500).json({
      success: false,
      message: "Error al registrar el pago",
      error: error.message
    });
  }
};
