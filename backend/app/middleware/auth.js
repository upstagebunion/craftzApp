const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
    const token = req.header('Authorization');
    if (!token) {
        return res.status(401).json({ message: 'Acceso no autorizado.' });
    }
    try {
        const verified = jwt.verify(token, process.env.JWT_SECRET);
        req.user = verified;
        req.userId = verified.id;
        next();
    } catch (error) {
        res.status(400).json({ message: 'Token inválido.' });
    }
};
