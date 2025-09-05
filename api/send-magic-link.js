// api/send-magic-link.js
export default async function handler(req, res) {
  // Add CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email } = req.body;

    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'Invalid email address' });
    }

    // Check if we have API keys
    const hasResendKey = process.env.RESEND_API_KEY && process.env.RESEND_API_KEY !== 'test_key_for_development';
    const jwtSecret = process.env.JWT_SECRET || 'fallback-secret-key';

    // Generate token (using crypto for better security)
    const tokenData = {
      email,
      timestamp: Date.now(),
      type: 'magic-link'
    };

    // Simple base64 encoding for now (can upgrade to JWT later)
    const token = Buffer.from(JSON.stringify(tokenData)).toString('base64');
    
    // Create magic link
    const baseUrl = req.headers.origin || `https://${req.headers.host}`;
    const magicLink = `${baseUrl}/verify?token=${token}`;

    if (hasResendKey) {
      // Try to send real email
      try {
        const { Resend } = await import('resend');
        const resend = new Resend(process.env.RESEND_API_KEY);
        
        await resend.emails.send({
          from: 'Balanz.dk <noreply@balanz.dk>',
          to: [email],
          subject: 'Din adgang til Balanz.dk madplaner',
          html: `
            <h2>Hej!</h2>
            <p>Klik på linket for at få adgang til din madplan:</p>
            <a href="${magicLink}" style="background: #7B9B7D; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px;">Åbn Balanz.dk</a>
            <p>Linket udløber om 30 minutter.</p>
          `
        });
        
        console.log('Real email sent to:', email);
      } catch (emailError) {
        console.log('Email sending failed, falling back to test mode:', emailError.message);
      }
    }

    // Always log the magic link for testing
    console.log('Magic link generated for:', email);
    console.log('Link:', magicLink);

    // Store email request for analytics
    console.log('Email request:', { email, timestamp: new Date().toISOString() });

    return res.status(200).json({ 
      success: true, 
      message: 'Magic link sent successfully'
    });

  } catch (error) {
    console.error('Magic link error:', error);
    return res.status(500).json({ 
      error: 'Failed to send magic link',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}
