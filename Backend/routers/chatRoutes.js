const express = require("express");
const router = express.Router();
const multer = require("multer");
const chatController = require("../controllers/chat.controller");
const authMiddleware = require("../middleware/auth.middleware");

const upload = multer({ dest: "uploads/" });

router.post("/startChat", authMiddleware, chatController.askQuestion);
router.post("/upload", authMiddleware, upload.single("file"), chatController.uploadDocument);

module.exports = router;