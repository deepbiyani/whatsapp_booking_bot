const express = require("express");
const mongoose = require("mongoose");
require("dotenv").config();

const bookingRoutes = require("./src/routes/bookingRoutes");

const app = express();
app.use(express.json());

// MongoDB connection
mongoose.connect(process.env.MONGO_URL, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log("MongoDB connected"))
.catch(err => console.error("MongoDB connection error:", err));

app.use("/api/bookings", bookingRoutes);

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

