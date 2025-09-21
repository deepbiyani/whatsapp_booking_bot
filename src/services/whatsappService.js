const { Client, LocalAuth, MessageMedia } = require("whatsapp-web.js");
// const qrcode = require("qrcode-terminal");
const path = require("path");
const { generatePassFromHtml } = require("./passService");
const logger = require("../utils/logger");
const Booking = require("../models/Booking");
const PassType = require("../models/PassType");
const Plan = require("../models/Plan");
const { createBooking } = require("../controllers/bookingController");
const qrcode = require('qrcode');
const fs = require('fs');


module.exports = { setupWhatsAppBot };
