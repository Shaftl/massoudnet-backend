// controllers/authController.js
const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const sendEmail = require("../utils/sendEmail");

// ✅ Login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required." });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Email not found." });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Incorrect password." });
    }

    if (!user.isVerified) {
      return res
        .status(403)
        .json({ message: "Please verify your email first." });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    res.cookie("token", token, {
      httpOnly: true,
      secure: true, // ✅ Secure cookie over HTTPS (Render uses HTTPS)
      sameSite: "None", // ✅ Allow cross-origin cookie
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(200).json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Server error. Please try again." });
  }
};

exports.register = async (req, res) => {
  try {
    let { firstName, lastName, email, password, dob, gender } = req.body;

    // 1) Required fields
    if (!firstName || !lastName || !email || !password || !dob || !gender) {
      return res.status(400).json({ error: "All fields are required." });
    }

    // ─── DOB VALIDATION ─────────────────────────────────────────────────────
    const birthDate = new Date(dob);
    if (isNaN(birthDate)) {
      return res.status(400).json({ error: "Invalid date of birth." });
    }
    const ageDiffMs = Date.now() - birthDate.getTime();
    const ageDate = new Date(ageDiffMs);
    const age = Math.abs(ageDate.getUTCFullYear() - 1970);

    if (age < 13) {
      return res
        .status(400)
        .json({ error: "You must be at least 13 years old." });
    }
    if (birthDate.getFullYear() < 1900) {
      return res
        .status(400)
        .json({ error: "Please enter a plausible date of birth." });
    }
    // ────────────────────────────────────────────────────────────────────────

    // ─── PASSWORD STRENGTH CHECK ────────────────────────────────────────────
    // Require ≥8 chars, uppercase, lowercase, digit, special char
    const strongPasswordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_\-+={}[\]|\\:;"'<>,.?/~`]).{8,}$/;
    if (!strongPasswordRegex.test(password)) {
      return res.status(400).json({
        error:
          "Password must be at least 8 characters long and include uppercase, lowercase, a number, and a special character.",
      });
    }
    // ────────────────────────────────────────────────────────────────────────

    // 2) Check for existing user
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: "User already exists." });
    }

    // 3) All good—hash and generate verification code
    const hashedPassword = await bcrypt.hash(password, 10);
    const verificationCode = Math.floor(
      100000 + Math.random() * 900000
    ).toString();

    // 4) Create a short-lived token that carries everything
    const token = jwt.sign(
      {
        userData: { firstName, lastName, email, hashedPassword, dob, gender },
        code: verificationCode,
      },
      process.env.JWT_SECRET,
      { expiresIn: "15m" }
    );

    // 5) Send the email
    await sendEmail(
      email,
      "MassoudNet Email Verification Code",
      `<p>Hello ${firstName},</p>
       <p>Your verification code is: <strong>${verificationCode}</strong></p>
       <p>This code expires in 15 minutes.</p>`
    );

    // 6) Reply with success and the token
    res.status(200).json({
      message: "Verification code sent to your email.",
      token,
    });
  } catch (err) {
    console.error("Registration error:", err);
    res.status(500).json({ error: "Server error." });
  }
};

exports.verifyEmail = async (req, res) => {
  const { token, code } = req.body;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { userData, code: actualCode } = decoded;

    if (code !== actualCode) {
      return res.status(400).json({ message: "Invalid verification code" });
    }

    const existing = await User.findOne({ email: userData.email });
    if (existing) {
      return res.status(400).json({ message: "Email already verified." });
    }

    const newUser = new User({
      name: `${userData.firstName} ${userData.lastName}`,
      email: userData.email,
      password: userData.hashedPassword,
      dob: userData.dob,
      gender: userData.gender,
      isVerified: true,
    });

    await newUser.save();

    // ✅ Set auth token cookie
    const authToken = jwt.sign({ id: newUser._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    res.cookie("token", authToken, {
      httpOnly: true,
      secure: true, // ✅ Secure cookie over HTTPS (Render uses HTTPS)
      sameSite: "None", // ✅ Allow cross-origin cookie
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(200).json({
      message: "Email verified successfully.",
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(400).json({ message: "Invalid or expired token" });
  }
};

// 1) Request password-reset code
exports.forgotPassword = async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email });
  if (!user)
    return res.status(404).json({ message: "No account with that email" });

  // generate 6-digit code
  const code = crypto.randomInt(100000, 999999).toString();
  user.resetPasswordCode = code;
  user.resetPasswordExpires = Date.now() + 15 * 60 * 1000; // 15 minutes
  await user.save();

  // send email
  await sendEmail(
    email,
    "Your password reset code",
    `<p>Your reset code is <strong>${code}</strong>. It expires in 15 minutes.</p>`
  );

  res.json({ message: "Reset code sent to email" });
};

// 2) Verify that code
exports.verifyResetCode = async (req, res) => {
  const { email, code } = req.body;
  const user = await User.findOne({
    email,
    resetPasswordCode: code,
    resetPasswordExpires: { $gt: Date.now() },
  });
  if (!user)
    return res.status(400).json({ message: "Invalid or expired code" });
  res.json({ message: "Code is valid" });
};

// 3) Actually reset the password
exports.resetPassword = async (req, res) => {
  const { email, code, newPassword } = req.body;
  const user = await User.findOne({
    email,
    resetPasswordCode: code,
    resetPasswordExpires: { $gt: Date.now() },
  });
  if (!user)
    return res.status(400).json({ message: "Invalid or expired code" });

  // hash and save
  user.password = await bcrypt.hash(newPassword, 10);
  user.resetPasswordCode = undefined;
  user.resetPasswordExpires = undefined;
  await user.save();

  res.json({ message: "Password reset successful." });
};
