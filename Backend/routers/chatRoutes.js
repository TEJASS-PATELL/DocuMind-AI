const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const chatController = require("../controllers/chat.controller");
const authMiddleware = require("../middleware/auth.middleware");

const uploadDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const upload = multer({ dest: uploadDir });

router.post("/startChat", authMiddleware, chatController.askQuestion);
router.post("/upload", authMiddleware, upload.single("file"), chatController.uploadDocument);

module.exports = router;