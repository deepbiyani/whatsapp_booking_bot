// Get all bookings
// router.get("/", async (req, res) => {
//     console.log("GET /api/passes hit");   // 👈 add this
//     try {
//         const passTypes = await PassType.find({isActive: true}).sort({ createdAt: -1 });
//         console.log(passTypes);   // 👈 add this
//         res.json({ success: true, data: passTypes });
//     } catch (error) {
//         console.error("Error fetching passTypes:", error);
//         res.status(500).json({ success: false, message: "Error fetching passTypes", error });
//     }
// });

const express = require('express');
const router = express.Router();
const Plan = require('../models/Plan');
const auth = require('../middlewares/authMiddleware');

// Create a plan
router.post('/', auth, async (req, res) => {
    const { title, description, basePrice } = req.body;
    console.log(title, description, basePrice);
    const plan = await Plan.find({title});
    console.log(plan)
    if (plan.length > 0) return res.status(404).json({ message: 'Plan Already Exist' });
    const p = new Plan({ title, description, basePrice, createdBy: req.user._id });
    await p.save();
    res.json(p);
});

// Add a discount entry (this keeps full history)
router.post('/:id/discount', auth, async (req, res) => {
    const { type, value, effectiveDate, note } = req.body;
    const plan = await Plan.findById(req.params.id);
    if (!plan) return res.status(404).json({ message: 'Plan not found' });
    plan.discountHistory.push({ type, value, effectiveDate, note, changedBy: req.user._id });
    await plan.save();
    res.json(plan);
});

// Get plan, optionally with discount history
router.get('/:id', auth, async (req, res) => {
    const plan = await Plan.findById(req.params.id);
    if (!plan) return res.status(404).json({ message: 'Plan not found' });
    res.json(plan);
});

router.get('/', auth, async (req, res) => {
    const plan = await Plan.find({active:true});
    if (!plan) return res.status(404).json({ message: 'Plan not found' });
    res.json(plan);
});

module.exports = router;

