const express = require("express");
const Booking = require("../models/Booking");
const PaymentTransactions = require("../models/PaymentTransactions");
const { generateHash} = require("../services/paymentService");

const router = express.Router();

const MERCHANT_KEY = process.env.MERCHANT_KEY;
const PAYU_BASE_URL = process.env.PAYU_BASE_URL;
// API to create a hosted payment URL
router.post("/create-upi-payment", async (req, res) => {
    const { amount, productinfo, firstname, email, phone, vpa } = req.body;
    const txnid = "txn" + Date.now();

    // Store transaction data in memory
    transactions[txnid] = {
        txnid,
        amount,
        productinfo,
        firstname,
        email,
        phone,
        vpa
    };

    // Return a hosted URL for WhatsApp/SMS sharing
    const hostedUrl = `${process.env.BACKEND_BASE_URL}/pay/${txnid}`;
    res.json({ txnid, url: hostedUrl });
});

// Hosted route that serves PayU auto-submit form
router.get("/pay/:txnid", async (req, res) => {
    const txnid = req.params.txnid;
    // console.log(txnid)

    const txn = await PaymentTransactions.findOne({ txnid }).sort({ createdAt: -1 });

    if (!txn) return res.status(404).send("Transaction not found");

    // console.log(txn)
    if (txn.status === "SUCCESS") {
        res.send("<h2>Already paid ✅ </h2>");
    }
    const payload = {
        key: MERCHANT_KEY,
        txnid: txn.txnid,
        amount: txn.amount,
        productinfo: txn.productinfo,
        firstname: txn.firstname,
        email: txn.email,
        phone: txn.phone,
        pg: "UPI",
        bankcode: "UPI",
        vpa: txn.vpa,
        surl: `${process.env.BACKEND_BASE_URL}/api/payment/payment-success`,
        furl: `${process.env.BACKEND_BASE_URL}/api/payment/payment-failure`,
        udf1: "",
        udf2: "",
        udf3: "",
        udf4: "",
        udf5: ""
    };

    payload.hash = generateHash(payload);

    // Render auto-submitting form
    const formHtml = `
    <html>
      <body onload="document.forms[0].submit()">
        <form method="post" action="${PAYU_BASE_URL}">
          ${Object.keys(payload).map(
        key => `<input type="hidden" name="${key}" value="${payload[key]}"/>`
    ).join("\n")}
        </form>
        <p>Redirecting to PayU...</p>
      </body>
    </html>
  `;
    res.send(formHtml);
});

// Success callback
router.post("/payment-success", async (req, res) => {
    const response = req.body;
    console.log("Payment Success:", req.body);

    if (response.status == 'success') {
        let txnid = response.txnid;
        const txn = await PaymentTransactions.findOne({ txnid }).sort({ createdAt: -1 });

        const booking = await Booking.findOne({ '_id': txn.bookingId }).sort({ createdAt: -1 });
        booking.paid = true;
        booking.totalPaid = response.amount;
        booking.paymentTransaction.push(response);
        booking.paymentStatus = 'SUCCESS';
        await booking.save();

        txn.status = "SUCCESS"
        txn.save()

        res.send("<h2>Payment Success ✅ </h2>");

    }
});

// Failure callback
router.post("/payment-failure", async (req, res) => {
    console.log("Payment Failed:", req.body);
    const response = req.body;
    if (response.status == 'failure') {
        let txnid = response.txnid;
        const txn = await PaymentTransactions.findOne({ txnid }).sort({ createdAt: -1 });
        const booking = await Booking.findOne({ '_id': txn.bookingId }).sort({ createdAt: -1 });
        booking.paid = false;
        booking.paymentStatus = 'FAILED';
        booking.paymentTransaction.push(response);
        await booking.save();

        txn.status = "FAILED"
        txn.save()
    }
    res.send("<h2>Payment Failed ❌</h2>");
});

module.exports = router;
