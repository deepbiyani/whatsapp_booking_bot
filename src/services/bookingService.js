const Booking = require("../models/Booking");

async function createBooking(data) {
    let amount;
    switch (data.type.toUpperCase()) {
        case "Kids Entry":
            amount = 399; break;
        case "Regular Ticket":
            amount = 499; break;
        case "Couple Pass":
            amount = 899; break;
        case "Group of 3 Pass":
            amount = 1399; break;
            case "Group of 5 Pass":
            amount = 2199; break;
        default:
            throw new Error("Invalid booking type");
    }

    amount = amount * quantity;

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
