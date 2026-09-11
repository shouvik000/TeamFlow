const Razorpay = require("razorpay");

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});










console.log(
    "Razorpay Key Loaded:",
    process.env.RAZORPAY_KEY_ID
        ? "YES"
        : "NO"
);

console.log(
    "Razorpay Secret Loaded:",
    process.env.RAZORPAY_KEY_SECRET
        ? "YES"
        : "NO"
);







module.exports = razorpay;