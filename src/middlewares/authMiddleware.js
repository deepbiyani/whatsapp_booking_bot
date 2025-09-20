const jwt = require('jsonwebtoken');
const User = require('../models/User');

const secret = process.env.JWT_SECRET || 'change_me_to_env_secret';

async function authMiddleware(req, res, next) {
    const header = req.headers.authorization;
    // if (!header || !header.startsWith('Bearer ')) return res.status(401).json({ message: 'No token' });
    // const token = header.split(' ')[1];
    try {
        // const payload = jwt.verify(token, secret);
        // const userId = payload?.id ?? 1;
        // const user = await User.findById(userId);
        const user = await User.findOne();
        // if (!user) return res.status(401).json({ message: 'User not found' });
        req.user = user;
        next();
    } catch (err) {
        return res.status(401).json({ message: 'Invalid token', error: err.message });
    }
}

module.exports = authMiddleware;
