// api/verify.js - Vercel serverless function
export default async function handler(req, res) {
  console.log('Verify endpoint called with method:', req.method);
  console.log('Query params:', req.query);
  
  try {
    const { token } = req.query;

    if (!token) {
      console.log('No token provided');
      return res.redirect(302, '/login.html?error=' + encodeURIComponent('Missing verification token'));
    }

    // Decode token
    let decoded;
    try {
      const tokenString = Buffer.from(token, 'base64').toString();
      decoded = JSON.parse(tokenString);
      console.log('Token decoded successfully:', { email: decoded.email, type: decoded.type });
    } catch (e) {
      console.log('Token decode failed:', e.message);
      return res.redirect(302, '/login.html?error=' + encodeURIComponent('Invalid link'));
    }

    // Verify token type and age
    if (decoded.type !== 'magic-link') {
      console.log('Invalid token type:', decoded.type);
      return res.redirect(302, '/login.html?error=' + encodeURIComponent('Invalid token type'));
    }

    const tokenAge = Date.now() - decoded.timestamp;
    const thirtyMinutes = 30 * 60 * 1000;
    
    if (tokenAge > thirtyMinutes) {
      console.log('Token expired. Age:', tokenAge, 'ms');
      return res.redirect(302, '/login.html?error=' + encodeURIComponent('Link has expired'));
    }

    // Token is valid
    console.log('Token is valid. Redirecting to planner for:', decoded.email);

    // Redirect to planner with success indicator
    const plannerUrl = `/planner.html?verified=true&email=${encodeURIComponent(decoded.email)}`;
    
    return res.redirect(302, plannerUrl);

  } catch (error) {
    console.error('Token verification error:', error);
    return res.redirect(302, '/login.html?error=' + encodeURIComponent('Verification failed'));
  }
}
