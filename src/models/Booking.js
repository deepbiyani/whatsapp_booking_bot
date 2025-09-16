const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema({
    name: String,
    email: String,
    phone: String,
    type: { type: String }, //, enum: ["SINGLE", "COUPLE", "GROUP", "REGULAR"]
    whatsapp: String,
    quantity: Number,
    members: Number,
    amount: Number,
    discount: { type: Number, default: 0 },
    discountType: { type: String, default: null },
    total: Number,
    paid: { type: Boolean, default: false },
    passSent: { type: Boolean, default: false },
    passFile: { type: String, default: null },
    comment: { type: String, default: null },
    entryTime: { type: Date, default: null },
    entryStatus: { type: String, default: "Pending" },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Booking", bookingSchema);
