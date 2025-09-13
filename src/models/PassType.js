const mongoose = require("mongoose");

const passTypeSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },   // e.g., "Couple Pass"
    description: String,                                    // optional
    price: { type: Number, required: true },                // current price
    currency: { type: String, default: "INR" },
    entriesAllowed: { type: Number, required: true },       // ✅ e.g., 1 for Single, 2 for Couple, 5 for Group

    isActive: { type: Boolean, default: true },             // enable/disable pass
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});


module.exports = mongoose.model("passType", passTypeSchema);
