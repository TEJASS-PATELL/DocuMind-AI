const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const db = require("./db");

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_CALLBACK_URL = process.env.GOOGLE_CALLBACK_URL;

if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_CALLBACK_URL) {
  throw new Error("Google OAuth environment variables are missing");
}

passport.use(
  new GoogleStrategy(
    {
      clientID: GOOGLE_CLIENT_ID,
      clientSecret: GOOGLE_CLIENT_SECRET,
      callbackURL: GOOGLE_CALLBACK_URL
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value?.trim().toLowerCase();
        const name = profile.displayName?.trim() || "Google User";

        if (!email) {
          return done(new Error("Google account email not available"), null);
        }

        const [existing] = await db.execute(
          "SELECT id, name, email FROM aiusers WHERE email = ? LIMIT 1",
          [email]
        );

        if (existing.length > 0) {
          return done(null, existing[0]);
        }

        const [result] = await db.execute(
          "INSERT INTO aiusers (name, email, password) VALUES (?, ?, ?)",
          [name, email, ""]
        );

        return done(null, {
          id: result.insertId,
          name,
          email
        });
      } catch (err) {
        console.error("Google authentication error:", err);
        return done(err, null);
      }
    }
  )
);

module.exports = passport;