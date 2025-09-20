const { Client, LocalAuth, MessageMedia } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");
const path = require("path");
const { generatePassFromHtml } = require("./passService");
const logger = require("../utils/logger");
const Booking = require("../models/Booking");
const PassType = require("../models/PassType");
const Plan = require("../models/Plan");
const { createBooking } = require("../controllers/bookingController");

function setupWhatsAppBot() {
    const clientId = process.env?.WHATSAPP_SESSION ?? 'local' ;
    console.log("Loading whatsapp session of " + clientId)
    const client = new Client({ authStrategy: new LocalAuth({ clientId  }) });

    client.on("loading_screen", (percent, message) => {
        console.log("LOADING SCREEN", percent, message);
    });

    client.on("message_create", (message) => {
        // Fired when you send or receive a message
        console.log("Message Sent to:", message.to);
    });

    // client.on("message_revoke_everyone", (message, revokedMsg) => {
    //     console.log("MESSAGE REVOKED EVERYONE:", message, revokedMsg);
    // });

    // client.on("message_revoke_me", (message) => {
    //     console.log("MESSAGE REVOKED ME:", message);
    // });

    client.on("message_ack", (message, ack) => {
        // ack: -1 = failed, 0 = pending, 1 = sent, 2 = received, 3 = read, 4 = played
        console.log("MESSAGE ACK:", message.body, ack);
    });

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
            logger.info("New Message from "+msg.from+" : " + text);

            if (text.startsWith("TICKET BOOKING REQUEST")) {

                //Check if your have existing booking
                const existingBooking = await Booking.findOne({ 'whatsapp': msg.from, 'paid': false }).sort({ createdAt: -1 });

                // if (existingBooking) {
                //     await msg.reply(`❌ You have unpaid booking *${existingBooking.name}*\n💰 Amount to be paid: ₹${existingBooking.amountAfterDiscounts}\nPay on below upi id : \n${process.env.UPI_ID} (Kirtikumar M Sanchela)\n\nReply with *PAID* after payment. \n\nHold on till we verify your payment. \nThank You `);
                //     return true
                // }

                const match1 = text.split('NAME:');
                const nameMatch = match1[1].trim().split("EMAIL:")[0].trim();
                const emailMatch = text.match(/EMAIL:\s*([^\s]+)/);
                const phoneMatch = text.match(/PHONE:\s*(\d{10})/);
                const passMatch = text.match(/(?<=PASS:\s)(.*?)(?=\s-\s₹)/);
                // const passMatch = text.match(/PASS:\s*(.*?)\s+/);
                const quantityMatch = text.match(/QUANTITY:\s*(\d+)/);
                const totalMatch = text.match(/TOTAL:\s*₹+(\d+)/);

                //New Logic from here
                // name:John Doe
                // phone:8446662683
                // whatsapp:8446662683
                // passes[0][planId]:68cbd06a5e99fe27b114d916
                // passes[0][quantity]:2
                // passes[1][planId]:68cbd3a85e99fe27b114d92b
                // passes[1][quantity]:1
                //promoCode:EARLYBIRD10

                // const requestedPassType = passMatch ? passMatch[1].trim() : null;
                const requestedPassType =  passMatch ? passMatch[1].trim() : null;
                console.log(requestedPassType)
                const quantity = quantityMatch ? parseInt(quantityMatch[1]) : null
                const pass = await Plan.findOne({ title: requestedPassType, active: true }).sort({ createdAt: -1 });

                console.log(passMatch, requestedPassType, pass)

                const incomingPasses = [{
                    planId : pass._id,
                    quantity
                }]

                const data = {
                    name: nameMatch ? nameMatch : match1[0],
                    email: emailMatch ? emailMatch[1] : null,
                    phone: phoneMatch ? phoneMatch[1] : null,
                    type: requestedPassType,
                    quantity,
                    amount: totalMatch ? parseInt(totalMatch[1]) : null,
                    whatsapp: msg.from,
                    incomingPasses,
                    members: pass.allowedEntries * quantity,
                    passes: incomingPasses,
                    user: '68cbcdae5e99fe27b114d8fe'
                };

                const newBooking = await createBooking(data);
                console.log(newBooking)
                const totalAfterDiscount = newBooking.passes.reduce((sum, pass) => {
                    const amountAfterDiscount =
                        pass.quantity * pass.unitPrice -
                        (pass.planDiscountAmount + pass.promoDiscountAmount);
                    return sum + amountAfterDiscount;
                }, 0);

                // const upiLink = `upi://pay?pa=${process.env.UPI_ID}&pn=${encodeURIComponent("Event Organizer")}&am=${booking.amount}&cu=INR&tn=EventPass`;
                await msg.reply(`✅ Booking received for *${newBooking.name}*\n💰 Amount to be paid: ₹${newBooking.amountAfterDiscounts}\nPay on below upi id : \n${process.env.UPI_ID} (Kirtikumar M Sanchela)\n\nReply with *PAID* after payment. \n\nHold on till we verify your payment. \nThank You `);

            }

            else if (text === "PAID") {

                const phone = msg.from;
                const booking = await Booking.findOne({ 'whatsapp': phone }).sort({ createdAt: -1 });
                // const booking = await Booking.findOne({ "_id": ObjectId("68ce46d5e440cd15482b0980") }).sort({ createdAt: -1 });

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
                        const message = `🎉 Thank You for Your Booking! 🎉\n"Hello ${booking.name},\n\nYour booking for Divine Events has been successfully received ✅.\n📌 Pass Type: ${booking.type}\n👥 Members: ${(booking.members)}\n💰 Amount Paid: ₹${booking.totalPaid}\n\nYour entry pass will be valid on Event Day. Kindly show this confirmation at the gate for smooth entry.\n\n✨ We look forward to celebrating with you at Divine Events!\n\nFor any queries, reply to this message or contact our support 📞 7058746046.\n\n– Team Divine Events 🌟`;

                        const media = MessageMedia.fromFilePath(outputPath);
                        await client.sendMessage(msg.from, media, { sendMediaAsDocument: true, caption: message});
                        booking.passSent = true;
                        booking.passFile = outputPath;
                        await booking.save();
                    }
                } else {
                    msg.reply("❌ Payment is still not updated");
                }
            }

            else if (text === "HELLO") {
                // msg.reply("👋 Hi! Use:\nBOOK <EVENT_NAME> <TYPE>\nTypes: SINGLE / COUPLE / GROUP");
            }
        } catch (err) {
            // await msg.reply("✅ Invalid message format");
            logger.error("❌ Error handling message: " + err);
        }
    });

    client.initialize();
    return client;
}

module.exports = { setupWhatsAppBot };
