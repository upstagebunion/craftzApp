const express = require("express");
const router = express.Router();
const {generarReporteVentasPDF} = require("../controllers/reportesController");
const authMiddleware = require("../middleware/auth");

router.get('/ventas/diario', authMiddleware, generarReporteVentasPDF('diario'));
router.get('/ventas/semanal', authMiddleware, generarReporteVentasPDF('semanal'));
router.get('/ventas/mensual', authMiddleware, generarReporteVentasPDF('mensual'));

module.exports = router;
