const express = require("express");
const cors = require("cors");
const helmetConfig = require("./middleware/helmet");
const chatRoutes = require("./routers/chatRoutes");
const authRoutes = require("./routers/authroutes");
const cookieParser = require("cookie-parser");
require("dotenv").config();

const PORT = process.env.PORT || 5000;
const app = express();

require("./models/user");

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(helmetConfig);

app.use(
  cors({
    origin: ["http://localhost:5173", "https://brain-body-ai.vercel.app"],
    credentials: true,
  })
);

app.use("/api/auth", authRoutes);
app.use("/api/chats", chatRoutes);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});