const mongoose = require("mongoose");

const PassItemSchema = new mongoose.Schema({
    plan: { type: mongoose.Schema.Types.ObjectId, ref: 'Plan', required: true },
    quantity: { type: Number, default: 1 },
    // store price applied at booking time (base - planDiscount - promo portion)
    unitPrice: { type: Number, required: true },
    planDiscountId : { type: mongoose.Schema.Types.ObjectId, ref: 'Plan.discountHistory' },
    // calculated discount amount applied per unit from plan's active discount
    planDiscountAmount: { type: Number, default: 0 },
    // promo discount amount applied per unit (if promo affects passes)
    promoDiscountAmount: { type: Number, default: 0 },
    totalAmount: { type: Number, required: true }, // quantity * (unitPrice - discounts)
    status: { type: String, default: 'BOOKED' }, // e.g., BOOKED, CANCELLED, USED
    statusHistory: [
        {
            from: String,
            to: String,
            reason: String,
            changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
            at: { type: Date, default: Date.now }
        }
    ]
});

const PaymentSchema = new mongoose.Schema({
    amount: Number,
    method: String, // e.g., UPI/CARD/CASH
    paidAt: Date,
    proofUrl: String,
    txnId: String
});

const BookingSchema = new mongoose.Schema({
    name: String,
    email: String,
    phone: String,
    whatsapp: String,
    type: { type: String }, // SINGLE/COUPLE/GROUP/REGULAR etc
    quantity: Number, // total passes count (optional summary)
    members: Number,
    // who in your system
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    // array of pass line-items
    passes: [PassItemSchema],

    // promo applied (optional)
    promoCode: { type: mongoose.Schema.Types.ObjectId, ref: 'PromoCode' },

    // financials
    amountBeforeDiscounts: { type: Number, default: 0 },
    amountAfterDiscounts: { type: Number, default: 0 }, // total to pay
    totalPaid: { type: Number, default: 0 },

    // store payment records
    payments: [PaymentSchema],
    paid: { type: Boolean, default: false },             // enable/disable pass

    // booking-level status and history
    status: { type: String, default: 'CREATED' }, // CREATED, CONFIRMED, CANCELLED, COMPLETED
    statusHistory: [
        {
            from: String,
            to: String,
            reason: String,
            changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
            at: { type: Date, default: Date.now }
        }
    ],

    //Pass info
    passSent: { type: Boolean, default: false },
    passFile: { type: String, default: null },

    // meta
    notes: String,
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Booking', BookingSchema);
