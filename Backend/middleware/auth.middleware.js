const jwt = require("jsonwebtoken");

module.exports = (req, res, next) => {
  const token = req.cookies.token;
  
  if (!token) {
    return res.status(401).json({ msg: "No token, access denied" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const guest = decoded.guest === true;
    const userid = decoded.userid || decoded.id || decoded.userId;

    if ((!guest && !userid) || (guest && !decoded.guestId)) {
      return res.status(401).json({ msg: "Invalid token" });
    }

    req.user = {
      userid: userid || null,
      guest,
      guestId: guest ? decoded.guestId : null
    };

    next();
  } catch (err) {
    return res.status(401).json({ msg: "Invalid token" });
  }
};