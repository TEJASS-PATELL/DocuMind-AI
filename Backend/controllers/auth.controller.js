const db = require("../config/db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "none",
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

exports.signup = async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password)
    return res.status(400).json({ msg: "All fields are required" });

  try {
    const [existingUsers] = await db.execute("SELECT * FROM users WHERE email = ?", [email]);
    if (existingUsers.length > 0)
      return res.status(400).json({ msg: "User already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);

    const [result] = await db.execute(
      "INSERT INTO users (name, email, password) VALUES (?, ?, ?)",
      [name, email, hashedPassword]
    );

    const token = jwt.sign({ userid: result.insertId }, process.env.JWT_SECRET, { expiresIn: "7d" });

    res.cookie("token", token, cookieOptions);

    res.status(201).json({ msg: "User Created", userId: result.insertId });
  } catch (err) {
    console.error("Signup Error:", err);
    res.status(500).json({ msg: "Signup failed", error: err.message });
  }
};

exports.login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password)
    return res.status(400).json({ msg: "Email and password are required" });

  try {
    const [results] = await db.execute("SELECT * FROM users WHERE email = ?", [email]);

    if (results.length === 0)
      return res.status(400).json({ msg: "User does not exist" });

    const user = results[0];

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ msg: "Invalid credentials" });

    const token = jwt.sign({ userid: user.id }, process.env.JWT_SECRET, { expiresIn: "7d" });

    res.cookie("token", token, cookieOptions);

    res.json({
      msg: "Logged in successfully",
      user: { id: user.id, name: user.name, email: user.email },
    });
  } catch (err) {
    console.error("Login Error:", err);
    res.status(500).json({ msg: "Login failed", error: err.message });
  }
};

exports.logout = (req, res) => {
  res.clearCookie("token", cookieOptions);
  res.status(200).json({ msg: "Logged out successfully" });
};

exports.update_detail = (req, res) => {
  const { language, yogaMode, replyType } = req.body;

  if (!language)
    return res.status(400).json({ message: "Language and level are required" });

  if (!req.user)
    return res.status(401).json({ message: "Not authenticated" });

  const yogaModeBool = yogaMode === true || yogaMode === "true" || yogaMode === 1 || yogaMode === "1";

  req.session.language = language;
  req.session.replyType = replyType;
  req.session.yogaMode = yogaModeBool;

  req.session.save((err) => {
    if (err) console.error("Session save error:", err);

    res.json({
      message: `Preferences set: ${language} YogaMode: ${req.session.yogaMode ? "ON" : "OFF"}`,
      language,
      replyType,
      yogaMode: req.session.yogaMode,
    });
  });
};

exports.get_detail = (req, res) => {
  if (!req.user) {
    return res.json({ id: null, language: "", yogaMode: false, replyType: "" });
  }

  const language = req.session.language || "";
  const replyType = req.session.replyType || "";
  const yogaMode = !!req.session.yogaMode;

  res.json({ id: req.user.userid, language, yogaMode, replyType });
};

exports.user_info = async (req, res) => {
  if (!req.user) return res.status(401).json({ error: "Not authenticated" });

  try {
    const userId = req.user.userid;
    const [rows] = await db.execute("SELECT name, email FROM users WHERE id = ?", [userId]);

    if (rows.length === 0)
      return res.status(404).json({ error: "User not found" });

    res.json({
      name: rows[0].name,
      email: rows[0].email,
      language: req.session.language || "",
      replyType: req.session.replyType || "",
      yogaMode: Boolean(req.session.yogaMode),
    });
  } catch (err) {
    console.error("User fetch error:", err.message);
    res.status(500).json({ error: "Failed to fetch user info" });
  }
};

exports.check = (req, res) => {
  const token = req.cookies?.token;
  if (!token) return res.status(401).json({ msg: "Not logged in" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    res.json({ msg: "Logged in", user: decoded });
  } catch (err) {
    console.error("JWT verification error:", err.message);
    res.status(401).json({ msg: "Invalid token" });
  }
};

exports.deleteAccount = async (req, res) => {
  try {
    const userId = req.user.userid;
    if (!userId) {
      return res.status(401).json({ msg: "Unauthorized – user ID not found" });
    }

    await db.execute("DELETE FROM users WHERE id = ?", [userId]);

    res.clearCookie("token", cookieOptions);

    return res.status(200).json({ msg: "Account deleted successfully", success: true });
  } catch (err) {
    console.error("Delete Account Error:", err);
    return res.status(500).json({ msg: "Account deletion failed", error: err.message, success: false });
  }
};
