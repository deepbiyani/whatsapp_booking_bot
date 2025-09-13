const Booking = require("../models/Booking");

async function createBooking(data) {
    let amount;
    switch (data.type.toUpperCase()) {
        case "SINGLE":
            amount = 400; break;
        case "COUPLE":
            amount = 700; break;
        case "GROUP":
            amount = 1300; break;
        default:
            throw new Error("Invalid booking type");
    }

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
