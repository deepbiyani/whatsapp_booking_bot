const mongoose = require("mongoose");
const logger = require("../utils/logger");
require("dotenv").config();

const connectDB = async () => {
    try {
        console.log(process.env.MONGO_URL);
        await mongoose.connect(process.env.MONGO_URL);
        logger.info("✅ MongoDB connected");
    } catch (err) {
        logger.error("❌ MongoDB connection error: " + err.message);
        process.exit(1);
    }
};

module.exports = connectDB;
