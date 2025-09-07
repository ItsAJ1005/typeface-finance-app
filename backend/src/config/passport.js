const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: '/api/auth/google/callback',
      scope: ['profile', 'email'],
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Check if user already exists
        let user = await User.findOne({ googleId: profile.id });

        if (user) {
          return done(null, user);
        }

        // Check if email is already registered
        user = await User.findOne({ email: profile.emails[0].value });

        if (user) {
          // If user exists but not with Google, update with Google ID
          user.googleId = profile.id;
          user.authMethod = 'google';
          if (!user.avatar && profile.photos && profile.photos.length > 0) {
            user.avatar = profile.photos[0].value;
          }
          await user.save();
          return done(null, user);
        }

        // Create new user
        const newUser = new User({
          name: profile.displayName,
          email: profile.emails[0].value,
          googleId: profile.id,
          authMethod: 'google',
          avatar: profile.photos && profile.photos.length > 0 ? profile.photos[0].value : null,
        });

        await newUser.save();
        done(null, newUser);
      } catch (error) {
        done(error, null);
      }
    }
  )
);

module.exports = passport;
