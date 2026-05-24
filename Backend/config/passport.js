const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const db = require("./db");

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

passport.use(
  new GoogleStrategy(
    {
      clientID: GOOGLE_CLIENT_ID,
      clientSecret: GoogleClient_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails[0].value;
        const name = profile.displayName;

        const [existing] = await db.execute("SELECT * FROM users WHERE email = ?", [email]);
        let user;
        
        if (existing.length > 0) {
          user = existing[0];
        } else {
          const [result] = await db.execute(
            "INSERT INTO users (name, email, password) VALUES (?, ?, ?)",
            [name, email, ""]
          );
          user = { id: result.insertId, name, email };
        }
        return done(null, user);
      } catch (err) {
        return done(err, null);
      }
    }
  )
);