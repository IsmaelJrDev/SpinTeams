// controllers/auth.controller.js
const jwt = require('jsonwebtoken');
const User = require('../models/user.model.js');

const generarToken = (userId) => {
    return jwt.sign(
        { id: userId },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
    );
};

// ─── POST /api/auth/register ──────────────────
exports.register = async (req, res) => {
    try {
        const { email, password, nombre, apellido } = req.body;

        const existe = await User.findOne({ email });
        if (existe) {
            return res.status(409).json({ message: 'El email ya está registrado' });
        }

        const user = await User.create({
            email,
            nombre,
            apellido,
            passwordHash: password   // el pre-save middleware hashea esto
        });

        const token = generarToken(user._id);

        res.status(201).json({ token, user });

    } catch (err) {
        res.status(500).json({ message: 'Error en registro', error: err.message });
    }
};

// ─── POST /api/auth/login ─────────────────────
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });

        // Mismo mensaje para "no existe" y "password incorrecto"
        // Nunca le digas al cliente cuál de los dos falló (enumeración de usuarios)
        if (!user) {
            return res.status(401).json({ message: 'Credenciales inválidas' });
        }

        const esValida = await user.compararPassword(password);
        if (!esValida) {
            return res.status(401).json({ message: 'Credenciales inválidas' });
        }

        const token = generarToken(user._id);

        res.json({ token, user });

    } catch (err) {
        // compararPassword lanza error si la cuenta es de Google
        if (err.message.includes('Google')) {
            return res.status(400).json({ message: err.message });
        }
        res.status(500).json({ message: 'Error en login', error: err.message });
    }
};

// ─── GET /api/auth/google/callback ───────────
exports.googleCallback = async (req, res) => {
    try {
        // req.user ya viene del middleware de Passport
        const token = generarToken(req.user._id);

        // Redirige al frontend con el token en query param
        // En producción usa fragmento de URL (#) o una pantalla intermedia
        res.redirect(`${process.env.FRONTEND_URL}/auth/callback?token=${token}`);

    } catch (err) {
        res.status(500).json({ message: 'Error en Google callback' });
    }
};

// ─── GET /api/auth/me ─────────────────────────
exports.me = async (req, res) => {
    // req.user lo inyecta verifyToken
    res.json({ user: req.user });
};

// ─── POST /api/auth/logout ────────────────────
exports.logout = async (req, res) => {
    // Con JWT stateless no hay nada que invalidar en servidor
    // El cliente elimina el token de su lado
    // Si implementas blacklist de tokens, va aquí
    res.json({ message: 'Sesión cerrada' });
};