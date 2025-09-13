const fs = require("fs");
const path = require("path");
const PDFDocument = require("pdfkit");
const puppeteer = require("puppeteer");
const { generateQR } = require("../utils/qrGenerator");
const logger = require("../utils/logger");

async function generatePassPDF(booking, outputPath) {
    try {
        const doc = new PDFDocument({ size: "A4", margin: 50 });
        const stream = fs.createWriteStream(outputPath);
        doc.pipe(stream);

        // Header
        doc.rect(0, 0, doc.page.width, 80).fill("#4CAF50");
        doc.fillColor("white").fontSize(26).text("Event Pass", { align: "center" });

        doc.moveDown(2);
        const startY = doc.y;
        doc.rect(50, startY, 500, 180).stroke("#4CAF50");

        doc.fontSize(14).fillColor("black");
        doc.text(`Event: ${booking.event}`, 60, startY + 20);
        doc.text(`Amount Paid: ₹${booking.amount}`, 60, startY + 50);
        doc.text(`Booking ID: ${booking._id}`, 60, startY + 80);
        doc.text(`Status: Confirmed ✅`, 60, startY + 110);
        doc.text(`Issued At: ${new Date().toLocaleString()}`, 60, startY + 140);
        doc.text(`Phone: ${booking.phone}`, 60, startY + 170);

        // QR Code
        const qrData = `Event: ${booking.event}, Phone: ${booking.phone}, Amount: ₹${booking.amount}`;
        const qrImage = await generateQR(qrData);
        const qrBuffer = Buffer.from(qrImage.split(",")[1], "base64");
        doc.image(qrBuffer, 400, startY + 30, { width: 120, height: 120 });

        doc.end();

        return new Promise((resolve) => {
            stream.on("finish", () => {
                logger.info(`✅ PDF created: ${outputPath}`);
                resolve(outputPath);
            });
        });
    } catch (err) {
        logger.error("❌ Error generating PDF: " + err.message);
        throw err;
    }
}

async function generatePassFromHtml(booking, outputPath) {
    try {
        let html = fs.readFileSync(path.join(__dirname, "../../sample-pass.html"), "utf8");

    //     const qrData = `
    //   Name: ${booking.name}
    //   Phone: ${booking.phone}
    //   Units: ${booking.quantity}
    //   Amount: ₹${booking.amount}
    //   Booking Type: ${booking.type}
    //   Booking ID: ${booking._id}
    //   Issued At: ${new Date().toLocaleString()}
    // `;
        const qrData = `${booking._id}`;
        const qrDataURL = await generateQR(qrData);
        // const qrDataURL = await generateQR(booking._id);

        html = html
            .replaceAll("{{name}}", booking.name)
            .replaceAll("{{phone}}", booking.phone)
            .replaceAll("{{email}}", booking.email)
            .replaceAll("{{amount}}", booking.amount)
            .replaceAll("{{quantity}}", booking.quantity)
            .replaceAll("{{bookingId}}", booking._id)
            .replaceAll("{{issuedAt}}", new Date().toLocaleString())
            .replaceAll("{{qrData}}", qrDataURL);

        const browser = await puppeteer.launch({ headless: true });
        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: "networkidle0" });

        await page.pdf({
            path: outputPath,
            format: "A4",
            printBackground: true,
        });

        await browser.close();
        logger.info(`✅ PDF generated from HTML: ${outputPath}`);
        return outputPath;
    } catch (err) {
        logger.error("❌ Error generating HTML PDF: " + err.message);
        throw err;
    }
}

module.exports = { generatePassPDF, generatePassFromHtml };
