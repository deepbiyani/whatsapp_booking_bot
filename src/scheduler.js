const { getPendingPasses } = require("./services/bookingService");
const { generatePassFromHtml } = require("./services/passService");
const { MessageMedia } = require("whatsapp-web.js");
const path = require("path");
const fs = require("fs");
const logger = require("./utils/logger");

function startScheduler(client) {
    setInterval(async () => {
        // logger.info("🔍 Checking pending passes...");
        try {
            const bookings = await getPendingPasses();
            for (const booking of bookings) {
                const outputPath = path.join("passes", `${booking._id}_pass.pdf`);
                if (!fs.existsSync("passes")) fs.mkdirSync("passes");

                await generatePassFromHtml(booking, outputPath);

                try {
                    const media = MessageMedia.fromFilePath(outputPath);

                    const number = `91${booking.phone}@c.us`
                    const message = `🎉 Thank You for Your Booking! 🎉\nHello ${booking.name},\n\nYour booking for Divine Events has been successfully received ✅.\n📌 Pass Type: ${booking.type}\n👥 Members: ${booking.members}\n💰 Amount Paid: ₹${booking.totalPaid}\n\nYour entry pass will be valid on Event Day. Kindly show this confirmation at the gate for smooth entry.\n\n✨ We look forward to celebrating with you at Divine Events!\n\nFor any queries, reply to this message or contact our support 📞 7058746046.\n\n– Team Divine Events 🌟`;
                    await client.sendMessage(number, media, { sendMediaAsDocument: true, caption : message });

                    booking.passSent = true;
                    booking.passFile = outputPath;
                    await booking.save();
                    logger.info(`✅ Pass sent to ${booking.phone}`);
                } catch (err) {
                    logger.error("❌ Failed to send pass: " + err);
                }
            }
        } catch (err) {
            logger.error("❌ Scheduler error: " + err);
        }
    }, 60 * 1000);
}

module.exports = { startScheduler };
