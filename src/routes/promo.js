const express = require('express');
const router = express.Router();
const PromoCode = require('../models/PromoCode');
const auth = require('../middlewares/authMiddleware');

router.post('/', auth, async (req, res) => {
    const p = new PromoCode(req.body);
    await p.save();
    res.json(p);
});

router.get('/:code', async (req, res) => {
    const code = req.params.code;
    const promo = await PromoCode.findOne({ code });
    if (!promo) return res.status(404).json({ message: 'Promo not found' });
    res.json(promo);
});

module.exports = router;
