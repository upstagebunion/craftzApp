const express = require("express");
const router = express.Router();
const { 
    generarReporteVentasPDF,
    getClientesCount,
    getProductosCount,
    getVentasCountToday,
    getMonthlyRevenueLastMonth
} = require("../controllers/reportesController");
const authMiddleware = require("../middleware/auth");

router.get('/ventas/diario', authMiddleware, generarReporteVentasPDF('diario'));
router.get('/ventas/semanal', authMiddleware, generarReporteVentasPDF('semanal'));
router.get('/ventas/mensual', authMiddleware, generarReporteVentasPDF('mensual'));

router.get('/conteo-clientes', authMiddleware, getClientesCount);
router.get('/conteo-productos', authMiddleware, getProductosCount);
router.get('/ventas-hoy', authMiddleware, getVentasCountToday);
router.get('/ingresos-mes', authMiddleware, getMonthlyRevenueLastMonth);

module.exports = router;
