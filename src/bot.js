require("dotenv").config();
const connectDB = require("./config/db");
const { setupWhatsAppBot } = require("./services/whatsappService");
const { startScheduler } = require("./scheduler");

const express = require("express");
const bookingRoutes = require("./routes/bookingRoutes");


const app = express();
app.use(express.json());

(async () => {
    await connectDB();
    const client = setupWhatsAppBot();
    startScheduler(client);

    app.use("/api/bookings", bookingRoutes);

    // Start server
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

})();

app.use("/api/bookings", bookingRoutes);

