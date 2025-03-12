const express = require('express');
const { registrar, login, verificarToken } = require('../controllers/authController');
const router = express.Router();

router.post('/register', registrar);
router.post('/login', login);
router.get('/tokenVerify', verificarToken);

module.exports = router;
