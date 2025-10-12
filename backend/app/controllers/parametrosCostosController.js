// controllers/costoElaboracionController.js
const CostoElaboracion = require('../models/parametrosCostosModel');
const {Subcategoria} = require('../models/categoriasModel');

exports.crearCostoElaboracion = async (req, res) => {
  try {
    const { 
      nombre, 
      descripcion, 
      unidad, 
      monto, 
      anchoPlancha, 
      largoPlancha, 
      tipoAplicacion, 
      prioridad, 
      subcategoriasAplica 
    } = req.body;

    // Validaciones básicas
    if (!nombre || !unidad || monto === undefined || !tipoAplicacion || !subcategoriasAplica) {
      return res.status(400).json({ 
        success: false,
        message: "Nombre, unidad, monto, tipoAplicacion y subcategorías son campos obligatorios" 
      });
    }

    if (isNaN(monto) || monto < 0) {
      return res.status(400).json({
        success: false,
        message: "El monto debe ser un número positivo"
      });
    }

    // Validar tipo de aplicación y prioridad
    if (tipoAplicacion === 'fijo' && (prioridad === undefined || prioridad < 0)) {
      return res.status(400).json({
        success: false,
        message: "Los costos fijos deben tener una prioridad válida"
      });
    }

    // Validar que las subcategorías existan
    const subcategoriasValidas = await Subcategoria.find({ _id: { $in: subcategoriasAplica } });
    if (subcategoriasValidas.length !== subcategoriasAplica.length) {
      const idsInvalidos = subcategoriasAplica.filter(
        id => !subcategoriasValidas.some(valida => valida._id.equals(id))
      );
      return res.status(400).json({ 
        success: false,
        message: "Alguna subcategoría no existe",
        idsInvalidos
      });
    }

    // Validar dimensiones si la unidad es por cm_cuadrado
    if (unidad === 'cm_cuadrado' && (!anchoPlancha || !largoPlancha)) {
      return res.status(400).json({
        success: false,
        message: "Ancho y largo de plancha son requeridos para costos por cm²"
      });
    }

    const nuevoCosto = new CostoElaboracion({
      nombre,
      descripcion,
      unidad,
      monto,
      anchoPlancha: unidad === 'cm_cuadrado' ? anchoPlancha : undefined,
      largoPlancha: unidad === 'cm_cuadrado' ? largoPlancha : undefined,
      tipoAplicacion,
      prioridad: tipoAplicacion === 'fijo' ? (prioridad || 0) : undefined,
      subcategoriasAplica,
    });

    await nuevoCosto.save();
    
    res.status(201).json({
      success: true,
      data: nuevoCosto,
      message: "Costo de elaboración creado exitosamente"
    });
  } catch (error) {
    console.error("Error al crear costo de elaboración:", error);
    res.status(500).json({ 
      success: false,
      message: "Error interno del servidor",
      error: error.message 
    });
  }
};

exports.obtenerCostosElaboracion = async (req, res) => {
  try {
    const costos = await CostoElaboracion.find()
      .sort({ 
        tipoAplicacion: 1, 
        prioridad: 1,
        nombre: 1 
      });

    res.json({
      success: true,
      count: costos.length,
      costos // Cambiado de 'data' a 'costos' para coincidir con Flutter
    });
  } catch (error) {
    console.error("Error al obtener costos de elaboración:", error);
    res.status(500).json({
      success: false,
      message: "Error al obtener los costos",
      error: error.message
    });
  }
};

exports.obtenerCostoElaboracion = async (req, res) => {
  try {
    const costo = await CostoElaboracion.findById(req.params.id)

    if (!costo) {
      return res.status(404).json({
        success: false,
        message: "Costo de elaboración no encontrado"
      });
    }

    res.json({
      success: true,
      data: costo
    });
  } catch (error) {
    console.error("Error al obtener costo de elaboración:", error);
    res.status(500).json({
      success: false,
      message: "Error al obtener el costo",
      error: error.message
    });
  }
};

exports.actualizarCostoElaboracion = async (req, res) => {
  try {
    const { nombre, descripcion, unidad, monto, anchoPlancha, largoPlancha, subcategoriasAplica } = req.body;

    // Validar que el costo exista
    const costoExistente = await CostoElaboracion.findById(req.params.id);
    if (!costoExistente) {
      return res.status(404).json({
        success: false,
        message: "Costo de elaboración no encontrado"
      });
    }

    // Validar subcategorías si se proporcionan
    /*if (subcategoriasAplica) {
      const subcategoriasValidas = await Subcategoria.find({ _id: { $in: subcategoriasAplica } });
      if (subcategoriasValidas.length !== subcategoriasAplica.length) {
        return res.status(400).json({
          success: false,
          message: "Alguna subcategoría no existe"
        });
      }
    }*/

    // Preparar datos para actualización
    const datosActualizacion = {
      nombre: nombre || costoExistente.nombre,
      descripcion: descripcion !== undefined ? descripcion : costoExistente.descripcion,
      unidad: unidad || costoExistente.unidad,
      monto: monto !== undefined ? monto : costoExistente.monto,
      //subcategoriasAplica: subcategoriasAplica || costoExistente.subcategoriasAplica
    };

    // Manejar subcategorías - filtrar solo las que existen
    if (subcategoriasAplica !== undefined) {
      if (subcategoriasAplica.length === 0) {
        datosActualizacion.subcategoriasAplica = [];
      } else {
        // Filtrar solo las subcategorías que existen
        const subcategoriasValidas = await Subcategoria.find({ 
          _id: { $in: subcategoriasAplica } 
        });
        
        const idsSubcategoriasValidas = subcategoriasValidas.map(sub => sub._id.toString());
        
        // Encontrar las subcategorías inválidas para informar al usuario
        const subcategoriasInvalidas = subcategoriasAplica.filter(
          id => !idsSubcategoriasValidas.includes(id)
        );

        datosActualizacion.subcategoriasAplica = idsSubcategoriasValidas;

        // Opcional: Informar sobre subcategorías filtradas
        if (subcategoriasInvalidas.length > 0) {
          console.warn(`Subcategorías inválidas filtradas: ${subcategoriasInvalidas.join(', ')}`);
        }
      }
    } else {
      // Si no se proporciona subcategoriasAplica, mantener las existentes
      datosActualizacion.subcategoriasAplica = costoExistente.subcategoriasAplica;
    }

    // Manejar dimensiones según unidad
    if (unidad === 'cm_cuadrado') {
      datosActualizacion.anchoPlancha = anchoPlancha || costoExistente.anchoPlancha;
      datosActualizacion.largoPlancha = largoPlancha || costoExistente.largoPlancha;
    } else {
      datosActualizacion.anchoPlancha = undefined;
      datosActualizacion.largoPlancha = undefined;
    }

    const costoActualizado = await CostoElaboracion.findByIdAndUpdate(
      req.params.id,
      datosActualizacion,
      { new: true, runValidators: true }
    )

    res.json({
      success: true,
      costo: costoActualizado,
      message: "Costo de elaboración actualizado exitosamente"
    });
  } catch (error) {
    console.error("Error al actualizar costo de elaboración:", error);
    res.status(500).json({
      success: false,
      message: "Error al actualizar el costo",
      error: error.message
    });
  }
};

exports.eliminarCostoElaboracion = async (req, res) => {
  try {
    const costoEliminado = await CostoElaboracion.findByIdAndDelete(req.params.id);

    if (!costoEliminado) {
      return res.status(404).json({
        success: false,
        message: "Costo de elaboración no encontrado"
      });
    }

    res.status(200).json({
      success: true,
      data: costoEliminado,
      message: "Costo de elaboración eliminado exitosamente"
    });
  } catch (error) {
    console.error("Error al eliminar costo de elaboración:", error);
    res.status(500).json({
      success: false,
      message: "Error al eliminar el costo",
      error: error.message
    });
  }
};

// Obtener costos por subcategoría
exports.obtenerCostosPorSubcategoria = async (req, res) => {
  try {
    const { subcategoriaId } = req.params;

    // Validar que el ID tenga formato correcto
    if (!mongoose.Types.ObjectId.isValid(subcategoriaId)) {
      return res.status(400).json({
        success: false,
        message: "ID de subcategoría no válido"
      });
    }

    // Verificar que la subcategoría exista
    const subcategoriaExistente = await Subcategoria.findById(subcategoriaId);
    if (!subcategoriaExistente) {
      return res.status(404).json({
        success: false,
        message: "Subcategoría no encontrada"
      });
    }

    // Buscar costos que apliquen a esta subcategoría
    const costos = await CostoElaboracion.find({
      subcategoriasAplica: subcategoriaId
    })
    .populate('subcategoriasAplica', 'nombre descripcion')
    .sort({ nombre: 1 });

    res.json({
      success: true,
      subcategoria: {
        id: subcategoriaExistente._id,
        nombre: subcategoriaExistente.nombre
      },
      count: costos.length,
      data: costos
    });

  } catch (error) {
    console.error("Error al obtener costos por subcategoría:", error);
    res.status(500).json({
      success: false,
      message: "Error al obtener los costos",
      error: error.message
    });
  }
};
