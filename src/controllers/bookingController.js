const Booking = require("../models/Booking");
const Promo = require("../models/PromoCode");
const Plan = require("../models/Plan");

async function createBooking(params) {
    try {
        const { name, email, phone, whatsapp, type, members, passes: incomingPasses, promoCode, user } = params;
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
            console.log(incomingPasses)

            const plan = await Plan.findById(p.planId);
            if (!plan) return res.status(400).json({ message: `Plan ${p.planId} not found` });

            console.log(plan)
            const discount = getActivePlanDiscount(plan, bookingDate);
            const unitPrice = plan.basePrice;
            const quantity = p.quantity;
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
                statusHistory: [{ from: null, to: 'BOOKED', reason: 'created', changedBy: user }]
            });
        }

        // Create booking document
        const booking = new Booking({
            name, email, phone, whatsapp, type, members,
            user,
            passes,
            promoCode: promo ? promo._id : null,
            amountBeforeDiscounts: amountBefore,
            amountAfterDiscounts: amountAfter,
            status: 'CREATED',
            statusHistory: [{ from: null, to: 'CREATED', reason: 'created', changedBy: user }]
        });

        await booking.save();

        // increment promo usage after successful booking creation (business rule: reserve usage)
        if (promo) {
            promo.usedCount = (promo.usedCount || 0) + 1;
            await promo.save();
        }

        return booking;
    } catch (err) {
        console.error(err);
    }
}

function getActivePlanDiscount(plan, atDate = new Date()) {
    if (!plan.discountHistory || plan.discountHistory.length === 0) return null;
    const candidates = plan.discountHistory
        .filter(d => new Date(d.effectiveDate) <= atDate)
        .sort((a,b) => new Date(b.effectiveDate) - new Date(a.effectiveDate));
    return candidates.length ? candidates[0] : null;
}

module.exports = { createBooking };

