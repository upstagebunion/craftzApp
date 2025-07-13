const Producto = require('../models/productsRelatedModels/productosModel');
const mongoose = require("mongoose");

const crearProductoOnline = async (req, res) => {
  try {
    // Validar datos de entrada
    const { productoBase } = req.body;
    if (error) return res.status(400).json({ error: error.details[0].message });

    // Verificar si el producto base existe
    const productoBaseRelacionado = await Producto.findById(productoBase);
    if (!productoBaseRelacionado) {
      return res.status(404).json({ error: 'Producto base no encontrado' });
    }

    // Procesar imágenes si existen
    let imagenesProcesadas = [];
    if (req.files && req.files.imagenes) {
      const imagenes = Array.isArray(req.files.imagenes) ? req.files.imagenes : [req.files.imagenes];
      
      for (const imagen of imagenes) {
        const resultado = await cloudinary.uploader.upload(imagen.tempFilePath, {
          folder: 'productos-online',
          transformation: [{ width: 800, height: 800, crop: 'limit', quality: 'auto' }]
        });
        
        imagenesProcesadas.push({
          url: resultado.secure_url,
          esPrincipal: false,
          orden: imagenesProcesadas.length
        });
      }
      
      // Marcar la primera imagen como principal si no hay ninguna marcada
      if (imagenesProcesadas.length > 0 && !imagenesProcesadas.some(img => img.esPrincipal)) {
        imagenesProcesadas[0].esPrincipal = true;
      }
    }

    // Crear el producto online
    const productoOnline = new ProductoOnline({
      ...req.body,
      imagenes: imagenesProcesadas,
      fechaCreacion: new Date(),
      fechaActualizacion: new Date()
    });

    // Guardar en la base de datos
    await productoOnline.save();

    res.status(201).json(productoOnline);
  } catch (error) {
    console.error('Error al crear producto online:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

const actualizarProductoOnline = async (req, res) => {
  try {
    const { id } = req.params;

    // Validar datos de entrada
    const { error } = validateProductoOnline(req.body, true); // true para validación de actualización
    if (error) return res.status(400).json({ error: error.details[0].message });

    // Buscar el producto existente
    const productoExistente = await ProductoOnline.findById(id);
    if (!productoExistente) {
      return res.status(404).json({ error: 'Producto online no encontrado' });
    }

    // Procesar nuevas imágenes si se proporcionan
    let imagenesActualizadas = [...productoExistente.imagenes];
    if (req.files && req.files.imagenes) {
      const nuevasImagenes = Array.isArray(req.files.imagenes) ? req.files.imagenes : [req.files.imagenes];
      
      for (const imagen of nuevasImagenes) {
        const resultado = await cloudinary.uploader.upload(imagen.tempFilePath, {
          folder: 'productos-online',
          transformation: [{ width: 800, height: 800, crop: 'limit', quality: 'auto' }]
        });
        
        imagenesActualizadas.push({
          url: resultado.secure_url,
          esPrincipal: false,
          orden: imagenesActualizadas.length
        });
      }
    }

    // Eliminar imágenes si se especifica en el cuerpo
    if (req.body.imagenesAEliminar && Array.isArray(req.body.imagenesAEliminar)) {
      // Eliminar de Cloudinary
      for (const publicId of req.body.imagenesAEliminar) {
        await cloudinary.uploader.destroy(publicId);
      }
      
      // Eliminar del array de imágenes
      imagenesActualizadas = imagenesActualizadas.filter(
        img => !req.body.imagenesAEliminar.includes(img.publicId)
      );
    }

    // Actualizar el producto
    const productoActualizado = await ProductoOnline.findByIdAndUpdate(
      id,
      {
        ...req.body,
        imagenes: imagenesActualizadas,
        fechaActualizacion: new Date()
      },
      { new: true }
    );

    res.json(productoActualizado);
  } catch (error) {
    console.error('Error al actualizar producto online:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

const eliminarProductoOnline = async (req, res) => {
  try {
    const { id } = req.params;

    // Buscar el producto para obtener las imágenes
    const producto = await ProductoOnline.findById(id);
    if (!producto) {
      return res.status(404).json({ error: 'Producto online no encontrado' });
    }

    // Eliminar imágenes de Cloudinary
    for (const imagen of producto.imagenes) {
      const publicId = imagen.url.split('/').pop().split('.')[0];
      await cloudinary.uploader.destroy(`productos-online/${publicId}`);
    }

    // Eliminar el producto de la base de datos
    await ProductoOnline.findByIdAndDelete(id);

    res.json({ mensaje: 'Producto online eliminado correctamente' });
  } catch (error) {
    console.error('Error al eliminar producto online:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

const obtenerProductoPorSlug = async (req, res) => {
  try {
    const { slug } = req.params;

    const producto = await ProductoOnline.findOne({ slug })
      .populate('productoBase')
      .populate('categorias');

    if (!producto) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    res.json(producto);
  } catch (error) {
    console.error('Error al obtener producto por slug:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

const listarProductosOnline = async (req, res) => {
  try {
    const { categoria, destacado, etiqueta, limit = 10, page = 1 } = req.query;
    const skip = (page - 1) * limit;

    const filtro = { activo: true };
    
    if (categoria) filtro.categorias = categoria;
    if (destacado) filtro.destacado = destacado === 'true';
    if (etiqueta) filtro.etiquetas = etiqueta;

    const productos = await ProductoOnline.find(filtro)
      .skip(skip)
      .limit(parseInt(limit))
      .populate('productoBase')
      .populate('categorias');

    const total = await ProductoOnline.countDocuments(filtro);

    res.json({
      productos,
      total,
      paginas: Math.ceil(total / limit),
      paginaActual: parseInt(page)
    });
  } catch (error) {
    console.error('Error al listar productos online:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

module.exports = {
    obtenerProductoPorSlug,
    listarProductosOnline,
    crearProductoOnline,
    actualizarProductoOnline,
    eliminarProductoOnline
}