const express = require("express");
const router = express.Router();
const authController = require("../controllers/auth.controller");
const passport = require("passport");
const rateLimit = require("express-rate-limit");
const authMiddleware = require("../middleware/auth.middleware");
const jwt = require("jsonwebtoken");

const loginLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  message: "Too many login attempts. Try again after 10 minutes.",
});

router.post("/signup", authController.signup);
router.post("/login", loginLimiter, authController.login);
router.get("/check", authController.check);
router.post("/logout", authMiddleware, authController.logout);
router.get("/userinfo", authMiddleware, authController.user_info);
router.post("/update_detail", authMiddleware, authController.update_detail);
router.get("/get_detail", authMiddleware, authController.get_detail);
router.delete("/delete-account", authMiddleware, authController.deleteAccount);

router.get(
  "/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
    session: false,
  })
);

router.get(
  "/google/callback",
  passport.authenticate("google", {
    failureRedirect: (process.env.CLIENT_URL) + "/login",
    session: false,
  }),
  (req, res) => {
    const token = jwt.sign({ userid: req.user.id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.redirect((process.env.CLIENT_URL) + "/chatbot");
  }
);

module.exports = router;