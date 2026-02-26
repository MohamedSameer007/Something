require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const rateLimit = require("express-rate-limit");
const cors = require("cors");
const { v4: uuidv4 } = require("uuid");

const app = express();
app.use(cors());
app.use(express.json());

/* -------------------- DATABASE -------------------- */

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch(() => console.log("DB Connection Error"));

/* -------------------- MODELS -------------------- */

const userSchema = new mongoose.Schema({
  email: { type: String, unique: true, required: true },
  password: { type: String, required: true }
}, { timestamps: true });

const transactionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  amount: Number,
  currency: String,
  merchant_id: String,
  idempotencyKey: String
}, { timestamps: true });

const User = mongoose.model("User", userSchema);
const Transaction = mongoose.model("Transaction", transactionSchema);

/* -------------------- SECURITY MIDDLEWARE -------------------- */

// JWT Auth Middleware
const auth = (req, res, next) => {
  const token = req.headers.authorization;

  if (!token) {
    console.log("Invalid token usage");
    return res.status(401).json({ message: "Access Denied" });
  }

  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET);
    req.user = verified;
    next();
  } catch (err) {
    console.log("Expired or invalid token");
    return res.status(400).json({ message: "Invalid Token" });
  }
};

// Login Rate Limiter
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: "Too many login attempts. Try again later."
});

/* -------------------- ROUTES -------------------- */

// 1️⃣ REGISTER
app.post("/register", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password)
    return res.status(400).json({ message: "Email and password required" });

  const existingUser = await User.findOne({ email });
  if (existingUser)
    return res.status(400).json({ message: "Email already exists" });

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = new User({ email, password: hashedPassword });
  await user.save();

  res.json({ message: "User registered successfully" });
});

// 2️⃣ LOGIN
app.post("/login", loginLimiter, async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });
  if (!user) {
    console.log("Failed login attempt");
    return res.status(400).json({ message: "Invalid credentials" });
  }

  const validPassword = await bcrypt.compare(password, user.password);
  if (!validPassword) {
    console.log("Failed login attempt");
    return res.status(400).json({ message: "Invalid credentials" });
  }

  const token = jwt.sign(
    { id: user._id },
    process.env.JWT_SECRET,
    { expiresIn: "1h" }
  );

  res.json({ token });
});

// 3️⃣ PAYMENT
app.post("/payment", auth, async (req, res) => {
  const { amount, currency, merchant_id } = req.body;

  if (!amount || amount <= 0 || !currency || !merchant_id)
    return res.status(400).json({ message: "Invalid payment data" });

  // Duplicate Prevention (Basic Level)
  const existingPayment = await Transaction.findOne({
    userId: req.user.id,
    amount,
    merchant_id
  });

  if (existingPayment) {
    console.log("Duplicate payment attempt detected");
    return res.status(400).json({ message: "Duplicate payment detected" });
  }

  const transaction = new Transaction({
    userId: req.user.id,
    amount,
    currency,
    merchant_id,
    idempotencyKey: uuidv4()
  });

  await transaction.save();

  res.json({ message: "Payment successful", transaction });
});

// 4️⃣ TRANSACTIONS
app.get("/transactions", auth, async (req, res) => {
  const transactions = await Transaction.find({ userId: req.user.id });
  res.json(transactions);
});

/* -------------------- START SERVER -------------------- */

app.listen(5000, () => {
  console.log("Server running on port 5000");
});