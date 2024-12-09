const express = require("express");
const router = express.Router();
const ventasController = require("../controllers/ventasController");
const authMiddleware = require("../middleware/auth");

router.post("/", authMiddleware, ventasController.crearVenta);
router.get("/", authMiddleware, ventasController.obtenerVentas);
router.get("/:id", authMiddleware, ventasController.obtenerVentaPorId);
router.patch("/:id", authMiddleware, ventasController.actualizarEstadoVenta);

module.exports = router;
