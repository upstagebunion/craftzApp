// controllers/extraController.js
const Extra = require('../models/extrasModel');

exports.crearExtra = async (req, res) => {
  try {
    const { nombre, unidad, monto } = req.body;

    if (!nombre || !unidad || !monto) {
      return res.status(400).json({ message: "Nombre, unidad y monto son obligatorios" });
    }

    const nuevoExtra = new Extra({
      nombre,
      unidad,
      monto,
    });

    await nuevoExtra.save();
    res.status(201).json(nuevoExtra);
  } catch (error) {
    console.error("Error al crear extra:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
};