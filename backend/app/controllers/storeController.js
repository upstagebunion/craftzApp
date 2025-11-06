const ProductoOnline = require('../models/productsRelatedModels/productosOnlineModel');
const { Categoria } = require('../models/categoriasModel');
const CategoriasDisenos = require('../models/categoriasDisenos');

const obtenerProductosPublicos = async (req, res) => {
  try {
    const { categoria, destacado, etiqueta, limit = 12, page = 1, search } = req.query;
    const skip = (page - 1) * limit;

    const filtro = { activo: true };
    
    if (categoria) filtro.categorias = categoria;
    if (destacado) filtro.destacado = destacado === 'true';
    if (etiqueta) filtro.etiquetas = etiqueta;
    if (search) {
      filtro.$or = [
        { nombre: { $regex: search, $options: 'i' } },
        { descripcion: { $regex: search, $options: 'i' } },
        { etiquetas: { $regex: search, $options: 'i' } }
      ];
    }

    const productos = await ProductoOnline.find(filtro)
      .skip(skip)
      .limit(parseInt(limit))
      .populate('categorias', 'nombre')
      .select('slug nombre descripcionCorta precioMinimo precioMaximo imagenes destacado etiquetas')
      .sort({ destacado: -1, fechaCreacion: -1 });

    const total = await ProductoOnline.countDocuments(filtro);

    res.json({
      productos,
      total,
      paginas: Math.ceil(total / limit),
      paginaActual: parseInt(page)
    });
  } catch (error) {
    console.error('Error al obtener productos públicos:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

const obtenerProductoPublicoPorSlug = async (req, res) => {
  try {
    const { slug } = req.params;

    const producto = await ProductoOnline.findOne({ slug, activo: true })
      .populate({
        path: 'productoBase',
        select: 'nombre descripcion categoria subcategoria configVariantes variantes imagenes',
        populate: [
          { path: 'categoria', select: 'nombre' },
          { path: 'subcategoria', select: 'nombre usaTallas' }
        ]
      })
      .populate('categorias', 'nombre');

    if (!producto) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    // Filtrar solo variantes disponibles online
    const productoConVariantesDisponibles = {
      ...producto.toObject(),
      productoBase: {
        ...producto.productoBase.toObject(),
        variantes: producto.productoBase.variantes
          .filter(v => v.disponibleOnline)
          .map(variante => ({
            ...variante.toObject(),
            calidades: variante.calidades
              .filter(c => c.disponibleOnline)
              .map(calidad => ({
                ...calidad.toObject(),
                colores: calidad.colores
                  .filter(col => col.disponibleOnline)
                  .map(color => ({
                    ...color.toObject(),
                    tallas: color.tallas ? color.tallas.filter(t => t.disponibleOnline && t.stock > 0) : undefined
                  }))
              }))
          }))
      }
    };

    res.json(productoConVariantesDisponibles);
  } catch (error) {
    console.error('Error al obtener producto público:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

const obtenerCategoriasPublicas = async (req, res) => {
  try {
    const categorias = await Categoria.find()
      .populate('subcategorias', 'nombre usaTallas')
      .select('nombre subcategorias');

    res.json(categorias);
  } catch (error) {
    console.error('Error al obtener categorías públicas:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

const obtenerCategoriasDisenos = async (req, res) => {
  try {
    const categorias = await CategoriasDisenos.find()
      .select('nombre descripcion orden activo')
      .sort({ orden: 1, nombre: 1 });

    res.json(categorias);
  } catch (error) {
    console.error('Error al obtener categorías de diseños:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

const crearCategoriaDiseno = async (req, res) => {
  try {
    const { nombre, descripcion, orden } = req.body;
    
    const categoria = new CategoriasDisenos({
      nombre,
      descripcion,
      orden: orden || 0
    });

    await categoria.save();
    res.status(201).json(categoria);
  } catch (error) {
    console.error('Error al crear categoría de diseño:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

const actualizarCategoriaDiseno = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, descripcion, orden } = req.body;

    const categoria = await CategoriasDisenos.findByIdAndUpdate(
      id,
      { nombre, descripcion, orden },
      { new: true }
    );

    if (!categoria) {
      return res.status(404).json({ error: 'Categoría no encontrada' });
    }

    res.json(categoria);
  } catch (error) {
    console.error('Error al actualizar categoría:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

const eliminarCategoriaDiseno = async (req, res) => {
  try {
    const { id } = req.params;

    const categoria = await CategoriasDisenos.findByIdAndUpdate(
      id,
      { activo: false },
      { new: true }
    );

    if (!categoria) {
      return res.status(404).json({ error: 'Categoría no encontrada' });
    }

    res.json({ mensaje: 'Categoría eliminada correctamente' });
  } catch (error) {
    console.error('Error al eliminar categoría:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

const obtenerProductosDestacados = async (req, res) => {
  try {
    const { limit = 8 } = req.query;

    const productos = await ProductoOnline.find({ activo: true, destacado: true })
      .limit(parseInt(limit))
      .populate('categorias', 'nombre')
      .select('slug nombre descripcionCorta precioMinimo precioMaximo imagenes')
      .sort({ fechaCreacion: -1 });

    res.json(productos);
  } catch (error) {
    console.error('Error al obtener productos destacados:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

const obtenerProductosBase = async (req, res) => {
  try {
    const ProductoBase = require('../models/productsRelatedModels/productosModel');
    
    const productos = await ProductoBase.find({ activo: true })
      .populate('categoria', 'nombre')
      .populate('subcategoria', 'nombre usaTallas')
      .select('nombre descripcion categoria subcategoria configVariantes variantes imagenes')
      .sort({ 'metadata.fechaCreacion': -1 });

    // Filtrar solo productos que tienen al menos una variante disponible online
    const productosConVariantesOnline = productos.filter(producto => {
      return producto.variantes.some(variante => 
        variante.disponibleOnline && 
        variante.calidades.some(calidad => 
          calidad.disponibleOnline && 
          calidad.colores.some(color => color.disponibleOnline)
        )
      );
    });

    res.json(productosConVariantesOnline);
  } catch (error) {
    console.error('Error al obtener productos base:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

const crearProductoOnline = async (req, res) => {
  try {
    const { productoBase, slug, nombre, descripcionCorta, descripcion, diseno, imagenes, varianteSugerida, configColor, categorias, etiquetas, destacado } = req.body;

    // Verificar que el producto base existe
    const ProductoBase = require('../models/productsRelatedModels/productosModel');
    const productoBaseExiste = await ProductoBase.findById(productoBase);
    if (!productoBaseExiste) {
      return res.status(404).json({ error: 'Producto base no encontrado' });
    }

    // Verificar que el slug no existe
    const slugExiste = await ProductoOnline.findOne({ slug });
    if (slugExiste) {
      return res.status(400).json({ error: 'El slug ya existe' });
    }

    // Calcular precios mínimo y máximo basado en variantes disponibles online
    let precios = [];
    productoBaseExiste.variantes.forEach(variante => {
      if (variante.disponibleOnline) {
        variante.calidades.forEach(calidad => {
          if (calidad.disponibleOnline) {
            calidad.colores.forEach(color => {
              if (color.disponibleOnline) {
                if (color.tallas && color.tallas.length > 0) {
                  color.tallas.forEach(talla => {
                    if (talla.disponibleOnline && talla.stock > 0) {
                      precios.push(talla.costo);
                    }
                  });
                } else if (color.costo) {
                  precios.push(color.costo);
                }
              }
            });
          }
        });
      }
    });

    if (precios.length === 0) {
      return res.status(400).json({ error: 'No hay variantes disponibles online con stock' });
    }

    const precioMinimo = Math.min(...precios);
    const precioMaximo = Math.max(...precios);

    const nuevoProductoOnline = new ProductoOnline({
      slug,
      nombre,
      descripcionCorta,
      descripcion,
      precioMinimo,
      precioMaximo,
      diseno,
      imagenes: imagenes || [],
      productoBase,
      varianteSugerida,
      configColor: configColor || { colorFijo: true },
      categorias: categorias || [],
      etiquetas: etiquetas || [],
      destacado: destacado || false
    });

    await nuevoProductoOnline.save();
    
    const productoCreado = await ProductoOnline.findById(nuevoProductoOnline._id)
      .populate('productoBase', 'nombre')
      .populate('categorias', 'nombre');

    res.status(201).json(productoCreado);
  } catch (error) {
    console.error('Error al crear producto online:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

module.exports = {
  obtenerProductosPublicos,
  obtenerProductoPublicoPorSlug,
  obtenerCategoriasPublicas,
  obtenerCategoriasDisenos,
  crearCategoriaDiseno,
  actualizarCategoriaDiseno,
  eliminarCategoriaDiseno,
  obtenerProductosDestacados,
  obtenerProductosBase,
  crearProductoOnline
};