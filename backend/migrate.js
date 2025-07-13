const mongoose = require('mongoose');
const { ObjectId } = mongoose.Types;
const Producto = require('./app/models/productsRelatedModels/productosModel');

const tallaSchema = new mongoose.Schema({
    talla: { type: String, required: false, trim: true }, // Ej: "CH", "M", "G"
    stock: { type: Number, required: true, min: 0 },
    costo: { type: Number, required: true, min: 0 }
  });
  
  const colorSchema = new mongoose.Schema({
    color: { type: String, required: true, trim: true }, // Ej: "Negro", "Blanco"
    tallas: [tallaSchema], // Opcional, solo para ropa
    stock: { type: Number, required: false }, // Stock total para este color si no hay tallas
    costo: { type: Number, required: false } // Precio por color si no hay tallas
  });
  
  const varianteSchema = new mongoose.Schema({
    tipo: { type: String, required: false, trim: true }, // Ej: "Blanca", "Mágica", solo para accesorios
    colores: [colorSchema], // Variantes agrupadas por color
  });
  
  const productoSchema = new mongoose.Schema({
    nombre: { type: String, required: true, trim: true }, // Ej: "Playera personalizada", "Taza mágica"
    descripcion: { type: String, required: true }, // Descripción del producto
    categoria: { type: mongoose.Schema.Types.ObjectId, ref: 'Categoria', required: true, index: true }, // Ej: "Ropa", "Artículos"
    subcategoria: { type: mongoose.Schema.Types.ObjectId, ref: 'Subcategoria', required: true, index: true }, // Ej: "Playeras", "Tazas"
    calidad: { type: String, required: false, trim: true },
    corte: { type: String, required: false, trim: true },
    variantes: [varianteSchema], // Variantes flexibles
    imagenes: [{ type: String, required: false}], // URLs de imágenes
    activo: { type: Boolean, default: true },
    fechaCreacion: { type: Date, default: Date.now }
  }, { collection: 'productos' });

migrateProducts().catch(err => {
    console.error('Error durante la migracion: ', err);
    process.exit(1);
});

async function migrateProducts() {
  // Conexión a la base de datos
  await mongoose.connect('', {
    useNewUrlParser: true,
    useUnifiedTopology: true
  });

  // Modelos antiguos y nuevos
  const OldProduct = mongoose.model('OldProduct', productoSchema, 'productos');
  const NewProduct = Producto;

  // Obtener todos los productos antiguos
  const oldProducts = await OldProduct.find({});

  for (const oldProd of oldProducts) {
    // Determinar configuración de variantes
    const configVariantes = {
      usaVariante: oldProd.corte !== undefined,
      usaCalidad: oldProd.calidad !== undefined
    };

    // Mapear tallas con códigos y nombres completos
    const sizeMap = {
      'CH': { codigo: 'CH', talla: 'Chica' },
      'M': { codigo: 'M', talla: 'Mediana' },
      'G': { codigo: 'G', talla: 'Grande' },
      'EG': { codigo: 'EG', talla: 'Extra Grande' },
      '2EG': { codigo: '2EG', talla: 'Doble Extra Grande' },
      '3EG': { codigo: '3EG', talla: 'Triple Extra Grande' }
    };

    // Mapear colores a códigos HEX
    const colorHexMap = {
      'Negro': '#000000',
      'Blanco': '#FFFFFF',
      'Azul Rey': '#003366',
      'Limón': '#FDFF00',
      'Azul Marino': '#000080',
      'N/A': '#CCCCCC'
      // Agrega más mapeos según necesites
    };

    // Construir el nuevo producto
    const newProduct = new NewProduct({
      _id: oldProd._id,
      nombre: oldProd.nombre,
      descripcion: oldProd.descripcion,
      categoria: oldProd.categoria,
      subcategoria: oldProd.subcategoria,
      configVariantes,
      imagenes: oldProd.imagenes.map((img, index) => ({
        url: img,
        esPrincipal: index === 0,
        orden: index + 1
      })),
      activo: oldProd.activo,
      metadata: {
        fechaCreacion: oldProd.fechaCreacion,
        fechaActualizacion: new Date()
      }
    });

    // Procesar variantes
    if (configVariantes.usaVariante) {
      newProduct.variantes = oldProd.variantes.map((variante, varIndex) => {
        const newVariante = {
          variante: variante.tipo || oldProd.corte,
          disponibleOnline: true,
          orden: varIndex + 1
        };

        if (configVariantes.usaCalidad) {
          newVariante.calidades = [{
            calidad: oldProd.calidad,
            disponibleOnline: true,
            orden: 1,
            colores: variante.colores.map((color, colorIndex) => {
              const newColor = {
                color: color.color,
                codigoHex: colorHexMap[color.color] || '#CCCCCC',
                disponibleOnline: true,
                orden: colorIndex + 1
              };

              if (color.tallas && color.tallas.length > 0) {
                newColor.tallas = color.tallas.map((talla, tallaIndex) => ({
                  codigo: talla.talla,
                  talla: sizeMap[talla.talla]?.talla || talla.talla,
                  stock: talla.stock,
                  costo: talla.costo,
                  orden: tallaIndex + 1,
                  disponibleOnline: true
                }));
              } else if (color.stock !== null) {
                newColor.stock = color.stock;
                newColor.costo = color.costo;
              }

              return newColor;
            })
          }];
        } else {
          // Si no usa calidad, los colores van directamente en la variante
          newVariante.colores = variante.colores.map((color, colorIndex) => ({
            color: color.color,
            codigoHex: colorHexMap[color.color] || '#CCCCCC',
            disponibleOnline: true,
            orden: colorIndex + 1,
            tallas: color.tallas.map((talla, tallaIndex) => ({
              codigo: talla.talla,
              talla: sizeMap[talla.talla]?.talla || talla.talla,
              stock: talla.stock,
              costo: talla.costo,
              disponibleOnline: true,
              orden: tallaIndex + 1
            }))
          }));
        }

        return newVariante;
      });
    } else {
        newProduct.variantes = oldProd.variantes.map((variante, varIndex) => {
            const newVariante = {
                variante: variante.tipo || 'Estándar', // Usar el tipo de la variante antigua, o 'Estándar' si no tiene
                disponibleOnline: true,
                orden: varIndex + 1,
                colores: variante.colores.map((color, colorIndex) => {
                    const newColor = {
                        color: color.color,
                        codigoHex: colorHexMap[color.color] || '#CCCCCC',
                        disponibleOnline: true,
                        orden: colorIndex + 1
                    };

                    if (color.tallas && color.tallas.length > 0) {
                        // Si por alguna razón un "accesorio" tiene tallas (ej. anillos), las mapeamos
                        newColor.tallas = color.tallas.map((talla, tallaIndex) => ({
                            codigo: talla.talla,
                            talla: sizeMap[talla.talla]?.talla || talla.talla,
                            stock: talla.stock,
                            costo: talla.costo,
                            disponibleOnline: true,
                            orden: tallaIndex + 1
                        }));
                    } else {
                        // Si no hay tallas en el color, asumimos que el stock y costo están directamente en el color
                        newColor.stock = color.stock;
                        newColor.costo = color.costo;
                        newColor.tallas = []; // Asegurarse de que el array de tallas esté vacío si no hay
                    }
                    return newColor;
                })
            };
            return newVariante;
        });

        if (!newProduct.variantes || newProduct.variantes.length === 0) {
            console.warn(`Producto ${oldProd._id} (${oldProd.nombre}) no tiene 'corte' ni 'variantes'. Creando variante genérica.`);
            newProduct.variantes = [{
                variante: 'General', // Tipo genérico para un producto muy simple
                disponibleOnline: true,
                orden: 1,
                colores: [{
                    color: 'N/A',
                    codigoHex: '#CCCCCC',
                    disponibleOnline: true,
                    orden: 1,
                    stock: oldProd.stock || 0, // Si por algún milagro tiene stock a nivel raíz
                    costo: oldProd.costo || 0, // Si por algún milagro tiene costo a nivel raíz
                    tallas: []
                }]
            }];
        }
      // Productos sin variantes (como accesorios)
      // Implementar lógica similar pero más simple
    }

    // Guardar el nuevo producto
    //await newProduct.save();
    await NewProduct.findOneAndUpdate(
      { _id: newProduct._id }, // Criterio de búsqueda: el mismo _id
      newProduct,              // Los datos del nuevo producto
      { upsert: true, new: true } // upsert: true = inserta si no existe, actualiza si sí existe. new: true = devuelve el documento actualizado/insertado.
    );

    // Crear producto online si es necesario
    /*if (oldProd.activo) {
      const onlineProduct = new NewOnlineProduct({
        slug: generateSlug(oldProd.nombre),
        nombre: oldProd.nombre,
        descripcion: oldProd.descripcion,
        precioMinimo: calculateMinPrice(oldProd),
        precioMaximo: calculateMaxPrice(oldProd),
        diseno: "Diseño estándar", // Ajustar según necesidad
        imagenes: newProduct.imagenes,
        productoBase: newProduct._id,
        varianteSugerida: getSuggestedVariant(newProduct),
        configColor: {
          colorFijo: false,
          colorRequerido: null
        },
        activo: true,
        destacado: false,
        fechaCreacion: new Date(),
        fechaActualizacion: new Date()
      });

      await onlineProduct.save();
    }*/
  }

  console.log('Migración completada');
  process.exit(0);
}
