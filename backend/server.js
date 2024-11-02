const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const productosRouter = require('./app/routes/productos');
require('dotenv').config();

const app = express();
app.use(cors({
    origin: 'http://localhost:3000', // URL del frontend
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
}));
app.use(express.json());
app.use('/api/productos', productosRouter);

// Conexión a MongoDB
mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
}).then(() => console.log('MongoDB conectado'))
  .catch(err => console.log(err));

app.get('/', (req, res) => res.send('API funcionando'));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Servidor corriendo en el puerto ${PORT}`));


