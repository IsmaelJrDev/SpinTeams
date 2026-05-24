// middlewares/auth.middleware.js
const jwt = require('jsonwebtoken');
const User = require('../models/user.model.js');

exports.verifyToken = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader?.startsWith('Bearer ')) {
            return res.status(401).json({ message: 'Token requerido' });
        }

        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const user = await User.findById(decoded.id);
        if (!user) {
            return res.status(401).json({ message: 'Usuario no encontrado' });
        }

        req.user = user;  // disponible en todos los controllers siguientes
        next();

    } catch (err) {
        res.status(401).json({ message: 'Token inválido o expirado' });
    }
};