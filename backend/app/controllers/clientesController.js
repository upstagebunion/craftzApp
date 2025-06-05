// controllers/clienteController.js
const Cliente = require('../models/clienteModel');

exports.crearCliente = async (req, res) => {
  try {
    const { nombre, apellido_paterno, apellido_materno, alias, correo, telefono } = req.body;

    if (!nombre) {
      return res.status(400).json({ message: "El nombre es obligatorio" });
    }

    const nuevoCliente = new Cliente({
      nombre,
      apellido_paterno,
      apellido_materno,
      alias,
      correo: correo || undefined,
      telefono,
      // fecha_registro se añade automáticamente por el default
    });

    await nuevoCliente.save();
    res.status(201).json(nuevoCliente);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: "El correo ya está registrado" });
    }
    console.error("Error al crear cliente:", error);
    res.status(500).json({ message: "Error interno del servidor", error: error.message });
  }
};

// Obtener todos los clientes
exports.obtenerClientes = async (req, res) => {
  try {
    const clientes = await Cliente.find().sort({ fecha_registro: -1 }); // Ordenados por más reciente
    res.status(200).json(clientes);
  } catch (error) {
    console.error("Error al obtener clientes:", error);
    res.status(500).json({ message: "Error interno del servidor", error: error.message });
  }
};

// Obtener un cliente por ID
exports.obtenerCliente = async (req, res) => {
  try {
    const cliente = await Cliente.findById(req.params.id).populate('historial_compras');
    
    if (!cliente) {
      return res.status(404).json({ message: "Cliente no encontrado" });
    }
    
    res.status(200).json(cliente);
  } catch (error) {
    console.error("Error al obtener cliente:", error);
    res.status(500).json({ message: "Error interno del servidor", error: error.message });
  }
};

// Eliminar un cliente (eliminación física)
exports.eliminarCliente = async (req, res) => {
  try {
    const clienteEliminado = await Cliente.findByIdAndDelete(req.params.id);
    
    if (!clienteEliminado) {
      return res.status(404).json({ message: "Cliente no encontrado" });
    }
    
    res.status(200).json({ message: "Cliente eliminado correctamente", cliente: clienteEliminado });
  } catch (error) {
    console.error("Error al eliminar cliente:", error);
    res.status(500).json({ message: "Error interno del servidor", error: error.message });
  }
};

//TODO
exports.desactivarCliente = async (req, res) => {
  try {
    const clienteActualizado = await Cliente.findByIdAndUpdate(
      req.params.id,
      { activo: false },
      { new: true }
    );
    
    if (!clienteActualizado) {
      return res.status(404).json({ message: "Cliente no encontrado" });
    }
    
    res.status(200).json({ message: "Cliente desactivado correctamente", cliente: clienteActualizado });
  } catch (error) {
    console.error("Error al desactivar cliente:", error);
    res.status(500).json({ message: "Error interno del servidor", error: error.message });
  }
};

exports.actualizarCliente = async (req, res) => {
  try {
    const { id } = req.params;
    const datosActualizados = req.body;

    // Validar que el ID tenga el formato correcto
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'ID de cliente no válido' });
    }

    // Buscar y actualizar el cliente
    const clienteActualizado = await Cliente.findByIdAndUpdate(
      id,
      {
        $set: {
          ...datosActualizados,
          ultima_compra: datosActualizados.ultima_compra || Date.now()
        }
      },
      { new: true, runValidators: true }
    );

    if (!clienteActualizado) {
      return res.status(404).json({ message: 'Cliente no encontrado' });
    }

    // Si se actualiza el correo, verificar que no exista otro cliente con el mismo correo
    if (datosActualizados.correo) {
      const clienteConMismoCorreo = await Cliente.findOne({ 
        correo: datosActualizados.correo, 
        _id: { $ne: id } 
      });

      if (clienteConMismoCorreo) {
        return res.status(400).json({ message: 'El correo ya está registrado en otro cliente' });
      }
    }

    res.status(200).json({
      message: 'Cliente actualizado correctamente',
      cliente: clienteActualizado
    });

  } catch (error) {
    console.error('Error al actualizar cliente:', error);
    
    // Manejar errores de validación de Mongoose
    if (error.name === 'ValidationError') {
      const mensajesError = Object.values(error.errors).map(val => val.message);
      return res.status(400).json({ 
        message: 'Error de validación',
        errors: mensajesError 
      });
    }

    res.status(500).json({ 
      message: 'Error interno del servidor',
      error: error.message 
    });
  }
};
