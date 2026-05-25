const jwt = require("jsonwebtoken");

module.exports = (req, res, next) => {
  const token = req.cookies.token;
  
  if (!token) {
    return res.status(401).json({ msg: "No token, access denied" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = {
      userid: decoded.userid || decoded.id || decoded.userId
    };

    next();
  } catch (err) {
    return res.status(401).json({ msg: "Invalid token" });
  }
};