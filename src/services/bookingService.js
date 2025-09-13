const Booking = require("../models/Booking");

async function createBooking(data) {
    const booking = new Booking(data);
    await booking.save();
    return booking;
}

async function markAsPaid(phone) {
    const booking = await Booking.findOne({ phone, paid: false }).sort({ createdAt: -1 });
    if (!booking) return null;

    booking.paid = true;
    await booking.save();
    return booking;
}

async function getLatestBooking(phone) {
    return await Booking.findOne({ phone }).sort({ createdAt: -1 });
}

async function getPendingPasses() {
    return await Booking.find({ paid: true, passSent: false });
}

module.exports = { createBooking, markAsPaid, getLatestBooking, getPendingPasses };
