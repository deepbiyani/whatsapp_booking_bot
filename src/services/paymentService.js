const crypto = require("crypto");
const PaymentTransactions = require("../models/PaymentTransactions");
const MERCHANT_SALT = process.env.MERCHANT_SALT;

function generateHash(data) {
    const hashString = [
        data.key,
        data.txnid,
        data.amount,
        data.productinfo,
        data.firstname,
        data.email,
        "", "", "", "", "", "", "", "", "", "", // udf1–udf10
        MERCHANT_SALT
    ].join("|");

    return crypto.createHash("sha512").update(hashString).digest("hex");
}

async function getPaymentLink(paymentData){
    const PaymentTransaction = new PaymentTransactions(paymentData);
    await PaymentTransaction.save();

    console.log(paymentData.txnid)
    // Return a hosted URL for WhatsApp/SMS sharing
    return `${process.env.BACKEND_BASE_URL}/api/payment/pay/${paymentData.txnid}`;
}

module.exports = { generateHash, getPaymentLink};
