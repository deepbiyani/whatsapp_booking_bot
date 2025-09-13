const express = require("express");
const router = express.Router();
const PassType = require("../models/PassType");

// Get all bookings
router.get("/", async (req, res) => {
    console.log("GET /api/passes hit");   // 👈 add this
    try {
        const passTypes = await PassType.find({isActive: true}).sort({ createdAt: -1 });
        console.log(passTypes);   // 👈 add this
        res.json({ success: true, data: passTypes });
    } catch (error) {
        console.error("Error fetching passTypes:", error);
        res.status(500).json({ success: false, message: "Error fetching passTypes", error });
    }
});

module.exports = router;

