const mongoose = require('mongoose');

const promoSchema = new mongoose.Schema({
    code: { type: String, unique: true, required: true },
    type: { type: String, enum: ['PERCENT', 'FIXED'], default: 'PERCENT' },
    value: { type: Number, required: true },
    active: { type: Boolean, default: true },
    usageLimit: { type: Number, default: null }, // total uses allowed
    usedCount: { type: Number, default: 0 },
    validFrom: Date,
    validTo: Date,
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    meta: Object
}, { timestamps: true });

module.exports = mongoose.model('PromoCode', promoSchema);
