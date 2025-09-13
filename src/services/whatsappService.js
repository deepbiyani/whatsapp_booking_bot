const { Client, LocalAuth, MessageMedia } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");
const fs = require("fs");
const path = require("path");
const { createBooking, markAsPaid, getLatestBooking } = require("./bookingService");
const { generatePassFromHtml } = require("./passService");
const logger = require("../utils/logger");

function setupWhatsAppBot() {
    const client = new Client({ authStrategy: new LocalAuth({ clientId: "devineEvent", dataPath: "./sessions"  }) });
    // const client = new Client({
    //     authStrategy: new LocalAuth({
    //         clientId: "devineEvent",
    //         dataPath: __dirname + "./sessions"
    //     }),
    //     puppeteer: {
    //         headless: true,
    //         args: ["--no-sandbox", "--disable-setuid-sandbox"]
    //     }
    // });
    client.on("qr", (qr) => {
        qrcode.generate(qr, { small: true });
        logger.info("📲 Scan QR code with WhatsApp");
    });

    client.on("ready", () => {
        logger.info("✅ WhatsApp bot is ready!");
    });

    client.on("authenticated", () => {
        console.log("✅ Authenticated and session saved");
    });

    client.on("auth_failure", (msg) => {
        console.error("❌ Authentication failed", msg);
    });

    client.on("disconnected", (reason) => {
        console.log("⚠️ Disconnected:", reason);
    });

    client.on("message", async (msg) => {
        try {
            const text = msg.body.trim().toUpperCase();

            logger.info("New Message: " + text);

            if (text.startsWith("NAME")) {

                const match1 = text.split('NAME:');
                const nameMatch = match1[1].trim().split("EMAIL:")[0].trim();
                // const nameMatch = match ? match[1].trim() : null;
                // const nameMatch = text.match(/NAME:\s*([^\s]+)/);
                const emailMatch = text.match(/EMAIL:\s*([^\s]+)/);
                const phoneMatch = text.match(/PHONE:\s*(\d{10})/);
                const passMatch = text.match(/PASS:\s*(.*?)\s+/);
                const quantityMatch = text.match(/QUANTITY:\s*(\d+)/);
                const totalMatch = text.match(/TOTAL:\s*₹+(\d+)/);

                const data = {
                    name: nameMatch ? nameMatch : match1[0],
                    email: emailMatch ? emailMatch[1] : null,
                    phone: phoneMatch ? phoneMatch[1] : null,
                    type: passMatch ? passMatch[1].trim() : null,
                    quantity: quantityMatch ? parseInt(quantityMatch[1]) : null,
                    amount: totalMatch ? parseInt(totalMatch[1]) : null,
                    whatsapp: msg.from
                };

                // if (parts.length < 3) {
                //     msg.reply("❌ Format: BOOK <EVENT_NAME> <TYPE>");
                //     return;
                // }

                const booking = await createBooking(data);
                console.log(booking)
                const upiLink = `upi://pay?pa=${process.env.UPI_ID}&pn=${encodeURIComponent("Event Organizer")}&am=${booking.amount}&cu=INR&tn=${booking.event}`;

                await msg.reply(`✅ Booking received for *${booking.name}*\n💰 Amount tp be paid: ₹${booking.amount}\nPay here:\n${upiLink}\nReply with *PAID* after payment.`);
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
            logger.error("❌ Error handling message: " + err);
        }
    });

    client.initialize();
    return client;
}

module.exports = { setupWhatsAppBot };
