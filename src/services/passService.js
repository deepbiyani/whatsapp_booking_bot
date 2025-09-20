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

        const qrData = `${booking._id}`;
        const qrDataURL = await generateQR(qrData);
        const logoDataUrl = imageToDataURL("./assets/images/profile.jpeg");

        let passData = {};
        if (booking && booking.passes.length > 0) {

            booking.passes.forEach((pass) => {
                if (pass.plan && pass.plan.discountHistory && pass.planDiscountId) {
                    pass.appliedDiscout = pass.plan.discountHistory.filter(
                        d => d._id.toString() === pass.planDiscountId.toString()
                    )[0];
                }

                const discount = (pass.planDiscountAmount + pass.promoDiscountAmount) * pass.quantity;
                const discountType = pass.appliedDiscout?.note ?? '';
                const convenienceFee = 50;  //
                const bookingCost = (pass.quantity * pass.unitPrice);
                const totalAfterDiscount = pass.totalAmount;

                console.log(pass)

                console.log("Plan:", pass.plan.title);
                console.log("Quantity:", pass.quantity);
                console.log("Unit Price:", pass.unitPrice);
                console.log("bookingCost:", bookingCost);
                console.log("Discount:", discount);
                console.log("Applied Discount:", pass.appliedDiscout);
                console.log("Discount type:", discountType);
                console.log("Total After Discount:", totalAfterDiscount);
                console.log("------");
                passData = pass;

                html = html
                    .replaceAll("{{plan}}", passData.plan.title)
                    .replaceAll("{{name}}", booking.name)
                    .replaceAll("{{phone}}", booking.phone)
                    .replaceAll("{{email}}", booking.email)
                    .replaceAll("{{amount}}", bookingCost)  // 1996
                    // .replaceAll("{{convenienceFee}}", convenienceFee) //50
                    .replaceAll("{{discount}}", discount) // 348
                    .replaceAll("{{discountType}}", discountType) // 348
                    .replaceAll("{{total}}", totalAfterDiscount)
                    .replaceAll("{{quantity}}", (passData.quantity))
                    .replaceAll("{{unitPrice}}", (passData.unitPrice))
                    .replaceAll("{{bookingId}}", booking._id)
                    .replaceAll("{{issuedAt}}", new Date().toLocaleString())
                    .replaceAll("{{logoData}}", logoDataUrl)
                    .replaceAll("{{qrData}}", qrDataURL);
            });
        }

        const browser = await puppeteer.launch({ headless: true });
        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: "networkidle0" });

        await page.pdf({
            path: outputPath,
            width: "400px",
            height: "750px",
            printBackground: true,
            margin: { top: 0, right: 0, bottom: 0, left: 0 }
        });

        await browser.close();
        logger.info(`✅ PDF generated from HTML: ${outputPath}`);
        return outputPath;
    } catch (err) {
        logger.error("❌ Error generating HTML PDF: " + err.message);
        throw err;
    }
}


function imageToDataURL(imagePath) {
    console.log(imagePath);
  // Read the file
  const fileBuffer = fs.readFileSync(imagePath);

  // Get the file extension
  const ext = path.extname(imagePath).slice(1);

  // Convert to Base64
  const base64 = fileBuffer.toString("base64");

  // Create the Data URL
  return `data:image/${ext};base64,${base64}`;
}

const formatDiscountType = (value) => {
    if (!value) return '';
    // Convert snake_case to Title Case
    return `(${value
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')})`;
};

module.exports = { generatePassPDF, generatePassFromHtml };
