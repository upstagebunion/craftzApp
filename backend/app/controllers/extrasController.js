// controllers/extraController.js
const Extra = require('../models/extrasModel');
const CostoElaboracion = require('../models/parametrosCostosModel');

exports.getExtras = async (req, res) => {
  try {
    const extras = await Extra.find();
    res.status(200).json({ extras });
  } catch (error) {
    console.error("Error al obtener extras:", error);
    res.status(500).json({ 
      success: false,
      message: "Error interno del servidor",
      error: error.message 
    });
  }
};

exports.crearExtra = async (req, res) => {
  try {
    const { nombre, unidad, monto, anchoCm, largoCm, parametroCalculoId } = req.body;

    // Validación básica
    if (!nombre || !unidad) {
      return res.status(400).json({ 
        success: false,
        message: "Nombre y unidad son obligatorios" 
      });
    }

    // Validación específica por unidad
    if (unidad === 'pieza' && !monto) {
      return res.status(400).json({ 
        success: false,
        message: "Para unidad 'pieza' se requiere el monto" 
      });
    }

    if (unidad === 'cm_cuadrado') {
      if (!anchoCm || !largoCm || !parametroCalculoId) {
        return res.status(400).json({ 
          success: false,
          message: "Para unidad 'cm_cuadrado' se requieren anchoCm, largoCm y parametroCalculoId" 
        });
      }
      
      // Verificar que el parámetro de cálculo existe
      const parametro = await CostoElaboracion.findById(parametroCalculoId);
      if (!parametro) {
        return res.status(400).json({ 
          success: false,
          message: "El parámetro de cálculo especificado no existe" 
        });
      }
    }

    const nuevoExtra = new Extra({
      nombre,
      unidad,
      monto: unidad === 'pieza' ? monto : undefined,
      anchoCm: unidad === 'cm_cuadrado' ? anchoCm : undefined,
      largoCm: unidad === 'cm_cuadrado' ? largoCm : undefined,
      parametroCalculoId: unidad === 'cm_cuadrado' ? parametroCalculoId : undefined
    });

    await nuevoExtra.save();
    
    res.status(201).json({
      success: true,
      data: nuevoExtra,
      message: "Extra creado exitosamente"
    });
  } catch (error) {
    console.error("Error al crear extra:", error);
    res.status(500).json({ 
      success: false,
      message: "Error interno del servidor",
      error: error.message 
    });
  }
};

exports.eliminarExtra = async (req, res) => {
    try {
        const { id } = req.params;

        const extraEliminado = await Extra.findByIdAndDelete(id);

        if (!extraEliminado) {
            return res.status(404).json({ message: "Extra no encontrado" });
        }

        res.status(200).json({ message: "Extra eliminado" });
    } catch (error) {
        res.status(500).json({ message: "Error al eliminar el extra", error });
    }
};