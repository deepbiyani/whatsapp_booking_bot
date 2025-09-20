const mongoose = require('mongoose');

const DiscountHistorySchema = new mongoose.Schema({
    // store percent or fixed discount and metadata
    type: { type: String, enum: ['PERCENT', 'FIXED'], default: 'PERCENT' },
    value: Number, // percent (like 10) or fixed amount
    effectiveDate: { type: Date, required: true }, // when this discount became active
    note: String,
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now }
});

const planSchema = new mongoose.Schema({
    title: { type: String, required: true, unique: true },
    description: String,
    basePrice: { type: Number, required: true },
    active: { type: Boolean, default: true },
    allowedEntries: { type: Number, default: 1 },
    // Keep full history of discount changes
    discountHistory: [DiscountHistorySchema],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('Plan', planSchema);
