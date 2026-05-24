// config/passport.js
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/user.model.js');

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL   // http://localhost:3000/api/auth/google/callback
},
    async (accessToken, refreshToken, profile, done) => {
        try {
            // 1. ¿Ya existe con este googleId?
            let user = await User.findOne({ googleId: profile.id });

            if (!user) {
                // 2. ¿Existe con ese email (registro manual previo)?
                user = await User.findOne({ email: profile.emails[0].value });

                if (user) {
                    // Vincula Google a la cuenta manual existente
                    user.googleId = profile.id;
                    user.emailVerified = true;
                    if (!user.fotoUrl) user.fotoUrl = profile.photos[0]?.value;
                    await user.save();
                } else {
                    // 3. No existe → crear cuenta nueva con datos de Google
                    user = await User.create({
                        googleId: profile.id,
                        email: profile.emails[0].value,
                        nombre: profile.name.givenName,
                        apellido: profile.name.familyName,
                        fotoUrl: profile.photos[0]?.value,
                        emailVerified: true
                    });
                }
            }

            return done(null, user);

        } catch (err) {
            return done(err, null);
        }
    }
));

module.exports = passport;