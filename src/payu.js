

const MERCHANT_KEY = "ByJWED";
const MERCHANT_SALT = "28TUgw1Ew990FhzUynZgxcCtiI1m1O4p";
const PAYU_BASE_URL = "https://test.payu.in"; // use secure.payu.in for production
const SERVER_BASE_URL = "http://localhost:3000/"; // use secure.payu.in for production
const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");
const crypto = require("crypto");

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Replace with your PayU credentials
const MERCHANT_KEY = "your_merchant_key";
const MERCHANT_SALT = "your_merchant_salt";
const PAYU_BASE_URL = "https://test.payu.in/_payment"; // Production: https://secure.payu.in/_payment

// In-memory store for transactions (for demo; replace with DB in production)
const transactions = {};

// Function to generate PayU hash
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

// API to create a hosted payment URL
app.post("/create-upi-payment", (req, res) => {
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
    const hostedUrl = `http://localhost:3000/pay/${txnid}`;
    res.json({ txnid, url: hostedUrl });
});

// Hosted route that serves PayU auto-submit form
app.get("/pay/:txnid", (req, res) => {
    const txnid = req.params.txnid;
    const txn = transactions[txnid];

    if (!txn) return res.status(404).send("Transaction not found");

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
        surl: "http://localhost:3000/payment-success",
        furl: "http://localhost:3000/payment-failure",
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
app.post("/payment-success", (req, res) => {
    console.log("Payment Success:", req.body);
    res.send("<h2>Payment Successful ✅</h2>");
});

// Failure callback
app.post("/payment-failure", (req, res) => {
    console.log("Payment Failed:", req.body);
    res.send("<h2>Payment Failed ❌</h2>");
});

// Start server
app.listen(3000, () => console.log("Server running at http://localhost:3000"));
