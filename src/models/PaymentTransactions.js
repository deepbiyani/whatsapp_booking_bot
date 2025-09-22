// models/config.js
const mongoose = require('mongoose');

const PaymentTransactions = new mongoose.Schema({
    txnid: {
        type: String,
        required: true,
        unique: true, // ensures one key has only one config
        trim: true,
    },
    bookingId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Booking'
    },
    productinfo: {
        type: mongoose.Schema.Types.Mixed, // can store string, number, object, array
        required: true,
    },
    amount: {
        type: Number,
        default: '',
    },
    firstname: {
        type: String,
        default: true,
    },
    email: {
        type: String,
        default: true,
    },
    phone: {
        type: String,
        default: true,
    },
    status : {
        type: String,
        default: "PENDING",
    }
}, { timestamps: true });

module.exports = mongoose.model('PaymentTransactions', PaymentTransactions);
