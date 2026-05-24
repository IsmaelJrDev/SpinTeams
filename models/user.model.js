// models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const SALT_ROUNDS = 12;

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  emailVerified: {
    type: Boolean,
    default: false
  },
  nombre: {
    type: String,
    trim: true
  },
  apellido: {
    type: String,
    trim: true
  },
  fotoUrl: {
    type: String,
    default: null
  },
  passwordHash: {
    type: String,
    default: null
  },
  googleId: {
    type: String,
    unique: true,
    sparse: true
  }
}, {
  timestamps: true
});

// ─── Pre-save: hashea el password antes de guardar ───
userSchema.pre('save', async function () {
  if (!this.isModified('passwordHash') || !this.passwordHash) return;
  this.passwordHash = await bcrypt.hash(this.passwordHash, SALT_ROUNDS);
});

// ─── Método: comparar password en login ──────────────
userSchema.methods.compararPassword = async function (passwordIngresada) {
  if (!this.passwordHash) {
    throw new Error('Esta cuenta usa Google para autenticarse');
  }
  return bcrypt.compare(passwordIngresada, this.passwordHash);
};

// ─── Virtual: nombre completo ─────────────────────────
userSchema.virtual('nombreCompleto').get(function () {
  if (this.nombre && this.apellido) return `${this.nombre} ${this.apellido}`;
  if (this.nombre) return this.nombre;
  return this.email;
});

// ─── Nunca exponer passwordHash en respuestas JSON ────
userSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    delete ret.passwordHash;
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model('User', userSchema);