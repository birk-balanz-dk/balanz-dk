// api/verify.js
export default async function handler(req, res) {
  try {
    const { token } = req.query;

    if (!token) {
      return res.redirect(302, '/login.html?error=' + encodeURIComponent('Missing verification token'));
    }

    // Decode token
    let decoded;
    try {
      const tokenString = Buffer.from(token, 'base64').toString();
      decoded = JSON.parse(tokenString);
    } catch (e) {
      return res.redirect(302, '/login.html?error=' + encodeURIComponent('Invalid link'));
    }

    // Verify token type and age
    if (decoded.type !== 'magic-link') {
      return res.redirect(302, '/login.html?error=' + encodeURIComponent('Invalid token type'));
    }

    const tokenAge = Date.now() - decoded.timestamp;
    const thirtyMinutes = 30 * 60 * 1000;
    
    if (tokenAge > thirtyMinutes) {
      return res.redirect(302, '/login.html?error=' + encodeURIComponent('Link has expired'));
    }

    // Token is valid - log successful access
    console.log('Successful magic link access:', decoded.email);

    // Redirect to planner with success indicator
    const plannerUrl = `/planner.html?verified=true&email=${encodeURIComponent(decoded.email)}`;
    
    return res.redirect(302, plannerUrl);

  } catch (error) {
    console.error('Token verification error:', error);
    return res.redirect(302, '/login.html?error=' + encodeURIComponent('Verification failed'));
  }
}
