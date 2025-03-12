const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const productosRouter = require('./app/routes/productosRoutes');
const authRouter = require('./app/routes/authRoutes');
const ventasRoutes = require("./app/routes/ventasRoutes");
const categoriasRoutes = require("./app/routes/categoriasRoutes");
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
app.use('/auth', authRouter);
app.use("/api/ventas", ventasRoutes)
app.use("/api/categorias", categoriasRoutes);

// Conexión a MongoDB
mongoose.connect(config.mongoURI).then(() => console.log('MongoDB conectado'))
  .catch(err => console.log(err));

app.get('/', (req, res) => res.send('API funcionando'));

const PORT = config.port;
app.listen(PORT, () => console.log(`Servidor corriendo en el puerto ${PORT}`));


