const QRCode = require("qrcode");

async function generateQR(data) {
    return await QRCode.toDataURL(data);
}

module.exports = { generateQR };
