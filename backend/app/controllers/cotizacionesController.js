// controllers/cotizacionController.js
const Cotizacion = require('../models/cotizacionModel');
const Venta = require('../models/ventasModel');
const Producto = require('../models/productosModel');
const Extra = require('../models/extrasModel');

exports.crearCotizacion = async (req, res) => {
  try {
    const { cliente, productos, descuentoGlobal, total, subTotal} = req.body;

    // Validaciones básicas
    if (!cliente || !productos || productos.length === 0 || !total || !subTotal) {
      return res.status(400).json({ 
        success: false,
        message: "Cliente, productos, total y subtotal son requeridos" 
      });
    }

    // Procesar cada producto
    const productosProcesados = await Promise.all(productos.map(async item => {
      const producto = await Producto.findById(item.productoRef);
      if (!producto) {
        throw new Error(`Producto con ID ${item.productoRef} no encontrado`);
      }

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
          descripcion: producto.descripcion
        },
        variante: {
          id: variante._id,
          tipo: variante.tipo
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
        cantidad: item.cantidad || 1,
        precio: item.precio,
        precioFinal: item.precioFinal,
        ventaEnLinea: item.ventaEnLinea || false,
        descuento: item.descuento
      };
    }));

    const nuevaCotizacion = new Cotizacion({
      cliente,
      subTotal,
      total,
      productos: productosProcesados,
      descuentoGlobal,
      expira: new Date(Date.now() + 15*24*60*60*1000) // 15 días
    });

    await nuevaCotizacion.save();

    res.status(201).json({
      success: true,
      data: nuevaCotizacion,
      message: "Cotización creada exitosamente"
    });

  } catch (error) {
    console.error("Error al crear cotización:", error);
    res.status(500).json({ 
      success: false,
      message: "Error al crear la cotización",
      error: error.message 
    });
  }
};

exports.convertirCotizacionAVenta = async (req, res) => {
  try {
    const { cotizacionId } = req.params;

    // 1. Validar la cotización
    const cotizacion = await Cotizacion.findById(cotizacionId);
    if (!cotizacion) {
      return res.status(404).json({ success: false, message: "Cotización no encontrada" });
    }

    if (cotizacion.convertidaAVenta) {
      return res.status(400).json({ 
        success: false, 
        message: "Esta cotización ya fue convertida a venta",
        ventaId: cotizacion.convertidaAVenta
      });
    }

    if (new Date(cotizacion.expira) < new Date()) {
      return res.status(400).json({ 
        success: false, 
        message: "La cotización ha expirado y no puede convertirse en venta" 
      });
    }

    // 2. Crear la venta a partir de la cotización
    const ventaData = {
      cliente: cotizacion.cliente,
      subTotal: cotizacion.subTotal,
      total: cotizacion.total,
      productos: cotizacion.productos.map(p => ({
        productoRef: p.productoRef,
        producto: p.producto,
        variante: p.variante,
        color: p.color,
        talla: p.talla,
        extras: p.extras,
        cantidad: p.cantidad,
        descuento: p.descuento,
        precio: p.precio,
        precioFinal: p.precioFinal
      })),
      restante: cotizacion.total,
      ventaEnLinea: cotizacion.ventaEnLinea,
      descuentoGlobal: cotizacion.descuentoGlobal,
      origenCotizacion: cotizacion._id
    };

    const nuevaVenta = new Venta(ventaData);
    await nuevaVenta.save();

    // 3. Marcar la cotización como convertida
    cotizacion.convertidaAVenta = nuevaVenta._id;
    await cotizacion.save();

    res.status(201).json({
      success: true,
      message: "Cotización convertida a venta exitosamente",
      venta: nuevaVenta,
      cotizacionId: cotizacion._id
    });

  } catch (error) {
    console.error("Error al convertir cotización a venta:", error);
    res.status(500).json({
      success: false,
      message: "Error al convertir la cotización",
      error: error.message
    });
  }
};

exports.obtenerCotizacionesActivas = async (req, res) => {
  try {
    const hoy = new Date();
    
    const cotizaciones = await Cotizacion.find({
      convertidaAVenta: null, // No convertidas a venta
      expira: { $gt: hoy } // No expiradas
    })
    .populate('cliente', 'nombre correo telefono')
    .sort({ fechaCreacion: -1 }); // Más recientes primero

    res.json({
      success: true,
      count: cotizaciones.length,
      data: cotizaciones,
      message: cotizaciones.length > 0 
        ? "Cotizaciones activas encontradas" 
        : "No hay cotizaciones activas"
    });
  } catch (error) {
    console.error("Error al obtener cotizaciones activas:", error);
    res.status(500).json({
      success: false,
      message: "Error al obtener las cotizaciones",
      error: error.message
    });
  }
};

exports.obtenerCotizacionPorId = async (req, res) => {
  try {
    const cotizacion = await Cotizacion.findById(req.params.id)
      .populate('cliente', 'nombre correo telefono direccion')
      .populate('convertidaAVenta', 'total estado');

    if (!cotizacion) {
      return res.status(404).json({
        success: false,
        message: "Cotización no encontrada"
      });
    }

    // Calcular días restantes si no está expirada
    const hoy = new Date();
    const expirada = cotizacion.expira < hoy;
    const diasRestantes = expirada 
      ? 0 
      : Math.ceil((cotizacion.expira - hoy) / (1000 * 60 * 60 * 24));

    res.json({
      success: true,
      data: {
        ...cotizacion.toObject(),
        expirada,
        diasRestantes,
        puedeConvertir: !expirada && !cotizacion.convertidaAVenta
      }
    });
  } catch (error) {
    console.error("Error al obtener cotización:", error);
    res.status(500).json({
      success: false,
      message: "Error al obtener la cotización",
      error: error.message
    });
  }
};

exports.obtenerCotizacionesFiltradas = async (req, res) => {
  try {
    const { cliente, fechaInicio, fechaFin, expiradas, convertidas } = req.query;
    const hoy = new Date();
    
    const filtro = {};
    
    // Filtro por cliente
    if (cliente) {
      filtro.cliente = cliente;
    }
    
    // Filtro por rango de fechas
    if (fechaInicio || fechaFin) {
      filtro.fechaCreacion = {};
      if (fechaInicio) filtro.fechaCreacion.$gte = new Date(fechaInicio);
      if (fechaFin) filtro.fechaCreacion.$lte = new Date(fechaFin);
    }
    
    // Filtro por estado de conversión
    if (convertidas === 'true') {
      filtro.convertidaAVenta = { $ne: null };
    } else if (convertidas === 'false') {
      filtro.convertidaAVenta = null;
    }
    
    // Filtro por expiración
    if (expiradas === 'true') {
      filtro.expira = { $lt: hoy };
    } else if (expiradas === 'false') {
      filtro.expira = { $gte: hoy };
    }
    
    const cotizaciones = await Cotizacion.find(filtro)
      .populate('cliente', 'nombre')
      .populate('convertidaAVenta', 'estado')
      .sort({ fechaCreacion: -1 });
    
    res.json({
      success: true,
      count: cotizaciones.length,
      data: cotizaciones
    });
    
  } catch (error) {
    console.error("Error al obtener cotizaciones filtradas:", error);
    res.status(500).json({
      success: false,
      message: "Error al obtener cotizaciones",
      error: error.message
    });
  }
};
