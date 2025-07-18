// controllers/reportesController.js
const ExcelJS = require('exceljs');
const moment = require('moment');
const Venta = require('../models/ventasModel');
const Producto = require('../models/productsRelatedModels/productosModel');
const Cotizacion = require('../models/cotizacionModel');
const Cliente = require('../models/clienteModel');
const MovimientoInventario = require('../models/movimientosInventarioModel');
const handlebars = require('handlebars');
const fs = require('fs').promises;
const fss = require('fs');
const path = require('path');

exports.generarReporteVentasPDF = (tipo) => async (req, res) => {
  try {
    // Configurar fechas según el tipo de reporte
    let fechaInicio, fechaFin;
    const hoy = new Date();
    
    if (tipo === 'diario') {
      fechaInicio = moment().startOf('day').toDate();
      fechaFin = moment().endOf('day').toDate();
    } else if (tipo === 'semanal') {
      fechaInicio = moment().startOf('week').toDate();
      fechaFin = moment().endOf('week').toDate();
    } else { // mensual
      fechaInicio = moment().startOf('month').toDate();
      fechaFin = moment().endOf('month').toDate();
    }
    
    // Consultar ventas en el rango de fechas
    const ventas = await Venta.find({
      fechaCreacion: { $gte: fechaInicio, $lte: fechaFin },
      estado: { $ne: 'devuelto' }
    }).populate('cliente vendedor').sort({ fechaCreacion: 1 });
    
    // Calcular estadísticas
    const totalVentas = ventas.reduce((sum, venta) => sum + (venta.total || 0), 0);
    const cantidadVentas = ventas.length;
    const promedioVenta = cantidadVentas > 0 ? totalVentas / cantidadVentas : 0;

    // Procesar datos para la plantilla
    const ventasFormateadas = ventas.map(venta => ({
      fecha: moment(venta.fechaCreacion).format('DD/MM/YY HH:mm'),
      cliente: venta.cliente?.nombre || 'Cliente no especificado',
      vendedor: venta.vendedor?.nombre || 'Vendedor no especificado',
      total: (venta.total || 0).toFixed(2),
      estado: venta.estado || 'pendiente',
      id: venta._id.toString().substring(18, 24)
    }));

    // Cargar plantilla HTML
    const templateHtml = await fs.readFile('app/templates/reporte-ventas.html', 'utf8');
    
    // Registrar helpers necesarios
    handlebars.registerHelper('formatMoney', function(value) {
      if (typeof value !== 'number' || isNaN(value)) return '$0.00';
      return `$${value.toFixed(2)}`;
    });

    const template = handlebars.compile(templateHtml);

    // Preparar logo en base64
    let logoBase64 = '';
    try {
      const logoPath = path.resolve('public/images/logo.png');
      logoBase64 = fss.readFileSync(logoPath, 'base64');
    } catch (e) {
      console.warn('No se pudo cargar el logo:', e.message);
    }

    // Preparar datos para la plantilla
    const data = {
      titulo: `Reporte de Ventas ${tipo.charAt(0).toUpperCase() + tipo.slice(1)}`,
      periodo: `Del ${moment(fechaInicio).format('LL')} al ${moment(fechaFin).format('LL')}`,
      fechaGeneracion: moment().format('LLL'),
      logoUrl: logoBase64 ? `data:image/png;base64,${logoBase64}` : null,
      resumen: {
        totalVentas: totalVentas.toFixed(2),
        cantidadVentas,
        promedioVenta: promedioVenta.toFixed(2)
      },
      ventas: ventasFormateadas,
      tipoReporte: tipo
    };

    // Renderizar HTML
    const html = template(data);
    
    // Enviar el HTML como respuesta
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (error) {
    console.error('Error al generar el reporte:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error al generar el reporte de ventas',
      error: error.message 
    });
  }
};

exports.getVentasCountToday = async (req, res) => {
  try {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0); // Establece la hora al inicio del día (00:00:00.000)

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999); // Establece la hora al final del día (23:59:59.999)

    const count = await Venta.countDocuments({
      fechaCreacion: {
        $gte: startOfDay,
        $lte: endOfDay
      },
      estado: { $ne: 'devuelto' }
    });

    res.status(200).json({
      success: true,
      message: 'Conteo de ventas de hoy obtenido exitosamente.',
      count: count
    });
  } catch (error) {
    console.error('Error al obtener el conteo de ventas de hoy:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor al obtener el conteo de ventas.',
      error: error.message
    });
  }
};

exports.getProductosCount = async (req, res) => {
  try {
    const count = await Producto.countDocuments();

    res.status(200).json({
      success: true,
      message: 'Conteo de productos de hoy obtenido exitosamente.',
      count: count
    });
  } catch (error) {
    console.error('Error al obtener el conteo de productos:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor al obtener el conteo de productos.',
      error: error.message
    });
  }
};

exports.getClientesCount = async (req, res) => {
  try {
    const count = await Cliente.countDocuments();

    res.status(200).json({
      success: true,
      message: 'Conteo de clientes de hoy obtenido exitosamente.',
      count: count
    });
  } catch (error) {
    console.error('Error al obtener el conteo de clientes:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor al obtener el conteo de clientes.',
      error: error.message
    });
  }
};

exports.getMonthlyRevenueLastMonth = async (req, res) => {
  try {
    //El doa de hoy hasta el fin del dia
    const now = new Date();
    now.setHours(23, 59, 59, 999);

    //un mes exacto antes
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1); // Resta un mes a la fecha actual
    oneMonthAgo.setHours(0, 0, 0, 0);

    // Usamos el pipeline de agregación de MongoDB para sumar los 'total'
    const result = await Venta.aggregate([
      {
        $match: {
          fechaCreacion: {
            $gte: oneMonthAgo,
            $lt: now // Usamos $lt para incluir todas las ventas hasta el final del mes anterior
          },
          estado: { $ne: 'devuelto' }
        }
      },
      {
        $group: {
          _id: null, // Agrupa todos los documentos que coinciden
          totalRevenue: { $sum: '$total' } // Suma el campo 'total' de cada venta
        }
      }
    ]);

    // Si hay resultados, tomamos el total, si no, es 0
    const totalRevenue = result.length > 0 ? result[0].totalRevenue : 0;

    res.status(200).json({
      success: true,
      message: 'Ingresos del mes pasado obtenidos exitosamente.',
      totalRevenue: totalRevenue
    });
  } catch (error) {
    console.error('Error al obtener los ingresos del mes pasado:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor al obtener los ingresos.',
      error: error.message
    });
  }
};

exports.getVentasStatsByDateRange = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    let matchQuery = {};

    // Validar y construir el rango de fechas
    if (startDate || endDate) {
      matchQuery.fechaCreacion = {};
      if (startDate) {
        const start = new Date(startDate);
        // Asegurarse de que el inicio del día sea correcto
        start.setHours(0, 0, 0, 0);
        matchQuery.fechaCreacion.$gte = start;
      }
      if (endDate) {
        const end = new Date(endDate);
        // Asegurarse de que el final del día sea correcto
        end.setHours(23, 59, 59, 999);
        matchQuery.fechaCreacion.$lte = end;
      }
    }

    const stats = await Venta.aggregate([
      {
        $match: matchQuery // Filtra por el rango de fechas si se proporciona
      },
      {
        $group: {
          _id: null, // Agrupa todos los documentos coincidentes
          count: { $sum: 1 }, // Cuenta el número de documentos
          totalRevenue: { $sum: '$total' } // Suma el campo 'total'
        }
      }
    ]);

    // Si no hay ventas en el rango, los valores serán 0
    const conteo = stats.length > 0 ? stats[0].count : 0;
    const ingresosTotales = stats.length > 0 ? stats[0].totalRevenue : 0;

    res.status(200).json({
      success: true,
      message: 'Estadísticas de ventas por rango de fechas obtenidas exitosamente.',
      conteo: conteo,
      ingresosTotales: ingresosTotales
    });

  } catch (error) {
    console.error('Error al obtener estadísticas de ventas por rango de fechas:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor al obtener estadísticas de ventas.',
      error: error.message
    });
  }
};

exports.generarReporteInventarioPDF = (tipo, filtros = {}) => async (req, res) => {
  try {
    // Configurar fechas según el tipo de reporte
    let fechaInicio, fechaFin;
    const hoy = new Date();
    
    // Aplicar filtros de fecha
    if (tipo === 'personalizado' && filtros.fechaInicio && filtros.fechaFin) {
      fechaInicio = moment(filtros.fechaInicio).startOf('day').toDate();
      fechaFin = moment(filtros.fechaFin).endOf('day').toDate();
    } else if (tipo === 'diario') {
      fechaInicio = moment().startOf('day').toDate();
      fechaFin = moment().endOf('day').toDate();
    } else if (tipo === 'semanal') {
      fechaInicio = moment().startOf('week').toDate();
      fechaFin = moment().endOf('week').toDate();
    } else { // mensual por defecto
      fechaInicio = moment().startOf('month').toDate();
      fechaFin = moment().endOf('month').toDate();
    }

    // Construir query basado en filtros
    const query = {
      fecha: { $gte: fechaInicio, $lte: fechaFin }
    };

    // Aplicar filtros adicionales
    if (filtros.tipoMovimiento) {
      query.tipo = filtros.tipoMovimiento; // 'entrada' o 'salida'
    }
    
    if (filtros.motivo && filtros.motivo.length > 0) {
      query.motivo = { $in: filtros.motivo }; // ['compra', 'venta', etc.]
    }

    // Consultar movimientos
    const movimientos = await MovimientoInventario.find(query)
      .sort({ fecha: -1 })
      .populate('usuario', 'nombre')
      .lean();

    // Crear PDF
    const totalEntradas = movimientos.filter(m => m.tipo === 'entrada').reduce((sum, m) => sum + m.cantidad, 0);
    const totalSalidas = movimientos.filter(m => m.tipo === 'salida').reduce((sum, m) => sum + m.cantidad, 0);
    const saldo = totalEntradas - totalSalidas;

    const motivos = {
      compra: movimientos.filter(m => m.motivo === 'compra').length,
      venta: movimientos.filter(m => m.motivo === 'venta').length,
      ajuste: movimientos.filter(m => m.motivo === 'ajuste').length,
      devolucion: movimientos.filter(m => m.motivo === 'devolucion').length,
      perdida: movimientos.filter(m => m.motivo === 'perdida').length
    };

    // 1. Cargar plantilla HTML
    const templateHtml = await fs.readFile('app/templates/reporte-inventario.html', 'utf8');
    
    // 2. Compilar con Handlebars
    const template = handlebars.compile(templateHtml);

    const logoPath = path.resolve('public/images/logo.png');
    const logoBase64 = fss.readFileSync(logoPath, 'base64');
    
    // 3. Preparar datos para la plantilla
    const data = {
      titulo: `Reporte de Inventario ${tipo.charAt(0).toUpperCase() + tipo.slice(1)}`,
      fechaGeneracion: moment().format('LLL'),
      periodo: `Del ${moment(fechaInicio).format('LL')} al ${moment(fechaFin).format('LL')}`,
      logoUrl: `data:image/png;base64,${logoBase64}`,
      // Estadísticas
      resumen: {
        totalEntradas,
        totalSalidas,
        saldo,
        totalMovimientos: movimientos.length
      },
      
      // Distribución por motivos
      motivos: Object.entries(motivos)
        .filter(([_, cantidad]) => cantidad > 0)
        .map(([motivo, cantidad]) => ({
          nombre: motivo.charAt(0).toUpperCase() + motivo.slice(1),
          cantidad,
          porcentaje: ((cantidad / movimientos.length) * 100).toFixed(1)
        })),
      
      // Detalle de movimientos
      movimientos: movimientos.map(m => ({
        fecha: moment(m.fecha).format('DD/MM/YY HH:mm'),
        producto: m.productoInfo,
        cantidad: m.cantidad,
        tipo: m.tipo === 'entrada' ? 'Entrada' : 'Salida',
        tipoClase: m.tipo === 'entrada' ? 'entrada' : 'salida',
        motivo: m.motivo.charAt(0).toUpperCase() + m.motivo.slice(1),
        usuario: m.usuario?.nombre || 'Sistema'
      }))
    };

    // 4. Renderizar HTML
    const html = template(data);
    
    // Enviar el HTML como respuesta
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (error) {
    console.error('Error al generar reporte de inventario:', error);
    res.status(500).json({ error: 'Error al generar el reporte', detalles: error.message });
  }
};

exports.generarReciboCotizacionPDF = async (req, res) => {
  try{
    const { id } = req.params;

    const cotizacion = await Cotizacion.findById(id)
      .populate('cliente')
      .populate('vendedor')
      .exec();

    if (!cotizacion) {
      return res.status(404).json({
        success: false,
        message: 'Cotizacion no encontrada'
      });
    }

    if (!cotizacion.productos || cotizacion.productos.length === 0) {
      return res.status(400).json({ 
        success: false,
        message: 'La cotización no contiene productos' 
      });
    }

    const clienteInfo = {
      nombre: cotizacion.cliente?.nombre || 'Cliente no especificado',
      contacto: cotizacion.cliente?.telefono || 'Sin contacto',
      direccion: cotizacion.cliente?.direccion || 'Sin dirección'
    };

    const vendedorInfo = {
      nombre: cotizacion.vendedor?.nombre || 'Vendedor no especificado'
    };

    const formatMoney = (value) => {
      if (typeof value !== 'number' || isNaN(value)) return '$0.00';
      return `${value.toFixed(2)}`;
    };

    // 1. Calcular resumen de la cotización
    const resumen = {
      subTotal: cotizacion.subTotal || 0,
      total: cotizacion.total || 0,
      totalProductos: cotizacion.productos?.length || 0,
      totalItems: cotizacion.productos?.reduce((sum, p) => sum + (p.cantidad || 0), 0) || 0,
      descuentoGlobal: null
    };

    if (cotizacion.descuentoGlobal && 
        cotizacion.descuentoGlobal.valor !== undefined && 
        cotizacion.descuentoGlobal.valor !== null) {
      
      const descGlobal = cotizacion.descuentoGlobal;
      const valor = parseFloat(descGlobal.valor) || 0;
      
      resumen.descuentoGlobal = {
        razon: descGlobal.razon || 'Descuento aplicado',
        valor: descGlobal.tipo === 'porcentaje' ? 
          `${valor}%` : 
          formatMoney(valor),
        tipo: descGlobal.tipo
      };
    }

    // 2. Procesar productos con validaciones
    const productos = cotizacion.productos.map(p => {
      // Precios con valores por defecto
      const precioBase = parseFloat(p.precioBase) || 0;
      const precio = parseFloat(p.precio) || precioBase;
      const precioFinal = parseFloat(p.precioFinal) || (precio * (p.cantidad || 1));
      
      const producto = {
        nombre: p.producto?.nombre || 'Producto no especificado',
        descripcion: p.producto?.descripcion || '',
        cantidad: p.cantidad || 1,
        precioBase: formatMoney(precioBase),
        precioUnitario: formatMoney(precio),
        precioFinal: formatMoney(precioFinal),
        variante: '',
        extras: [],
        descuento: null
      };

      // Manejo de variantes
      if (p.variante) {
        producto.variante = p.variante.nombreCompleto || 
          [p.variante.tipo, p.calidad?.calidad, p.color?.nombre, p.talla?.nombre]
            .filter(Boolean).join(' / ');
      }

      // Manejo de extras
      if (Array.isArray(p.extras)) {
        producto.extras = p.extras.map(e => {
          const extra = {
            nombre: e.nombre || 'Extra no especificado',
            precio: formatMoney(parseFloat(e.monto)) || 0,
            cantidad: '1 pieza'
          };

          if (e.unidad === 'cm_cuadrado' && e.anchoCm && e.largoCm) {
            const area = (parseFloat(e.anchoCm) || 0) * (parseFloat(e.largoCm) || 0);
            extra.cantidad = `${e.anchoCm}cm × ${e.largoCm}cm`;
          }

          return extra;
        });
      }

      // Manejo de descuentos por producto
      if (p.descuento && p.descuento.valor !== undefined && p.descuento.valor !== null) {
        const valor = parseFloat(p.descuento.valor) || 0;
        producto.descuento = {
          razon: p.descuento.razon || 'Descuento aplicado',
          valor: p.descuento.tipo === 'porcentaje' ? 
            `${valor}%` : 
            formatMoney(valor),
          precioAntesDescuento: p.descuento.tipo === 'porcentaje'
            ? precio / (1 - (valor/100))
            : precio + valor
        };
      }

      return producto;
    });

    // 3. Cargar plantilla HTML
    const templateHtml = await fs.readFile('app/templates/recibo-cotizacion.html', 'utf8');
    const template = handlebars.compile(templateHtml);

    // 4. Preparar logo en base64 (con manejo de errores)
    let logoBase64 = '';
    try {
      const logoPath = path.resolve('public/images/logo.png');
      logoBase64 = fss.readFileSync(logoPath, 'base64');
    } catch (e) {
      console.warn('No se pudo cargar el logo:', e.message);
    }

    // 5. Preparar datos para la plantilla
    const data = {
      titulo: `Cotización #${cotizacion._id.toString().substring(18, 24)}`,
      fechaGeneracion: moment().format('LLL'),
      fechaValidez: moment(cotizacion.expira).format('LL'),
      logoUrl: logoBase64 ? `data:image/png;base64,${logoBase64}` : null,
      cliente: clienteInfo,
      vendedor: vendedorInfo,
      resumen,
      productos,
      nota: "Esta cotización es válida hasta la fecha indicada. Los precios pueden variar según disponibilidad de materiales."
    };

    // 6. Renderizar HTML
    const html = template(data);
    
    // Enviar el HTML como respuesta
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (error) {
    console.error('Error al generar reporte de inventario:', error);
    res.status(500).json({ error: 'Error al generar el reporte', detalles: error.message });
  }
};

exports.generarReciboVentaPDF = async (req, res) => {
  try {
    const { id } = req.params;

    // Obtener la venta con los datos poblados
    const venta = await Venta.findById(id)
      .populate('cliente')
      .populate('vendedor')
      .exec();

    // Validar que la venta exista
    if (!venta) {
      return res.status(404).json({
        success: false,
        message: 'Venta no encontrada'
      });
    }

    // Validar que tenga productos
    if (!venta.productos || venta.productos.length === 0) {
      return res.status(400).json({ 
        success: false,
        message: 'La venta no contiene productos' 
      });
    }

    // Información del cliente con valores por defecto
    const clienteInfo = {
      nombre: venta.cliente?.nombre || 'Cliente no especificado',
      contacto: venta.cliente?.telefono || 'Sin contacto',
      direccion: venta.cliente?.direccion || 'Sin dirección'
    };

    // Información del vendedor con valores por defecto
    const vendedorInfo = {
      nombre: venta.vendedor?.nombre || 'Vendedor no especificado'
    };

    // Función para formatear valores monetarios
    const formatMoney = (value) => {
      if (typeof value !== 'number' || isNaN(value)) return '0.00';
      return value.toFixed(2);
    };

    // Calcular resumen de la venta
    const resumen = {
      subTotal: venta.subTotal || 0,
      total: venta.total || 0,
      restante: venta.restante || 0,
      totalProductos: venta.productos?.length || 0,
      totalItems: venta.productos?.reduce((sum, p) => sum + (p.cantidad || 0), 0) || 0,
      descuentoGlobal: null,
      pagos: [],
      estado: venta.estado || 'pendiente'
    };

    // Manejo seguro del descuento global
    if (venta.descuentoGlobal && 
        venta.descuentoGlobal.valor !== undefined && 
        venta.descuentoGlobal.valor !== null) {
      
      const descGlobal = venta.descuentoGlobal;
      const valor = parseFloat(descGlobal.valor) || 0;
      
      resumen.descuentoGlobal = {
        razon: descGlobal.razon || 'Descuento aplicado',
        valor: descGlobal.tipo === 'porcentaje' ? 
          `${valor}%` : 
          formatMoney(valor),
        tipo: descGlobal.tipo
      };
    }

    // Procesar pagos si existen
    if (venta.pagos && venta.pagos.length > 0) {
      resumen.pagos = venta.pagos.map(pago => ({
        metodo: pago.metodo.charAt(0).toUpperCase() + pago.metodo.slice(1),
        monto: formatMoney(pago.monto),
        fecha: moment(pago.fecha).format('DD/MM/YYYY'),
        razon: pago.razon || 'Pago recibido'
      }));
    }

    // Procesar productos con validaciones
    const productos = venta.productos.map(p => {
      // Precios con valores por defecto
      const precioBase = parseFloat(p.precioBase) || 0;
      const precio = parseFloat(p.precio) || precioBase;
      const precioFinal = parseFloat(p.precioFinal) || (precio * (p.cantidad || 1));
      
      const producto = {
        nombre: p.producto?.nombre || 'Producto no especificado',
        descripcion: p.producto?.descripcion || '',
        cantidad: p.cantidad || 1,
        precioBase: formatMoney(precioBase),
        precioUnitario: formatMoney(precio),
        precioFinal: formatMoney(precioFinal),
        variante: '',
        extras: [],
        descuento: null
      };

      // Manejo de variantes
      if (p.variante) {
        producto.variante = p.variante.nombreCompleto || 
          [p.variante.tipo, p.calidad?.calidad, p.color?.nombre, p.talla?.nombre]
            .filter(Boolean).join(' / ');
      }

      // Manejo de extras
      if (Array.isArray(p.extras)) {
        producto.extras = p.extras.map(e => {
          const extra = {
            nombre: e.nombre || 'Extra no especificado',
            precio: formatMoney(parseFloat(e.monto) || 0),
            cantidad: '1 pieza'
          };

          if (e.unidad === 'cm_cuadrado' && e.anchoCm && e.largoCm) {
            const area = (parseFloat(e.anchoCm) || 0) * (parseFloat(e.largoCm) || 0);
            extra.cantidad = `${e.anchoCm}cm × ${e.largoCm}cm`;
          }

          return extra;
        });
      }

      // Manejo de descuentos por producto
      if (p.descuento && p.descuento.valor !== undefined && p.descuento.valor !== null) {
        const valor = parseFloat(p.descuento.valor) || 0;
        producto.descuento = {
          razon: p.descuento.razon || 'Descuento aplicado',
          valor: p.descuento.tipo === 'porcentaje' ? 
            `${valor}%` : 
            formatMoney(valor)
        };
      }

      return producto;
    });

    // Cargar plantilla HTML
    const templateHtml = await fs.readFile('app/templates/recibo-venta.html', 'utf8');
    const template = handlebars.compile(templateHtml);

    // Preparar logo en base64 (con manejo de errores)
    let logoBase64 = '';
    try {
      const logoPath = path.resolve('public/images/logo.png');
      logoBase64 = fss.readFileSync(logoPath, 'base64');
    } catch (e) {
      console.warn('No se pudo cargar el logo:', e.message);
    }

    // Preparar datos para la plantilla
    const data = {
      titulo: `Recibo de Venta #${venta._id.toString().substring(18, 24)}`,
      folio: venta._id.toString().substring(18, 24),
      fechaGeneracion: moment(venta.fechaCreacion).format('LLL'),
      logoUrl: logoBase64 ? `data:image/png;base64,${logoBase64}` : null,
      cliente: clienteInfo,
      vendedor: vendedorInfo,
      resumen,
      productos,
      estado: venta.estado.charAt(0).toUpperCase() + venta.estado.slice(1),
      nota: "Gracias por su compra. Para aclaraciones, presentar este recibo.",
      esLiquidado: venta.liquidado,
      fechaLiquidacion: venta.fechaLiquidacion ? moment(venta.fechaLiquidacion).format('LLL') : null,
      mostrarRestante: resumen.restante > 0
    };

    // Renderizar HTML
    const html = template(data);
    
    // Enviar el HTML como respuesta
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (error) {
    console.error('Error al generar el PDF:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error al generar el PDF de la venta',
      error: error.message 
    });
  }
};