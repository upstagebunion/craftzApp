// controllers/cotizacionController.js
const mongoose = require("mongoose");
const Cotizacion = require('../models/cotizacionModel');
const Usuario = require('../models/usuariosModel');
const Venta = require('../models/ventasModel');
const Cliente = require('../models/clienteModel');
const Producto = require('../models/productosModel');
const Extra = require('../models/extrasModel');

const validarReferencias = async (cotizacionData) => {
  // Validar cliente
  if (!mongoose.Types.ObjectId.isValid(cotizacionData.cliente)) {
    throw new Error('ID de cliente no válido');
  }
  const clienteExiste = await Cliente.exists({ _id: cotizacionData.cliente });
  if (!clienteExiste) {
    throw new Error('Cliente no encontrado');
  }

  // Validar productos y referencias
  for (const producto of cotizacionData.productos) {
    if (!producto.esTemporal){
      if (!mongoose.Types.ObjectId.isValid(producto.productoRef)) {
        throw new Error(`ID de producto no válido: ${producto.productoRef}`);
      }
      const productoExiste = await Producto.exists({ _id: producto.productoRef });
      if (!productoExiste) {
        throw new Error('Producto no encontrado');
      }
    }

    // Validar extras del producto
    for (const extra of producto.extras) {
      if (!extra.esTemporal){
        if (!mongoose.Types.ObjectId.isValid(extra.extraRef)) {
          throw new Error(`ID de extra no válido: ${extra.extraRef}`);
        }
        const extraExistente = await Extra.exists({ _id: extra.extraRef });
        if (!extraExistente) {
          throw new Error('Extra no encontrado');
        }
      }
    }
  }

  return true;
};

exports.crearCotizacion = async (req, res) => {
  try {
    const cotizacionData = req.body;
    const vendedor = req.userId;

    // Validaciones básicas
    if (!cotizacionData.cliente || !cotizacionData.productos || cotizacionData.productos.length === 0) {
      return res.status(400).json({ 
        success: false,
        message: "Cliente y productos son requeridos" 
      });
    }

    const usuario = await Usuario.exists({ _id: vendedor });
    if (!usuario) {
      throw new Error('No se encontro al usuario vendedor.');
    }

    // Validar referencias (solo existencia, sin cargar datos)
    await validarReferencias(cotizacionData);

    // Crear la cotización con todos los datos recibidos
    const nuevaCotizacion = new Cotizacion({
      ...cotizacionData,
      // Asegurar fechas si no vienen
      vendedor: vendedor,
      fechaCreacion: cotizacionData.fechaCreacion || new Date(),
      expira: cotizacionData.expira || new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
      // Asegurar que no está convertida
      convertidaAVenta: null,
      activa: true
    });

    await nuevaCotizacion.save();

    const nuevaCotizacionConCliente = await Cotizacion.findById(nuevaCotizacion._id)
      .populate('cliente', 'nombre apellido_paterno telefono')
      .populate('vendedor', 'nombre');

    res.status(201).json({
      success: true,
      message: "Cotización creada exitosamente",
      cotizacion: nuevaCotizacionConCliente
    });

  } catch (error) {
    console.error("Error al crear cotización:", error);
    res.status(500).json({ 
      success: false,
      message: "Error al crear cotización",
      error: error.message 
    });
  }
};

exports.actualizarCotizacion = async (req, res) => {
  try {
    const { id } = req.params;
    const cotizacionData = req.body;
    const vendedor = req.userId;

    // Validar ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'ID de cotización no válido' });
    }

    // Verificar que existe y no está convertida
    const cotizacionExistente = await Cotizacion.findById(id);
    if (!cotizacionExistente) {
      return res.status(404).json({ message: 'Cotización no encontrada' });
    }
    if (cotizacionExistente.convertidaAVenta) {
      return res.status(400).json({ message: 'No se puede modificar una cotización convertida a venta' });
    }

    // Validar referencias (solo existencia)
    await validarReferencias(cotizacionData);

    // Actualizar
    const cotizacionActualizada = await Cotizacion.findByIdAndUpdate(
      id,
      { vendedor, ...cotizacionData },
      { new: true, runValidators: true }
    );

    const cotizacionActualizadaConCliente = await Cotizacion.findById(cotizacionActualizada._id)
      .populate('cliente', 'nombre apellido_paterno telefono')
      .populate('vendedor', 'nombre');

    res.status(200).json({
      success: true,
      message: "Cotización actualizada exitosamente",
      cotizacion: cotizacionActualizadaConCliente
    });

  } catch (error) {
    console.error("Error al actualizar cotización:", error);
    res.status(500).json({ 
      success: false,
      message: "Error al actualizar cotización",
      error: error.message 
    });
  }
};

exports.convertirAVenta = async (req, res) => {
  try {
    const { id } = req.params;

    // Validar ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'ID de cotización no válido' });
    }

    const cotizacion = await Cotizacion.findById(id);
    if (!cotizacion) {
      return res.status(404).json({ message: 'Cotización no encontrada' });
    }

    // Crear venta con todos los datos de la cotización
    const ventaData = {
      cliente: cotizacion.cliente,
      productos: cotizacion.productos,
      subTotal: cotizacion.subTotal,
      total: cotizacion.total,
      ventaEnLinea: cotizacion.ventaEnLinea,
      restante: cotizacion.total,
      vendedor: cotizacion.vendedor,
      estado: 'pendiente'
    };

    if (cotizacion.descuentoGlobal && 
        cotizacion.descuentoGlobal.tipo && 
        cotizacion.descuentoGlobal.valor) {
      ventaData.descuentoGlobal = {
        razon: cotizacion.descuentoGlobal.razon || undefined,
        tipo: cotizacion.descuentoGlobal.tipo,
        valor: cotizacion.descuentoGlobal.valor
      };
    }

    const venta = new Venta(ventaData);
    await venta.save();

    await Cotizacion.findByIdAndDelete(id);

    res.status(201).json({
      success: true,
      message: "Venta creada exitosamente y cotización eliminada",
      venta: venta
    });

  } catch (error) {
    console.error("Error al convertir cotización:", error);
    res.status(500).json({ 
      success: false,
      message: "Error al convertir cotización",
      error: error.message 
    });
  }
};

exports.obtenerCotizacion = async (req, res) => {
  try {
    const cotizacion = await Cotizacion.findById(req.params.id)
      .populate('cliente', 'nombre apellido_paterno telefono')
      .populate('vendedor', 'nombre')
      .populate('convertidaAVenta', 'total estado');

    if (!cotizacion) {
      return res.status(404).json({ message: 'Cotización no encontrada' });
    }

    res.json({
      success: true,
      cotizacion: cotizacion
    });

  } catch (error) {
    console.error("Error al obtener cotización:", error);
    res.status(500).json({ 
      success: false,
      message: "Error al obtener cotización",
      error: error.message 
    });
  }
};

exports.listarCotizaciones = async (req, res) => {
  try {
    const { cliente, estado } = req.query;
    const filtro = { activa: true };

    if (cliente) {
      filtro.cliente = cliente;
    }

    if (estado === 'activas') {
      filtro.expira = { $gte: new Date() };
      filtro.convertidaAVenta = null;
    } else if (estado === 'convertidas') {
      filtro.convertidaAVenta = { $ne: null };
    } else if (estado === 'expiradas') {
      filtro.expira = { $lt: new Date() };
      filtro.convertidaAVenta = null;
    }

    const cotizaciones = await Cotizacion.find(filtro)
      .populate('cliente', 'nombre apellido_paterno')
      .populate('vendedor', 'nombre')
      .sort({ fechaCreacion: -1 });

    res.status(200).json({
      success: true,
      count: cotizaciones.length,
      cotizaciones: cotizaciones
    });

  } catch (error) {
    console.error("Error al listar cotizaciones:", error);
    res.status(500).json({ 
      success: false,
      message: "Error al listar cotizaciones",
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
      .populate('vendedor', 'nombre')
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

exports.eliminarCotizacion = async (req, res) => {
  try {
    const cotizacionEliminada = await Cotizacion.findByIdAndDelete(req.params.id);
    
    if (!cotizacionEliminada) {
      return res.status(404).json({ message: "Cotizacion no encontrada" });
    }
    
    res.status(200).json({ message: "Cotizacion eliminado correctamente", cotizacion: cotizacionEliminada });
  } catch (error) {
    console.error("Error al eliminar la cotizacion:", error);
    res.status(500).json({ message: "Error interno del servidor", error: error.message });
  }
};
