const express = require("express");
const router = express.Router();
const Booking = require("../models/Booking");
const {generatePassFromHtml} = require("../services/passService");
const fs = require("fs");
const path = require("path");

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
router.post("/update", async (req, res) => {
    try {
        console.log(req.body)
        const { _id, paid, entryStatus } = req.body;

        if (!_id) {
            return res.status(400).json({ success: false, message: "Booking ID is required" });
        }

        // Find booking by ID
        const booking = await Booking.findById(_id);

        if (!booking) {
            return res.status(404).json({ success: false, message: "Booking not found" });
        }

        // Update payment if provided
        if (typeof paid === "boolean") {
            booking.paid = paid;
        }

        // Update entry if provided
        if (typeof entryStatus === "string") {
            booking.entryStatus = entryStatus;
            booking.entryTime = new Date(); // mark entry timestamp
        }

        await booking.save();

        res.json({
            success: true,
            message: "Booking updated successfully",
            data: booking
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Error updating booking",
            error: error.message
        });
    }
});

router.get("/pass/:id", async (req, res) => {

    try {
        const booking = await Booking.findById(req.params.id);

        if (!booking) {
            return res.status(404).json({ success: false, message: "Booking not found" });
        }

        if (!booking.paid) {
            return res.status(403).json({ success: false, message: "Payment not completed" });
        }

        // Create passes directory if not exists
        const passesDir = path.join(__dirname, "../../passes");
        if (!fs.existsSync(passesDir)) fs.mkdirSync(passesDir);

        const filePath = path.join(passesDir, `${booking._id}_pass.pdf`);

        await generatePassFromHtml(booking, filePath);

        res.download(filePath, `${booking._id}_pass.pdf`);

    } catch (error) {
        console.error("Error generating pass:", error);
        res.status(500).json({ success: false, message: "Error generating pass", error: error.message });
    }
});


module.exports = router;

