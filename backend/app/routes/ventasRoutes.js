const express = require("express");
const router = express.Router();
const ventasController = require("../controllers/ventasController");
const authMiddleware = require("../middleware/auth");

router.post("/", authMiddleware, ventasController.crearVenta);
router.get("/", authMiddleware, ventasController.obtenerVentas);
router.get("/:id", authMiddleware, ventasController.obtenerVenta);
router.patch("/liquidar/:id", authMiddleware, ventasController.liquidarVenta);
router.post("/registrar-pago/:idVenta", authMiddleware, ventasController.registrarPago);

module.exports = router;
