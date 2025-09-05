// api/verify.js - Vercel serverless function for magic link verification
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export default async function handler(req, res) {
  try {
    const { token } = req.query;

    if (!token) {
      return redirectWithError(res, 'Missing verification token');
    }

    // Verify the JWT token
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Check if it's a magic link token
    if (decoded.type !== 'magic-link') {
      return redirectWithError(res, 'Invalid token type');
    }

    // Check token age (extra security - JWT expiry should handle this)
    const tokenAge = Date.now() - decoded.timestamp;
    const thirtyMinutes = 30 * 60 * 1000;
    
    if (tokenAge > thirtyMinutes) {
      return redirectWithError(res, 'Link has expired');
    }

    // Token is valid - log the successful access
    await logSuccessfulAccess(decoded.email);

    // Redirect to planner with success indicator
    const plannerUrl = `/planner.html?verified=true&email=${encodeURIComponent(decoded.email)}`;
    
    return res.redirect(302, plannerUrl);

  } catch (error) {
    console.error('Token verification error:', error);
    
    let errorMessage = 'Invalid or expired link';
    
    // Handle specific JWT errors
    if (error.name === 'TokenExpiredError') {
      errorMessage = 'Link has expired';
    } else if (error.name === 'JsonWebTokenError') {
      errorMessage = 'Invalid link';
    }

    return redirectWithError(res, errorMessage);
  }
}

// Redirect to error page with message
function redirectWithError(res, message) {
  const errorUrl = `/login.html?error=${encodeURIComponent(message)}`;
  return res.redirect(302, errorUrl);
}

// Log successful access for analytics
async function logSuccessfulAccess(email) {
  console.log('Successful magic link access:', { 
    email, 
    timestamp: new Date().toISOString() 
  });
  
  // TODO: Store in database for analytics
  // const { createClient } = require('@supabase/supabase-js');
  // const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
  // await supabase.from('successful_logins').insert({ 
  //   email, 
  //   login_at: new Date(),
  //   method: 'magic-link'
  // });
  
  return true;
}