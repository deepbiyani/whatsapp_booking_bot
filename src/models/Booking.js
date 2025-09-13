const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema({
    name: String,
    email: String,
    phone: String,
    type: { type: String, enum: ["SINGLE", "COUPLE", "GROUP"] },
    whatsapp: String,
    quantity: Number,
    amount: Number,
    paid: { type: Boolean, default: false },
    passSent: { type: Boolean, default: false },
    passFile: { type: String, default: null },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Booking", bookingSchema);
