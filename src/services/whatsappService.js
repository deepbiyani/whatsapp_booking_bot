const { Client, LocalAuth, MessageMedia } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");
const fs = require("fs");
const path = require("path");
const { createBooking, markAsPaid, getLatestBooking } = require("./bookingService");
const { generatePassFromHtml } = require("./passService");
const logger = require("../utils/logger");

function setupWhatsAppBot() {
    const client = new Client({ authStrategy: new LocalAuth({ clientId: "devineEvent" }) });

    client.on("qr", (qr) => {
        qrcode.generate(qr, { small: true });
        logger.info("📲 Scan QR code with WhatsApp");
    });

    client.on("ready", () => {
        logger.info("✅ WhatsApp bot is ready!");
    });

    client.on("message", async (msg) => {
        try {
            const text = msg.body.trim().toUpperCase();

            logger.info("New Message: " + text);

            if (text.startsWith("BOOK")) {
                const parts = msg.body.split(" ");
                if (parts.length < 3) {
                    msg.reply("❌ Format: BOOK <EVENT_NAME> <TYPE>");
                    return;
                }

                const booking = await createBooking(msg.from, parts[1], parts[2]);
                const upiLink = `upi://pay?pa=${process.env.UPI_ID}&pn=${encodeURIComponent("Event Organizer")}&am=${booking.amount}&cu=INR&tn=${booking.event}`;

                await msg.reply(`✅ Booking for *${booking.event}*\n💰 Amount: ₹${booking.amount}\nPay here:\n${upiLink}\nReply with *PAID* after payment.`);
            }

            else if (text === "PAID") {
                const booking = await markAsPaid(msg.from);
                if (!booking) {
                    msg.reply("❌ No unpaid booking found.");
                    return;
                }

                msg.reply("✅ Payment confirmed! Generating your pass...");

                const outputPath = path.join("passes", `pass_${booking._id}.pdf`);
                await generatePassFromHtml(booking, outputPath);

                const media = MessageMedia.fromFilePath(outputPath);
                await client.sendMessage(msg.from, media, { sendMediaAsDocument: true });
                booking.passSent = true;
                booking.passFile = outputPath;
                await booking.save();
            }

            else if (text === "HELLO") {
                msg.reply("👋 Hi! Use:\nBOOK <EVENT_NAME> <TYPE>\nTypes: SINGLE / COUPLE / GROUP");
            }
        } catch (err) {
            logger.error("❌ Error handling message: " + err.message);
        }
    });

    client.initialize();
    return client;
}

module.exports = { setupWhatsAppBot };
