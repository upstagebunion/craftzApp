const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const productosRouter = require('./app/routes/productosRoutes');
const authRouter = require('./app/routes/authRoutes');
const userRoutes = require('./app/routes/userRoutes');
const ventasRoutes = require("./app/routes/ventasRoutes");
const categoriasRoutes = require("./app/routes/categoriasRoutes");
const clientesRoutes = require("./app/routes/clientesRoutes");
const cotizacionesRoutes = require("./app/routes/cotizacionesRoutes");
const extrasRoutes = require("./app/routes/extrasRoutes");
const parametrosCostosRoutes = require("./app/routes/parametrosCostosRoutes");
const reportesRoutes = require("./app/routes/reportesRoutes");
const config = require('./config');

const app = express();
app.use(cors({
    origin: ['http://localhost:3000', 'https://craftzapp.craftzstore.com'], // URL del frontend
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
}));
app.use(express.json());
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
      const duration = Date.now() - start;
      console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} ${res.statusCode} - ${duration}ms`);
  });
  next();
});
app.use('/api/productos', productosRouter);
app.use('/users', userRoutes);
app.use('/auth', authRouter);
app.use("/api/ventas", ventasRoutes)
app.use("/api/categorias", categoriasRoutes);
app.use("/api/clientes", clientesRoutes);
app.use("/api/cotizaciones", cotizacionesRoutes);
app.use("/api/extras", extrasRoutes);
app.use("/api/parametrosCostos", parametrosCostosRoutes);
app.use("/api/reportes", reportesRoutes);

// Conexión a MongoDB
mongoose.connect(config.mongoURI)
  .then(() => {
    console.log(`✅ MongoDB conectado en modo ${config.env.toUpperCase()}`);
    console.log(`📂 Base de datos: ${mongoose.connection.name}`);
  })
  .catch(err => console.log(err));

app.get('/', (req, res) => res.send('API funcionando'));

const PORT = config.port;
app.listen(PORT, () => console.log(`Servidor corriendo en el puerto ${PORT}`));


