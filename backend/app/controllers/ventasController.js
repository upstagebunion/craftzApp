const Venta = require("../models/venta");
const Producto = require("../models/Producto"); // Importar modelo de producto para obtener los precios

exports.crearVenta = async (req, res) => {
    try {
      const { productos } = req.body;
  
      if (!productos || productos.length === 0) {
        return res.status(400).json({ message: "Datos incompletos para registrar la venta." });
      }
  
      let total = 0;
      const productosProcesados = [];
  
      for (const item of productos) {
        const productoDb = await Producto.findById(item.producto); // Buscar el producto en la BD
        if (!productoDb) {
          return res.status(404).json({ message: `Producto con ID ${item.producto} no encontrado.` });
        }
  
        const subtotal = productoDb.precio * item.cantidad; // Calcular subtotal
        total += subtotal; // Sumar al total
        productosProcesados.push({
          producto: item.producto,
          cantidad: item.cantidad,
          subtotal,
        });
      }
  
      const nuevaVenta = new Venta({
        usuario: req.userId, // Obtener el usuario del token
        productos: productosProcesados,
        total,
        fecha: new Date(),
      });
  
      const ventaGuardada = await nuevaVenta.save();
      res.status(201).json(ventaGuardada);
    } catch (error) {
      console.error("Error al crear la venta:", error);
      res.status(500).json({ message: "Error al registrar la venta." });
    }
  };
  

exports.obtenerVentas = async (req, res) => {
  try {
    const ventas = await Venta.find().populate("usuario").populate("productos.producto");
    res.json(ventas);
  } catch (error) {
    console.error("Error al obtener ventas:", error);
    res.status(500).json({ message: "Error al obtener ventas." });
  }
};

exports.obtenerVentaPorId = async (req, res) => {
  try {
    const { id } = req.params;
    const venta = await Venta.findById(id).populate("usuario").populate("productos.producto");
    if (!venta) return res.status(404).json({ message: "Venta no encontrada." });
    res.json(venta);
  } catch (error) {
    console.error("Error al obtener la venta:", error);
    res.status(500).json({ message: "Error al obtener la venta." });
  }
};

exports.actualizarEstadoVenta = async (req, res) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;
    const ventaActualizada = await Venta.findByIdAndUpdate(id, { estado }, { new: true });
    if (!ventaActualizada) return res.status(404).json({ message: "Venta no encontrada." });
    res.json(ventaActualizada);
  } catch (error) {
    console.error("Error al actualizar la venta:", error);
    res.status(500).json({ message: "Error al actualizar la venta." });
  }
};
