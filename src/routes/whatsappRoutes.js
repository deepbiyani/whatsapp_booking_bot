const express = require("express");
const router = express.Router();
const fs = require("fs");
const path = require("path");
// Get all bookings
router.get("/clear-session", async (req, res) => {
    try {
        const sessionPath = path.join(__dirname, "../../sessions");

        fs.rm(sessionPath, { recursive: true, force: true }, (err) => {
            if (err) {
                console.error("Error removing folder:", err);
            } else {
                console.log("Folder removed successfully!");
            }
        });
        const wwebjsCachePath = path.join(__dirname, "../../.wwebjs_cache");
        fs.rm(wwebjsCachePath, { recursive: true, force: true }, (err) => {
            if (err) {
                console.error("Error removing folder:", err);
            } else {
                console.log("Folder removed successfully!");
            }
        });
        res.json({ success: true, message : "Session cleared" });
    } catch (error) {
        console.error("Error fetching passTypes:", error);
        res.status(500).json({ success: false, message: "Error fetching passTypes", error });
    }
});

module.exports = router;

