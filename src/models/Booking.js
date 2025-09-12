const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema({
    phone: String,
    event: String,
    type: { type: String, enum: ["SINGLE", "COUPLE", "GROUP"] },
    amount: Number,
    paid: { type: Boolean, default: false },
    passSent: { type: Boolean, default: false },
    passFile: { type: String, default: null },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Booking", bookingSchema);
