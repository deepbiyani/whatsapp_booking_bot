// models/config.js
const mongoose = require('mongoose');

const configSchema = new mongoose.Schema({
    key: {
        type: String,
        required: true,
        unique: true, // ensures one key has only one config
        trim: true,
    },
    value: {
        type: mongoose.Schema.Types.Mixed, // can store string, number, object, array
        required: true,
    },
    description: {
        type: String,
        default: '',
    },
    isActive: {
        type: Boolean,
        default: true,
    },
}, { timestamps: true });

module.exports = mongoose.model('Config', configSchema);
