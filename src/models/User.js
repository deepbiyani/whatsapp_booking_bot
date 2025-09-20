const mongoose = require('mongoose');
const userSchema = new mongoose.Schema({
    name: String,
    email: { type: String, unique: true, sparse: true },
    phone: String,
    whatsapp: String,
    password: String, // store hashed passwords
    role: { type: String, enum: ['admin', 'staff', 'user'], default: 'user' },
    createdAt: { type: Date, default: Date.now }

}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
