const mongoose = require("mongoose");
const logger = require("../utils/logger");

const connectDB = async () => {
    try {
        await mongoose.connect("mongodb://127.0.0.1:27017/eventbot");
        logger.info("✅ MongoDB connected");
    } catch (err) {
        logger.error("❌ MongoDB connection error: " + err.message);
        process.exit(1);
    }
};

module.exports = connectDB;
