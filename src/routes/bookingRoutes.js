const express = require("express");
const router = express.Router();
const Booking = require("../models/Booking");
const {generatePassFromHtml} = require("../services/passService");
const fs = require("fs");
const path = require("path");

const Plan = require('../models/Plan');
const Promo = require('../models/PromoCode');
const auth = require('../middlewares/authMiddleware');
const mongoose = require('mongoose');

function getActivePlanDiscount(plan, atDate = new Date()) {
    if (!plan.discountHistory || plan.discountHistory.length === 0) return null;
    const candidates = plan.discountHistory
        .filter(d => new Date(d.effectiveDate) <= atDate)
        .sort((a,b) => new Date(b.effectiveDate) - new Date(a.effectiveDate));
    return candidates.length ? candidates[0] : null;
}

// Create booking
router.post('/', auth, async (req, res) => {
    const { name, email, phone, whatsapp, type, members, user, passes: incomingPasses, promoCode } = req.body;
    // incomingPasses: [{ planId, quantity }]
    const bookingDate = new Date(); // booking time; can be provided by client if needed
    let amountBefore = 0;
    let amountAfter = 0;

    // load promo if any
    let promo = null;
    if (promoCode) {
        promo = await Promo.findOne({ code: promoCode, active: true });
        // validate validity windows and usage
        if (!promo) return res.status(400).json({ message: 'Invalid promo code' });
        const now = new Date();
        if (promo.validFrom && now < promo.validFrom) return res.status(400).json({ message: 'Promo not yet valid' });
        if (promo.validTo && now > promo.validTo) return res.status(400).json({ message: 'Promo expired' });
        if (promo.usageLimit && promo.usedCount >= promo.usageLimit) return res.status(400).json({ message: 'Promo exhausted' });
    }

    const passes = [];
    for (const p of incomingPasses) {
        console.log(p.planId)

        const plan = await Plan.findById(p.planId);
        if (!plan) return res.status(400).json({ message: `Plan ${p.planId} not found` });

        const discount = getActivePlanDiscount(plan, bookingDate);
        const unitPrice = plan.basePrice;
        let planDiscountAmount = 0;
        let planDiscountId = null;

        if (discount) {
            if (discount.type === 'PERCENT') planDiscountAmount = (unitPrice * discount.value) / 100;
            else planDiscountAmount = discount.value;
            planDiscountId = discount._id;
        }

        // Promo discount: apply on price after plan discount.
        let promoDiscountAmount = 0;
        if (promo) {
            const priceAfterPlan = unitPrice - planDiscountAmount;
            if (promo.type === 'PERCENT') promoDiscountAmount = (priceAfterPlan * promo.value) / 100;
            else promoDiscountAmount = promo.value;
        }

        const qty = p.quantity || 1;
        const totalBefore = unitPrice * qty;
        const totalAfter = (unitPrice - planDiscountAmount - promoDiscountAmount) * qty;

        amountBefore += totalBefore;
        amountAfter += totalAfter;

        passes.push({
            plan: plan._id,
            quantity: qty,
            unitPrice,
            planDiscountId,
            planDiscountAmount,
            promoDiscountAmount,
            totalAmount: totalAfter,
            status: 'BOOKED',
            statusHistory: [{ from: null, to: 'BOOKED', reason: 'created', changedBy: req.user._id }]
        });
    }

    // Create booking document
    const booking = new Booking({
        name, email, phone, whatsapp, type, members,
        user: req.user._id,
        passes,
        promoCode: promo ? promo._id : null,
        amountBeforeDiscounts: amountBefore,
        amountAfterDiscounts: amountAfter,
        status: 'CREATED',
        statusHistory: [{ from: null, to: 'CREATED', reason: 'created', changedBy: req.user._id }]
    });

    await booking.save();

    // increment promo usage after successful booking creation (business rule: reserve usage)
    if (promo) {
        promo.usedCount = (promo.usedCount || 0) + 1;
        await promo.save();
    }

    res.json(booking);
});

// Get bookings (filter by user or phone)
router.get('/', auth, async (req, res) => {
    const { phone, userId, status } = req.query;
    const q = {};
    if (phone) q.phone = phone;
    if (userId) q.user = userId;
    if (status) q.status = status;
    const bookings = await Booking.find(q).populate('passes.plan').populate('promoCode');
    res.json(bookings);
});

// Get single booking
router.get('/:id', auth, async (req, res) => {
    const id = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ message: 'Invalid id' });
    const booking = await Booking.findById(id).populate('passes.plan').populate('promoCode');
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    res.json(booking);
});

// Update booking (partial updates, e.g. change customer info)
router.patch('/:id', auth, async (req, res) => {
    const id = req.params.id;
    const update = req.body;
    const booking = await Booking.findById(id);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    // Allow changing basic fields. Not allowing direct pass edits here for simplicity.
    ['name','email','phone','whatsapp','notes'].forEach(k => {
        if (update[k] !== undefined) booking[k] = update[k];
    });

    await booking.save();
    res.json(booking);
});

// Get passes for a booking
router.get('/:id/passes', auth, async (req, res) => {
    const booking = await Booking.findById(req.params.id).populate('passes.plan');
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    res.json(booking.passes);
});

// Change booking status (tracks history)
router.post('/:id/status', auth, async (req, res) => {
    const { to, reason } = req.body;
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    const from = booking.status;
    booking.status = to;
    booking.statusHistory.push({ from, to, reason, changedBy: req.user._id, at: new Date() });
    await booking.save();
    res.json(booking);
});

// Change pass item status
router.post('/:id/passes/:passId/status', auth, async (req, res) => {
    const { to, reason } = req.body;
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    const pass = booking.passes.id(req.params.passId);
    if (!pass) return res.status(404).json({ message: 'Pass not found' });
    const from = pass.status;
    pass.status = to;
    pass.statusHistory.push({ from, to, reason, changedBy: req.user._id, at: new Date() });
    await booking.save();
    res.json(pass);
});

// Add a payment to booking
router.post('/:id/payments', auth, async (req, res) => {
    const { amount, method, paidAt, proofUrl, txnId } = req.body;
    // Ensure amount is a valid number
    const safeAmount = parseFloat(amount);
    const booking = await Booking.findById(req.params.id);

    if (!isNaN(safeAmount)) {
        if (!booking) return res.status(404).json({ message: 'Booking not found' });
        booking.payments.push({ amount: safeAmount, method, paidAt: paidAt ? new Date(paidAt) : new Date(), proofUrl, txnId });
        booking.totalPaid = (parseFloat(booking.totalPaid || 0)) + safeAmount;
        booking.paid = parseFloat(booking.totalPaid) >= parseFloat(booking.amountAfterDiscounts);
        await booking.save();
    } else {
        console.warn("Invalid amount value:", amount);
    }
    res.json(booking);
});

module.exports = router;

// Get all bookings
router.get("/", async (req, res) => {
    console.log("GET /api/bookings hit");   // 👈 add this
    try {
        const bookings = await Booking.find().sort({ createdAt: -1 });
        // console.log(bookings);   // 👈 add this
        res.json({ success: true, data: bookings });
    } catch (error) {
        console.error("Error fetching bookings:", error);
        res.status(500).json({ success: false, message: "Error fetching bookings", error });
    }
});

// Get booking by ID
router.get("/:id", async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ success: false, message: "Booking not found" });
    res.json({ success: true, data: booking });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching booking", error });
  }
});

router.get("/register-entry/:id", async (req, res) => {
    try {
        // Find the booking by ID
        const booking = await Booking.findById(req.params.id);

        if (!booking) {
            return res.status(404).json({
                success: false,
                message: "Booking not found"
            });
        }

        // Update entry details
        booking.entryTime = new Date(); // Current timestamp
        booking.entryStatus = "Entered"; // Mark as entered

        await booking.save();

        res.json({
            success: true,
            message: "Entry registered successfully",
            data: booking
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Error registering entry",
            error: error.message
        });
    }
});
router.post("/update", async (req, res) => {
    try {
        console.log(req.body)
        const { _id, paid, entryStatus } = req.body;

        if (!_id) {
            return res.status(400).json({ success: false, message: "Booking ID is required" });
        }

        // Find booking by ID
        const booking = await Booking.findById(_id);

        if (!booking) {
            return res.status(404).json({ success: false, message: "Booking not found" });
        }

        // Update payment if provided
        if (typeof paid === "boolean") {
            booking.paid = paid;
        }

        // Update entry if provided
        if (typeof entryStatus === "string") {
            booking.entryStatus = entryStatus;
            booking.entryTime = new Date(); // mark entry timestamp
        }

        await booking.save();

        res.json({
            success: true,
            message: "Booking updated successfully",
            data: booking
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Error updating booking",
            error: error.message
        });
    }
});

router.get("/pass/:id", async (req, res) => {

    try {
        const booking = await Booking.findById(req.params.id)
            .populate("passes.plan");

        if (!booking) {
            return res.status(404).json({ success: false, message: "Booking not found" });
        }

        // if (!booking.paid) {
        //     return res.status(403).json({ success: false, message: "Payment not completed" });
        // }

        // Create passes directory if not exists
        const passesDir = path.join(__dirname, "../../passes");
        if (!fs.existsSync(passesDir)) fs.mkdirSync(passesDir);

        const filePath = path.join(passesDir, `${booking._id}_pass.pdf`);

        await generatePassFromHtml(booking, filePath);

        // res.download(filePath, `${booking._id}_pass.pdf`);
        res.sendFile(filePath, {
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="${booking._id}_pass.pdf"`
            }
        });

    } catch (error) {
        console.error("Error generating pass:", error);
        res.status(500).json({ success: false, message: "Error generating pass", error: error.message });
    }
});


module.exports = router;

