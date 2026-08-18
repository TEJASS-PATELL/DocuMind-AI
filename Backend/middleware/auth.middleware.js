const jwt = require("jsonwebtoken");

module.exports = (req, res, next) => {
  const token = req.cookies?.token;

  if (!token) {
    return res.status(401).json({
      msg: "Not authenticated"
    });
  }

  if (!process.env.JWT_SECRET) {
    return res.status(500).json({
      msg: "JWT configuration missing"
    });
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    const userId =
      decoded.userid ||
      decoded.userId ||
      decoded.id;

    if (!userId) {
      return res.status(401).json({
        msg: "Invalid token"
      });
    }

    req.user = {
      userid: userId
    };

    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({
        msg: "Token expired"
      });
    }

    return res.status(401).json({
      msg: "Invalid token"
    });
  }
};