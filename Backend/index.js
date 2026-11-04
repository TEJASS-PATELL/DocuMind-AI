const express = require("express");
require("dotenv").config();
const cors = require("cors");
const helmetConfig = require("./middleware/helmet");
const chatRoutes = require("./routers/chatRoutes");
const authRoutes = require("./routers/authroutes");
const cookieParser = require("cookie-parser");
const passport = require("./config/passport");
const PORT = process.env.PORT || 5000;
const app = express();

app.use(express.json());
app.set('trust proxy', 1);
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(helmetConfig);

app.use(
  cors({
    origin: ["http://localhost:5173", "https://docu-mind-ai-kohl.vercel.app"],
    credentials: true,
  })
);

app.use(passport.initialize());
app.use("/api/auth", authRoutes);
app.use("/api/chats", chatRoutes);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});