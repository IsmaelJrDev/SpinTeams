require('dotenv').config();
const express = require('express');
const cors = require('cors');
const passport = require('passport');

const connectDB = require('./config/db');
require('./config/passport.js');   // registra la estrategia

const app = express();

// Middlewares globales
app.use(cors({ origin: process.env.FRONTEND_URL }));
app.use(express.json());
app.use(passport.initialize());

// Rutas
app.use('/api/auth', require('./routes/auth.route.js'));

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Arrancar
const PORT = process.env.PORT || 3000;

connectDB().then(() => {
    app.listen(PORT, () => {
        console.log(`Auth service corriendo en puerto ${PORT}`);
    });
});