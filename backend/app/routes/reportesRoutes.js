const express = require("express");
const router = express.Router();
const { 
    generarReporteVentasPDF,
    getClientesCount,
    getProductosCount,
    getVentasCountToday,
    getMonthlyRevenueLastMonth,
    generarReporteInventarioPDF
} = require("../controllers/reportesController");
const authMiddleware = require("../middleware/auth");

router.get('/ventas/diario', authMiddleware, generarReporteVentasPDF('diario'));
router.get('/ventas/semanal', authMiddleware, generarReporteVentasPDF('semanal'));
router.get('/ventas/mensual', authMiddleware, generarReporteVentasPDF('mensual'));

router.get('/inventario/diario', generarReporteInventarioPDF('diario'));
router.get('/inventario/semanal', generarReporteInventarioPDF('semanal'));
router.get('/inventario/mensual', generarReporteInventarioPDF('mensual'));
router.get('/inventario/personalizado', async (req, res) => {
  try {
    const { fechaInicio, fechaFin, tipoMovimiento, motivos } = req.query;
    
    const filtros = {
      fechaInicio,
      fechaFin,
      tipoMovimiento,
      motivo: motivos ? motivos.split(',') : []
    };
    
    await generarReporteInventarioPDF('personalizado', filtros)(req, res);
  } catch (error) {
    res.status(500).json({ error: 'Error al generar reporte' });
  }
});

router.get('/conteo-clientes', authMiddleware, getClientesCount);
router.get('/conteo-productos', authMiddleware, getProductosCount);
router.get('/ventas-hoy', authMiddleware, getVentasCountToday);
router.get('/ingresos-mes', authMiddleware, getMonthlyRevenueLastMonth);

module.exports = router;
