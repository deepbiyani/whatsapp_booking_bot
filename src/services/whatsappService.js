const { Client, LocalAuth, MessageMedia } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");
const path = require("path");
const { createBooking } = require("./bookingService");
const { generatePassFromHtml } = require("./passService");
const logger = require("../utils/logger");
const Booking = require("../models/Booking");
const PassType = require("../models/PassType");

function setupWhatsAppBot() {
    const client = new Client({ authStrategy: new LocalAuth({ clientId: "devineEvent"  }) });

    client.on("loading_screen", (percent, message) => {
        console.log("LOADING SCREEN", percent, message);
    });

    client.on("message_create", (message) => {
        // Fired when you send or receive a message
        console.log("MESSAGE CREATED:", message.body);
    });

    // client.on("message_revoke_everyone", (message, revokedMsg) => {
    //     console.log("MESSAGE REVOKED EVERYONE:", message, revokedMsg);
    // });

    // client.on("message_revoke_me", (message) => {
    //     console.log("MESSAGE REVOKED ME:", message);
    // });

    // client.on("message_ack", (message, ack) => {
    //     // ack: -1 = failed, 0 = pending, 1 = sent, 2 = received, 3 = read, 4 = played
    //     console.log("MESSAGE ACK:", message.body, ack);
    // });

    client.on("media_uploaded", (message) => {
        console.log("MEDIA UPLOADED:", message.body);
    });

    // client.on("group_join", (notification) => {
    //     console.log("GROUP JOIN:", notification);
    // });
    //
    // client.on("group_leave", (notification) => {
    //     console.log("GROUP LEAVE:", notification);
    // });
    //
    // client.on("group_update", (notification) => {
    //     console.log("GROUP UPDATE:", notification);
    // });
    //
    // client.on("change_state", (state) => {
    //     console.log("CHANGE STATE:", state);
    // });

    client.on("change_battery", (batteryInfo) => {
        console.log("BATTERY INFO:", batteryInfo); // { battery: % , plugged: boolean }
    });

    client.on("presence_update", (update) => {
        console.log("PRESENCE UPDATE:", update);
    });

    client.on("call", (call) => {
        console.log("CALL RECEIVED:", call);
        // Example: auto reject
        // call.reject();
    });

    /**
     * 🔹 Contact & chat updates
     */
    // client.on("contact_changed", (message, oldId, newId, isContact) => {
    //     console.log("CONTACT CHANGED:", { message, oldId, newId, isContact });
    // });

    client.on("chat_removed", (chat) => {
        console.log("CHAT REMOVED:", chat);
    });

    client.on("chat_archived", (chat, currState, prevState) => {
        console.log("CHAT ARCHIVED:", chat, currState, prevState);
    });

    client.on("chat_unread", (chat) => {
        console.log("CHAT UNREAD:", chat);
    });

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

            if (text.startsWith("TICKET BOOKING REQUEST")) {

                const match1 = text.split('NAME:');
                const nameMatch = match1[1].trim().split("EMAIL:")[0].trim();
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

                const passType = await PassType.findOne({ name: data.type.toUpperCase(), isActive: true }).sort({ createdAt: -1 });

                if (!passType) {
                    await msg.reply("✅ Invalid booking type");
                }

                data.amount = passType.price;
                data.total = passType.price * data.quantity;

                const booking = await createBooking(data);
                console.log(booking)
                const upiLink = `upi://pay?pa=${process.env.UPI_ID}&pn=${encodeURIComponent("Event Organizer")}&am=${booking.amount}&cu=INR&tn=EventPass`;

                await msg.reply(`✅ Booking received for *${booking.name}*\n💰 Amount to be paid: ₹${booking.amount}\nPay here:\n${upiLink}\n Reply with *PAID* after payment. \n Hold on till we verify your payment. \n Thank You `);
            }

            else if (text === "PAID") {

                const phone = msg.from;
                const booking = await Booking.findOne({ 'whatsapp': phone }).sort({ createdAt: -1 });

                if (!booking) {
                    msg.reply("❌ Booking not found for this number");
                }

                if (booking.paid) {
                    if (booking.passSent) {
                        msg.reply("❌ No unpaid booking found. Pass Already sent");
                        const media = MessageMedia.fromFilePath(booking.passFile);
                        await client.sendMessage(phone, media, { sendMediaAsDocument: true });
                    } else {
                        msg.reply("✅ Payment confirmed! Generating your pass...");

                        const outputPath = path.join("passes", `pass_${booking._id}.pdf`);
                        await generatePassFromHtml(booking, outputPath);

                        const media = MessageMedia.fromFilePath(outputPath);
                        await client.sendMessage(msg.from, media, { sendMediaAsDocument: true });
                        booking.passSent = true;
                        booking.passFile = outputPath;
                        await booking.save();
                    }
                } else {
                    msg.reply("❌ Payment is still not updated");
                }
            }

            else if (text === "HELLO") {
                msg.reply("👋 Hi! Use:\nBOOK <EVENT_NAME> <TYPE>\nTypes: SINGLE / COUPLE / GROUP");
            }
        } catch (err) {
            await msg.reply("✅ Invalid message format");
            logger.error("❌ Error handling message: " + err);
        }
    });

    client.initialize();
    return client;
}

module.exports = { setupWhatsAppBot };
