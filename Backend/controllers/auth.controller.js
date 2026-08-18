const db = require("../config/db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const isProduction = process.env.NODE_ENV === "production";

const cookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? "none" : "lax",
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: "/"
};

const clearCookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? "none" : "lax",
  path: "/"
};

const createToken = (userId) => {
  return jwt.sign(
    { userid: userId },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
};

exports.signup = async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({
      msg: "All fields are required"
    });
  }

  try {
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedName = name.trim();

    const [existingUsers] = await db.execute(
      "SELECT id FROM aiusers WHERE email = ? LIMIT 1",
      [normalizedEmail]
    );

    if (existingUsers.length > 0) {
      return res.status(409).json({
        msg: "User already exists"
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const [result] = await db.execute(
      "INSERT INTO aiusers (name, email, password) VALUES (?, ?, ?)",
      [normalizedName, normalizedEmail, hashedPassword]
    );

    const userId = result.insertId;
    const token = createToken(userId);

    res.cookie("token", token, cookieOptions);

    if (req.session) {
      req.session.userId = userId;
      req.session.language = "english";
      req.session.replyType = "concise";
      req.session.focusMode = false;

      await new Promise((resolve, reject) => {
        req.session.save((err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    }

    return res.status(201).json({
      msg: "User Created",
      userId,
      user: {
        id: userId,
        name: normalizedName,
        email: normalizedEmail
      }
    });
  } catch (err) {
    console.error("Signup error:", err);

    if (err.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        msg: "User already exists"
      });
    }

    return res.status(500).json({
      msg: "Signup failed"
    });
  }
};

exports.login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      msg: "Email and password are required"
    });
  }

  try {
    const normalizedEmail = email.trim().toLowerCase();

    const [results] = await db.execute(
      "SELECT id, name, email, password FROM aiusers WHERE email = ? LIMIT 1",
      [normalizedEmail]
    );

    if (results.length === 0) {
      return res.status(401).json({
        msg: "Invalid credentials"
      });
    }

    const user = results[0];

    const isMatch = await bcrypt.compare(
      password,
      user.password
    );

    if (!isMatch) {
      return res.status(401).json({
        msg: "Invalid credentials"
      });
    }

    const token = createToken(user.id);

    res.cookie("token", token, cookieOptions);

    if (req.session) {
      req.session.userId = user.id;

      if (!req.session.language) {
        req.session.language = "english";
      }

      if (!req.session.replyType) {
        req.session.replyType = "concise";
      }

      if (typeof req.session.focusMode !== "boolean") {
        req.session.focusMode = false;
      }

      await new Promise((resolve, reject) => {
        req.session.save((err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    }

    return res.status(200).json({
      msg: "Logged in successfully",
      user: {
        id: user.id,
        name: user.name,
        email: user.email
      }
    });
  } catch (err) {
    console.error("Login error:", err);

    return res.status(500).json({
      msg: "Login failed"
    });
  }
};

exports.update_detail = async (req, res) => {
  const { language, focusMode, replyType } = req.body;

  if (!req.user) {
    return res.status(401).json({
      msg: "Not authenticated"
    });
  }

  if (!req.session) {
    return res.status(500).json({
      msg: "Session missing"
    });
  }

  req.session.userId = req.user.userid;
  req.session.language = language || "english";
  req.session.replyType = replyType || "concise";
  req.session.focusMode = focusMode === true || focusMode === 1;

  try {
    await new Promise((resolve, reject) => {
      req.session.save((err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    return res.status(200).json({
      message: "Preferences updated",
      language: req.session.language,
      replyType: req.session.replyType,
      focusMode: req.session.focusMode
    });
  } catch (err) {
    console.error("Preference save error:", err);

    return res.status(500).json({
      msg: "Session save failed"
    });
  }
};

exports.get_detail = (req, res) => {
  if (!req.user) {
    return res.status(401).json({
      id: null,
      language: "english",
      focusMode: false,
      replyType: "concise"
    });
  }

  return res.status(200).json({
    id: req.user.userid,
    language: req.session?.language || "english",
    replyType: req.session?.replyType || "concise",
    focusMode: !!req.session?.focusMode
  });
};

exports.user_info = async (req, res) => {
  if (!req.user) {
    return res.status(401).json({
      error: "Not authenticated"
    });
  }

  try {
    const [rows] = await db.execute(
      "SELECT id, name, email FROM aiusers WHERE id = ? LIMIT 1",
      [req.user.userid]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        error: "User not found"
      });
    }

    return res.status(200).json({
      id: rows[0].id,
      name: rows[0].name,
      email: rows[0].email,
      language: req.session?.language || "english",
      focusMode: !!req.session?.focusMode,
      replyType: req.session?.replyType || "concise"
    });
  } catch (err) {
    console.error("User info error:", err);

    return res.status(500).json({
      error: "Failed to fetch user information"
    });
  }
};

exports.logout = async (req, res) => {
  try {
    if (req.session) {
      await new Promise((resolve) => {
        req.session.destroy(() => resolve());
      });
    }

    res.clearCookie("token", clearCookieOptions);
    res.clearCookie("documind_session", clearCookieOptions);

    return res.status(200).json({
      msg: "Logged out successfully"
    });
  } catch (err) {
    console.error("Logout error:", err);

    res.clearCookie("token", clearCookieOptions);
    res.clearCookie("documind_session", clearCookieOptions);

    return res.status(200).json({
      msg: "Logged out successfully"
    });
  }
};

exports.check = (req, res) => {
  const token = req.cookies?.token;

  if (!token) {
    return res.status(401).json({
      msg: "Not logged in"
    });
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    return res.status(200).json({
      msg: "Logged in",
      user: decoded
    });
  } catch (err) {
    res.clearCookie("token", clearCookieOptions);

    return res.status(401).json({
      msg: "Invalid or expired token"
    });
  }
};

exports.deleteAccount = async (req, res) => {
  if (!req.user?.userid) {
    return res.status(401).json({
      msg: "Unauthorized"
    });
  }

  const userId = req.user.userid;

  try {
    const [result] = await db.execute(
      "DELETE FROM aiusers WHERE id = ?",
      [userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        msg: "User not found"
      });
    }

    if (req.session) {
      await new Promise((resolve) => {
        req.session.destroy(() => resolve());
      });
    }

    res.clearCookie("token", clearCookieOptions);
    res.clearCookie("documind_session", clearCookieOptions);

    return res.status(200).json({
      msg: "Account deleted",
      success: true
    });
  } catch (err) {
    console.error("Delete account error:", err);

    return res.status(500).json({
      msg: "Deletion failed"
    });
  }
};