require("dotenv").config();
const connectDB = require("./config/db");
const { setupWhatsAppBot } = require("./services/whatsappService");
const { startScheduler } = require("./scheduler");

(async () => {
    await connectDB();
    const client = setupWhatsAppBot();
    startScheduler(client);
})();
