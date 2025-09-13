const express = require("express");
const router = express.Router();
const Booking = require("../models/Booking");

// Get all bookings
router.get("/", async (req, res) => {
    console.log("GET /api/bookings hit");   // 👈 add this
    try {
        const bookings = await Booking.find().sort({ createdAt: -1 });
        console.log(bookings);   // 👈 add this
        res.json({ success: true, data: bookings });
    } catch (error) {
        console.error("Error fetching bookings:", error);
        res.status(500).json({ success: false, message: "Error fetching bookings", error });
    }
});

// Get booking by ID
router.get("/:id", async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ success: false, message: "Booking not found" });
    res.json({ success: true, data: booking });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching booking", error });
  }
});

router.get("/register-entry/:id", async (req, res) => {
    try {
        // Find the booking by ID
        const booking = await Booking.findById(req.params.id);

        if (!booking) {
            return res.status(404).json({
                success: false,
                message: "Booking not found"
            });
        }

        // Update entry details
        booking.entryTime = new Date(); // Current timestamp
        booking.entryStatus = "Entered"; // Mark as entered

        await booking.save();

        res.json({
            success: true,
            message: "Entry registered successfully",
            data: booking
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Error registering entry",
            error: error.message
        });
    }
});


module.exports = router;

