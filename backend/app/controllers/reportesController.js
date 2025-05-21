// controllers/reportesController.js
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const moment = require('moment');
const Venta = require('../models/ventasModel');
const Producto = require('../models/productosModel');
const Cliente = require('../models/clienteModel');
//const MovimientoInventario = require('../models/movimientosInventarioModel');

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
      fechaCreacion: { $gte: fechaInicio, $lte: fechaFin }
    }).populate('cliente vendedor');
    
    // Crear PDF
    const doc = new PDFDocument();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=reporte_ventas_${tipo}.pdf`);
    doc.pipe(res);
    
    // Encabezado del reporte
    doc.fontSize(20).text(`Reporte de Ventas ${tipo}`, { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Del ${moment(fechaInicio).format('LL')} al ${moment(fechaFin).format('LL')}`, { align: 'center' });
    doc.moveDown();
    
    // Resumen estadístico
    const totalVentas = ventas.reduce((sum, venta) => sum + venta.total, 0);
    const cantidadVentas = ventas.length;
    
    doc.fontSize(14).text('Resumen Estadístico:', { underline: true });
    doc.text(`Total de ventas: ${cantidadVentas}`);
    doc.text(`Monto total: $${totalVentas.toFixed(2)}`);
    doc.moveDown();
    
    // Tabla de ventas
    doc.fontSize(14).text('Detalle de Ventas:', { underline: true });
    doc.moveDown();
    
    // Configurar columnas
    const columnas = [
      { header: 'Fecha', key: 'fecha', width: 100 },
      { header: 'Cliente', key: 'cliente', width: 150 },
      { header: 'Vendedor', key: 'vendedor', width: 150 },
      { header: 'Total', key: 'total', width: 80 }
    ];
    
    // Agregar datos a la tabla
    ventas.forEach(venta => {
      doc.text(moment(venta.fechaCreacion).format('LLL'), { continued: true })
         .text(venta.cliente.nombre, { align: 'right', width: 150 })
         .text(venta.vendedor != undefined ? venta.vendedor.nombre : '', { align: 'right', width: 150 })
         .text(`$${venta.total.toFixed(2)}`, { align: 'right' });
      doc.moveDown();
    });
    
    doc.end();
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al generar el reporte' });
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
      }
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
          }
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
