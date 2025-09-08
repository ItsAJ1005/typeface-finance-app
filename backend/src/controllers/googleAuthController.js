const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User');
const jwt = require('jsonwebtoken');

console.log('Initializing Google OAuth client with ID:', process.env.GOOGLE_CLIENT_ID);
// Initialize Google OAuth client with proper configuration
const client = new OAuth2Client({
  clientId: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET
});

// Log environment variables for debugging (without sensitive data)
console.log('Environment configuration:', {
  NODE_ENV: process.env.NODE_ENV,
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID ? 'Set' : 'Not Set',
  CLIENT_URL: process.env.CLIENT_URL
});

const generateToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET || 'fallback-secret-key',
    { expiresIn: process.env.JWT_EXPIRE || '7d' }
  );
};

exports.googleAuth = async (req, res) => {
  console.log('Google auth request received');
  
  try {
    console.log('Request headers:', req.headers);
    console.log('Request body type:', typeof req.body);
    
    // Get the credential from the request
    let credential;
    
    // If body is a string (raw text/plain)
    if (typeof req.body === 'string') {
      credential = req.body.trim();
    } 
    // If body is a JSON object with a credential field
    else if (req.body && typeof req.body === 'object') {
      if (req.body.credential) {
        credential = req.body.credential;
      } else if (req.body.rawBody) {
        // Try to parse rawBody if available
        try {
          const parsed = JSON.parse(req.body.rawBody);
          credential = parsed.credential;
        } catch (e) {
          console.error('Error parsing rawBody:', e);
        }
      }
    }
    
    // Fallback to rawBody if still no credential
    if (!credential && req.rawBody) {
      try {
        const parsed = JSON.parse(req.rawBody);
        credential = parsed.credential;
      } catch (e) {
        // If not JSON, use rawBody as is
        credential = req.rawBody.trim();
      }
    }
    
    if (!credential) {
      console.error('No credential provided in request');
      return res.status(400).json({
        success: false,
        message: 'No credential provided',
        code: 'MISSING_CREDENTIAL',
        receivedBody: req.body
      });
    }
    
    // Ensure credential is a string
    credential = String(credential).trim();
    
    if (!credential.startsWith('ey')) {
      console.error('Invalid JWT format:', credential.substring(0, 50) + '...');
      return res.status(400).json({
        success: false,
        message: 'Invalid credential format',
        code: 'INVALID_CREDENTIAL_FORMAT'
      });
    }
    
    console.log('Verifying Google ID token...');
    
    // Verify the Google ID token
    let ticket;
    try {
      ticket = await client.verifyIdToken({
        idToken: credential,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
    } catch (verifyError) {
      console.error('Error verifying Google ID token:', verifyError);
      return res.status(401).json({
        success: false,
        message: 'Invalid Google token',
        error: verifyError.message
      });
    }
    
    const payload = ticket.getPayload();
    const { sub: googleId, email, name, picture } = payload;
    
    console.log('Google payload received:', { googleId, email, name });
    
    if (!email) {
      console.error('No email in Google payload');
      return res.status(400).json({
        success: false,
        message: 'No email found in Google account'
      });
    }

    console.log('Checking if user exists...');
    
    // Check if user exists by googleId first
    let user = await User.findOne({ googleId });
    
    if (!user) {
      console.log('No user found with googleId, checking by email...');
      // Check if user with this email already exists
      user = await User.findOne({ email });
      
      if (user) {
        console.log('User found by email, linking Google account...');
        // Link Google account to existing user
        user.googleId = googleId;
        user.authMethod = 'google';
        if (!user.avatar && picture) {
          user.avatar = picture;
        }
        await user.save();
      } else {
        console.log('Creating new user with Google account...');
        // Create new user
        user = new User({
          name: name || email.split('@')[0], // Use email prefix if name not provided
          email,
          googleId,
          authMethod: 'google',
          avatar: picture || null,
        });
        await user.save();
      }
    } else {
      console.log('Found existing user with googleId');
    }

    console.log('Generating JWT token...');
    
    // Generate JWT token
    const token = generateToken(user._id);
    
    const userResponse = {
      id: user._id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      authMethod: user.authMethod
    };
    
    console.log('Google authentication successful:', userResponse);
    
    res.json({
      success: true,
      token,
      user: userResponse
    });
  } catch (error) {
    console.error('Google auth error:', error);
    const statusCode = error.statusCode || 500;
    const message = error.message || 'Authentication failed';
    
    res.status(statusCode).json({
      success: false,
      message,
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// This function will be called after successful Google OAuth redirect
exports.googleAuthCallback = (req, res) => {
  // This will be called after the Google OAuth flow completes
  // The token is already set in the URL by the frontend
  const { token } = req.query;
  
  if (token) {
    // Redirect to the frontend with the token
    return res.redirect(`${process.env.CLIENT_URL}/auth/callback?token=${token}`);
  }
  
  // If no token, redirect to login with error
  res.redirect(`${process.env.CLIENT_URL}/login?error=google_auth_failed`);
};
