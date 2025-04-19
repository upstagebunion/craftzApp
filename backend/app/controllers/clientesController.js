// controllers/clienteController.js
const Cliente = require('../models/clienteModel');

exports.crearCliente = async (req, res) => {
  try {
    const { nombre, correo, telefono } = req.body;

    if (!nombre || !telefono) {
      return res.status(400).json({ message: "Nombre y teléfono son obligatorios" });
    }

    const nuevoCliente = new Cliente({
      nombre,
      correo,
      telefono,
    });

    await nuevoCliente.save();
    res.status(201).json(nuevoCliente);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: "El correo ya está registrado" });
    }
    console.error("Error al crear cliente:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
};