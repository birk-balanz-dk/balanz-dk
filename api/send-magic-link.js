// api/send-magic-link.js - Vercel serverless function
import jwt from 'jsonwebtoken';
import { Resend } from 'resend';

// Initialize email service
const resend = new Resend(process.env.RESEND_API_KEY);

// Secret for JWT tokens
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email } = req.body;

    // Validate email
    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'Invalid email address' });
    }

    // Generate magic link token (expires in 30 minutes)
    const token = jwt.sign(
      { 
        email, 
        timestamp: Date.now(),
        type: 'magic-link'
      }, 
      JWT_SECRET, 
      { expiresIn: '30m' }
    );

    // Create magic link
    const magicLink = `${process.env.VERCEL_URL || 'http://localhost:3000'}/verify?token=${token}`;

    // Send email
    const emailResult = await sendMagicLinkEmail(email, magicLink);

    if (!emailResult.success) {
      throw new Error('Failed to send email');
    }

    // Store email in database (optional - for analytics)
    await storeEmailRequest(email);

    // Return success
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

// Send magic link email using Resend
async function sendMagicLinkEmail(email, magicLink) {
  try {
    const result = await resend.emails.send({
      from: 'Balanz.dk <noreply@balanz.dk>',
      to: [email],
      subject: 'Din adgang til Balanz.dk madplaner',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .logo { color: #7B9B7D; font-size: 24px; font-weight: bold; }
            .button { 
              display: inline-block; 
              background-color: #7B9B7D; 
              color: white; 
              padding: 15px 30px; 
              text-decoration: none; 
              border-radius: 8px; 
              font-weight: bold;
              margin: 20px 0;
            }
            .footer { margin-top: 30px; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">🌱 Balanz.dk</div>
            </div>
            
            <h2>Hej!</h2>
            
            <p>Du har anmodet om adgang til Balanz.dk - din smarte madassistent.</p>
            
            <p>Klik på knappen nedenfor for at få adgang til dine personlige madplaner:</p>
            
            <div style="text-align: center;">
              <a href="${magicLink}" class="button">Åbn Balanz.dk</a>
            </div>
            
            <p><strong>Vigtigt:</strong> Dette link udløber om 30 minutter af sikkerhedshensyn.</p>
            
            <p>Hvis du ikke har anmodet om denne adgang, kan du bare ignorere denne email.</p>
            
            <div class="footer">
              <p>Med venlig hilsen,<br>Balanz.dk teamet</p>
              <p>Sund mad til smarte priser 🥗💰</p>
            </div>
          </div>
        </body>
        </html>
      `
    });

    return { success: true, result };
  } catch (error) {
    console.error('Email send error:', error);
    return { success: false, error };
  }
}

// Store email request for analytics (simple JSON file approach)
async function storeEmailRequest(email) {
  // For production, use Supabase or similar
  // For now, just log it
  console.log('Email request:', { email, timestamp: new Date().toISOString() });
  
  // TODO: Store in database
  // const { createClient } = require('@supabase/supabase-js');
  // const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
  // await supabase.from('email_requests').insert({ email, created_at: new Date() });
  
  return true;
}