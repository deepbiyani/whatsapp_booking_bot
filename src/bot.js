require("dotenv").config();
const connectDB = require("./config/db");
const { setupWhatsAppBot } = require("./services/whatsappService");
const { startScheduler } = require("./scheduler");
const cors = require("cors");
const express = require("express");
const bodyParser = require('body-parser');
const bookingRoutes = require("./routes/bookingRoutes");
const passRoutes = require("./routes/PassTypeRoutes");
const wsappRoutes = require("./routes/whatsappRoutes");

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(bodyParser.json());

(async () => {
    await connectDB();
    if (process.env.WHATSAPP_LISTNER == "YES") {
        const client = setupWhatsAppBot();
        startScheduler(client);
    }

    app.use("/api/bookings", bookingRoutes);
    app.use("/api/passes", passRoutes);
    app.use("/api/whatsapp", wsappRoutes);
    app.use('/api/plans', require('./routes/PassTypeRoutes'));
    app.use('/api/promo', require('./routes/promo'));

    // Start server
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

    // Simple auth routes for testing
    const jwt = require('jsonwebtoken');
    const User = require('./models/User');

    app.post('/api/auth/register', async (req,res) => {
        console.log(req.body);
        const u = new User(req.body);
        await u.save();
        res.json(u);
    });

    app.post('/api/auth/login', async (req,res) => {
        // Minimal login: find user by email OR phone and return a JWT
        const { email, phone } = req.body;
        const user = await User.findOne(email ? { email } : { phone });
        if (!user) return res.status(401).json({ message: 'Invalid credentials' });
        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'change_me_to_env_secret', { expiresIn: '7d' });
        res.json({ token, user });
    });

})();

// app.use("/api/bookings", bookingRoutes);

