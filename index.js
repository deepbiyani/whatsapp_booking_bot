const { Client, LocalAuth, MessageMedia } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");
const PDFDocument = require("pdfkit");
const fs = require("fs");
require("dotenv").config();
const mongoose = require("mongoose");
const QRCode = require("qrcode"); // optional for QR code
const path = require("path");
const puppeteer = require("puppeteer");

// ====== MongoDB Setup ======
mongoose
    .connect(process.env.MONGO_URI)
    .then(() => console.log("✅ MongoDB connected"))
    .catch((err) => console.error("❌ MongoDB error:", err));

// Booking Schema
const bookingSchema = new mongoose.Schema({
    phone: String,
    event: String,
    amount: Number,
    paid: { type: Boolean, default: false },
    pass_sent: { type: Boolean, default: false },  // ✅ new flag
    pass_file: { type: String, default: null },   // ✅ path to PDF file
    createdAt: { type: Date, default: Date.now },
});
const Booking = mongoose.model("Booking", bookingSchema);


// ====== Setup WhatsApp client ======
const client = new Client({
    authStrategy: new LocalAuth(), // saves your session
});

client.on("qr", (qr) => {
    console.log("📲 Scan this QR code with WhatsApp (Linked Devices):");
    qrcode.generate(qr, { small: true });
});

client.on("ready", () => {
    console.log("✅ WhatsApp bot is ready!");
});

// ====== Handle messages ======
client.on("message", async (msg) => {
    console.log("📩 Message received:", msg.body);

    // Booking command
    if (msg.body.startsWith("BOOK")) {
        // Format: BOOK <EVENT_NAME> <AMOUNT>
        const parts = msg.body.split(" ");
        if (parts.length < 3) {
            msg.reply("❌ Use format: BOOK <EVENT_NAME> <AMOUNT>");
            return;
        }

        let amount;
        const eventName = parts[1];
        const type = parts[2];

        if (type.toUpperCase() === 'SINGLE') {
            amount = 400;
        } else if (type.toUpperCase() === 'COUPLE') {
            amount = 700;
        } else if (type.toUpperCase() === 'GROUP') {
            amount = 1300;
        } else {
            msg.reply("❌ Wrong booking type: Please choose from either SINGLE/COUPLE/GROUP");
            return
        }

        // Save booking in DB
        const booking = new Booking({
            phone: msg.from,
            event: eventName,
            amount,
            type,
            paid: false,
        });
        await booking.save();

        // Create UPI deeplink
        const upiId = "8446662683@ybl"; // change this to your UPI ID
        const payeeName = "Event Organizer";
        const upiLink = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(
            payeeName
        )}&am=${amount}&cu=INR&tn=${encodeURIComponent(
            eventName + " Ticket"
        )}`;

        await msg.reply(
            `✅ Booking started for *${eventName}*\n💰 Amount: ₹${amount}\n\nClick this link to pay:\n${upiLink}\n\nAfter payment, reply with *PAID* <TRANSACTION_ID>`
        );
    }

    // Payment confirmation
    else if (msg.body.toUpperCase() === "PAID") {
        const booking = await Booking.findOne({ phone: msg.from, paid: false }).sort({
            createdAt: -1,
        });

        if (!booking) {
            msg.reply("❌ No pending booking found. Send BOOK first.");
            return;
        }

        msg.reply("Thanks for your confirmation. Let us verify the payment. On successful verification you will receive the pass");

        // Mark as paid
        booking.paid = true;
        await booking.save();

        // Generate pass
        const fileName = `pass_${Date.now()}.pdf`;
        generatePass(booking, fileName, () => {
            msg.reply(`🎟️ Payment confirmed!\nHere is your pass for *${booking.event}*`);
            client.sendMessage(msg.from, fs.readFileSync(fileName), {
                sendMediaAsDocument: true,
            });
        });

    } else if (msg.body.toUpperCase() === "VERIFY") {
        const booking = await Booking.findOne({ phone: msg.from}).sort({
            createdAt: -1,
        });
        if (booking.paid == true) {
            const fileName = `pass_${booking.phone}.pdf`;
            generatePass(booking, fileName, () => {
                msg.reply(`🎟️ Payment confirmed!\nHere is your pass for *${booking.event}*`);
                client.sendMessage(msg.from, fs.readFileSync(fileName), {
                    sendMediaAsDocument: true,
                });
            });
        }
    }

    // Default
    else if (msg.body.toUpperCase() === "HELLO...") {
        msg.reply(
            "👋 Hi! To book an event, send:\nBOOK <EVENT_NAME> <TYPE>\n\nExample:\nBOOK DANDIYA_RASS COUPLE"
        );
    }
});


async function generatePass(booking, fileName, callback) {
    try {
        const doc = new PDFDocument({ size: "A4", margin: 50 });
        const stream = fs.createWriteStream(fileName);
        doc.pipe(stream);

        // ====== Background / Header ======
        doc
            .rect(0, 0, doc.page.width, 80)
            .fill("#4CAF50"); // green header

        doc
            .fillColor("white")
            .fontSize(26)
            .font("Helvetica-Bold")
            .text("Event Pass", { align: "center", valign: "center" });

        doc.moveDown(2);

        // ====== Event Info Box ======
        doc.fillColor("black");

        const startY = doc.y;
        doc.rect(50, startY, 500, 180).stroke("#4CAF50").lineWidth(2);

        doc.fontSize(16).font("Helvetica-Bold");
        doc.text("Event:", 60, startY + 20);
        doc.font("Helvetica").text(`${booking.event}`, 150, startY + 20);

        doc.font("Helvetica-Bold").text("Amount Paid:", 60, startY + 50);
        doc.font("Helvetica").text(`₹${booking.amount}`, 150, startY + 50);

        doc.font("Helvetica-Bold").text("Booking ID:", 60, startY + 50);
        doc.font("Helvetica").text(`${booking._id}`, 150, startY + 50);

        doc.font("Helvetica-Bold").text("Status:", 60, startY + 80);
        doc.font("Helvetica").text("Confirmed ✅", 150, startY + 80);

        doc.font("Helvetica-Bold").text("Issued At:", 60, startY + 110);
        doc.font("Helvetica").text(new Date().toLocaleString(), 150, startY + 110);

        doc.font("Helvetica-Bold").text("Phone:", 60, startY + 140);
        doc.font("Helvetica").text(booking.phone, 150, startY + 140);

        // ====== Optional QR Code ======
        const qrData = `Event: ${booking.event}\nName/Phone: ${booking.phone}\nAmount: ₹${booking.amount}`;
        const qrImage = await QRCode.toDataURL(qrData);

        const qrBuffer = Buffer.from(qrImage.split(",")[1], "base64");
        doc.image(qrBuffer, 400, startY + 30, { width: 120, height: 120 });

        // ====== Footer ======
        doc.moveDown(12);
        doc
            .fontSize(12)
            .fillColor("gray")
            .text("Thank you for your booking! Please carry this pass to the event.", {
                align: "center",
            });

        doc.end();

        stream.on("finish", callback);
    } catch (e) {
        console.error("❌ Error generating PDF:", e);
    }
}


// Start client
client.initialize();

// ====== Background thread to check payments and send passes ======
setInterval(async () => {
    console.log("🔍 Checking for paid bookings without passes...");

    try {
        // Find bookings where paid = true but pass not yet sent
        // const bookings = await Booking.find({ paid: true, pass_sent: false });
        const bookings = await Booking.find({});

        for (let booking of bookings) {
            // Wrap each booking in its own try/catch
            await (async () => {
                const phone = booking.phone;

                try {
                    // Ensure passes folder exists
                    if (!fs.existsSync("passes")) fs.mkdirSync("passes");

                    // generatePassPDF(booking, "passes/pass_MusicFest.pdf");

                    // Generate pass file path
                    const fileName = `passes/pass_${booking._id}.pdf`;
                    // const fileName = `passes/pass_${Date.now()}.pdf`;

                    generatePassFromHtmlFile(booking, "pass_dandiya.pdf");

                    // Generate PDF pass
                    // generatePass(booking, fileName, async () => {
                    //     console.log(`✅ Sending pass to ${phone}`);
                    //
                    //     try {
                    //         const media = MessageMedia.fromFilePath(fileName);
                    //
                    //         // await client.sendMessage(
                    //         //     phone,
                    //         //     "🎉 Your payment is confirmed! Here is your event pass:"
                    //         // );
                    //         //
                    //         // await client.sendMessage(phone, media, { sendMediaAsDocument: true });
                    //
                    //         // Update booking
                    //         booking.pass_sent = true;
                    //         booking.pass_file = fileName;
                    //         await booking.save();
                    //     } catch (sendErr) {
                    //         console.error(`❌ Failed to send pass to ${phone}:`, sendErr.message);
                    //     }
                    // });
                } catch (genErr) {
                    console.error(`❌ Failed to generate pass for ${phone}:`, genErr.message);
                }
            })(); // immediately invoke async function for this booking
        }
    } catch (err) {
        console.error("❌ Error fetching bookings:", err.message);
    }
}, 10 * 1000); // every 5 seconds

/**
 * Generate PDF from pass.html template
 * @param {Object} booking - booking details
 * @param {string} outputPath - path to save PDF
 */
async function generatePassFromHtmlFile(booking, outputPath) {
    try {
        // 1. Read HTML template
        let html = fs.readFileSync(path.join(__dirname, "pass.html"), "utf8");

        // 2. Create QR Code with booking details
        const qrData = `
            Event: ${booking.event}
            Amount: ₹${booking.amount}
            Phone: ${booking.phone}
            Status: Confirmed
            Issued At: ${new Date().toLocaleString()}
        `;
        const qrDataURL = await QRCode.toDataURL(qrData);

        // 3. Replace placeholders
        html = html
            .replace("{{event}}", booking.event)
            .replace("{{amount}}", booking.amount)
            .replace("{{phone}}", booking.phone)
            .replace("{{issuedAt}}", new Date().toLocaleString())
            .replace("{{qrData}}", qrDataURL);

        // 4. Launch Puppeteer & create PDF
        const browser = await puppeteer.launch({ headless: true });
        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: "networkidle0" });

        await page.pdf({
            path: outputPath,
            format: "A4",
            printBackground: true,
            margin: { top: "20px", bottom: "20px", left: "20px", right: "20px" },
        });

        await browser.close();
        console.log(`✅ PDF generated: ${outputPath}`);
    } catch (err) {
        console.error("❌ Error generating PDF:", err);
    }
}



