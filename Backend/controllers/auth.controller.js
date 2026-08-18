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
  
  if (!name || !email || !password) {
    return res.status(400).json({ msg: "All fields are required" });
  }

  try {
    const [existingUsers] = await db.execute("SELECT * FROM users WHERE email = ?", [email]);
    
    if (existingUsers.length > 0) {
      return res.status(400).json({ msg: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const [result] = await db.execute(
      "INSERT INTO users (name, email, password) VALUES (?, ?, ?)",
      [name, email, hashedPassword]
    );

    const token = jwt.sign({ userid: result.insertId }, process.env.JWT_SECRET, { expiresIn: "7d" });
    
    res.cookie("token", token, cookieOptions);
    res.status(201).json({ 
      msg: "User Created", 
      userId: result.insertId,
      token: token 
    });
  } catch (err) {
    res.status(500).json({ msg: "Signup failed", error: err.message });
  }
};

exports.login = async (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ msg: "Email and password are required" });
  }

  try {
    const [results] = await db.execute("SELECT * FROM users WHERE email = ?", [email]);
    
    if (results.length === 0) {
      return res.status(400).json({ msg: "User does not exist" });
    }

    const user = results[0];
    const isMatch = await bcrypt.compare(password, user.password);
    
    if (!isMatch) {
      return res.status(400).json({ msg: "Invalid credentials" });
    }

    const token = jwt.sign({ userid: user.id }, process.env.JWT_SECRET, { expiresIn: "7d" });
    
    res.cookie("token", token, cookieOptions);
    res.json({
      msg: "Logged in successfully",
      token: token,
      user: { id: user.id, name: user.name, email: user.email },
    });
  } catch (err) {
    res.status(500).json({ msg: "Login failed", error: err.message });
  }
};

exports.update_detail = (req, res) => {
  const { language, focusMode, replyType } = req.body;

  if (!req.session) {
    return res.status(500).json({ message: "Session missing" });
  }

  req.session.language = language || "english";
  req.session.replyType = replyType || "concise";
  req.session.focusMode = focusMode === true || focusMode === 1;

  req.session.save((err) => {
    if (err) return res.status(500).json({ message: "Session save fail" });
    res.json({
      message: "Preferences updated",
      language: req.session.language,
      replyType: req.session.replyType,
      focusMode: req.session.focusMode,
    });
  });
};

exports.get_detail = (req, res) => {
  if (!req.user) {
    return res.json({ id: null, language: "english", focusMode: false, replyType: "concise" });
  }

  const lang = (req.session && req.session.language) ? req.session.language : "english";
  const reply = (req.session && req.session.replyType) ? req.session.replyType : "concise";
  const focus = (req.session && req.session.focusMode) ? req.session.focusMode : false;

  res.json({
    id: req.user.userid,
    language: lang,
    replyType: reply,
    focusMode: !!focus
  });
};

exports.user_info = async (req, res) => {
  if (!req.user) return res.status(401).json({ error: "Not authenticated" });

  try {
    const [rows] = await db.execute("SELECT name, email FROM users WHERE id = ?", [req.user.userid]);
    if (rows.length === 0) return res.status(404).json({ error: "User not found" });

    res.json({
      name: rows[0].name,
      email: rows[0].email,
      language: req.session?.language || "english",
      focusMode: !!req.session?.focusMode,
      replyType: req.session?.replyType || "concise"
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch" });
  }
};

exports.logout = (req, res) => {
  res.clearCookie("token", cookieOptions);
  res.status(200).json({ msg: "Logged out successfully" });
};

exports.check = (req, res) => {
  const token = req.cookies?.token;
  if (!token) return res.status(401).json({ msg: "Not logged in" });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    res.json({ msg: "Logged in", user: decoded });
  } catch (err) {
    res.status(401).json({ msg: "Invalid token" });
  }
};

exports.deleteAccount = async (req, res) => {
  try {
    const userId = req.user?.userid;
    if (!userId) return res.status(401).json({ msg: "Unauthorized" });
    await db.execute("DELETE FROM users WHERE id = ?", [userId]);
    res.clearCookie("token", cookieOptions);
    return res.status(200).json({ msg: "Account deleted", success: true });
  } catch (err) {
    return res.status(500).json({ msg: "Deletion failed", error: err.message });
  }
};