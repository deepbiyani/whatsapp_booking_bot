const { getPendingPasses } = require("./services/bookingService");
const { generatePassFromHtml } = require("./services/passService");
const { MessageMedia } = require("whatsapp-web.js");
const path = require("path");
const fs = require("fs");
const logger = require("./utils/logger");

function startScheduler(client) {
    setInterval(async () => {
        logger.info("🔍 Checking pending passes...");
        try {
            const bookings = await getPendingPasses();
            for (const booking of bookings) {
                const outputPath = path.join("passes", `pass_${booking._id}.pdf`);
                if (!fs.existsSync("passes")) fs.mkdirSync("passes");

                await generatePassFromHtml(booking, outputPath);
                const media = MessageMedia.fromFilePath(outputPath);

                await client.sendMessage(booking.phone, media, { sendMediaAsDocument: true });
                booking.passSent = true;
                booking.passFile = outputPath;
                await booking.save();
                logger.info(`✅ Pass sent to ${booking.phone}`);
            }
        } catch (err) {
            logger.error("❌ Scheduler error: " + err.message);
        }
    }, 300 * 1000);
}

module.exports = { startScheduler };
