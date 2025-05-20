// controllers/reportesController.js
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const moment = require('moment');
const Venta = require('../models/ventasModel');
const Producto = require('../models/productosModel');
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