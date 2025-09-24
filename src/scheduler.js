const { getPendingPasses, getFailedPaymentPasses } = require("./services/bookingService");
const { generatePassFromHtml } = require("./services/passService");
const { MessageMedia } = require("whatsapp-web.js");
const path = require("path");
const fs = require("fs");
const logger = require("./utils/logger");
const {getPaymentLink} = require("./services/paymentService");
const PaymentTransactions = require("./models/PaymentTransactions");
const Booking = require("./models/Booking");

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
                    await client.sendMessage(`91${booking.phone}@c.us`, "✅ Payment confirmed! Generating your pass...");

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

            const paymentFailedBooking = await getFailedPaymentPasses();

            for (const failedBooking of paymentFailedBooking) {
                const txnid = "txn" + Date.now();

                console.log(txnid)
                const paymentData = { amount: failedBooking.amountAfterDiscounts, productinfo : "Pass", firstname : failedBooking.name, email: failedBooking.email, failedBooking:failedBooking.phone, txnid, bookingId: failedBooking._id};
                const paymentLink = await getPaymentLink(paymentData);

                // const PaymentTransaction = new PaymentTransactions(paymentData);
                // await PaymentTransaction.save();

                const number = `91${failedBooking.phone}@c.us`
                let message = `Dear *${failedBooking.name}*\nYour last payment transaction was failed \n💰 Amount to be paid: ₹${failedBooking.amountAfterDiscounts}\nPay on below link : \n${paymentLink}\n\n Hold on till we verify your payment. \nThank You `;
                await client.sendMessage(number, message);

                const booking = await Booking.findOne({ '_id': failedBooking._id }).sort({ createdAt: -1 });
                booking.paymentStatus = 'PENDING';
                await booking.save();
            }


            } catch (err) {
            logger.error("❌ Scheduler error: " + err);
        }
    }, 30 * 1000);
    if (process.env.ENV == "PROD") {

        setInterval(async () => {
            const API_URL = "https://whatsapp-booking-bot-by57.onrender.com/api/payment/pay/txn_test";

            try {
                const res = await fetch(API_URL);
                const data = await res.json();
                console.log("API response:", data);
            } catch (err) {
                console.error("Error calling API:", err.message);
            }
        }, 10 * 60 * 999);
    }
}

module.exports = { startScheduler };
