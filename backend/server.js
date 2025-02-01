const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const productosRouter = require('./app/routes/productos');
const authRouter = require('./app/routes/auth');
const ventasRoutes = require("./app/routes/ventas");
const config = require('./config');

const app = express();
app.use(cors({
    origin: ['http://localhost:3000', 'https://craftzapp.craftzstore.com'], // URL del frontend
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
}));
app.use(express.json());
app.use('/api/productos', productosRouter);
app.use('/auth', authRouter);
app.use("/api/ventas", ventasRoutes)

// Conexión a MongoDB
mongoose.connect(config.mongoURI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
}).then(() => console.log('MongoDB conectado'))
  .catch(err => console.log(err));

app.get('/', (req, res) => res.send('API funcionando'));

const PORT = config.port;
app.listen(PORT, () => console.log(`Servidor corriendo en el puerto ${PORT}`));


