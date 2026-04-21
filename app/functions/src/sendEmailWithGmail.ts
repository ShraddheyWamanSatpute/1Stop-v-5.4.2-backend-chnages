import { onRequest } from 'firebase-functions/v2/https';
import * as nodemailer from 'nodemailer';
import { loadMailboxConfig } from './mailConfigSecrets';

export const sendEmailWithGmail = onRequest({ cors: true }, async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ success: false, error: 'Method not allowed' });
    return;
  }

  try {
    const { recipientEmail, subject, body, companyId, siteId, subsiteId } = req.body;

    if (!recipientEmail || !subject || !body) {
      res.status(400).json({ 
        success: false, 
        error: 'recipientEmail, subject, and body are required' 
      });
      return;
    }

    if (!companyId) {
      res.status(400).json({ 
        success: false, 
        error: 'Company ID is required' 
      });
      return;
    }

    // Get email configuration from database
    const configPath = `companies/${companyId}/sites/${siteId || 'default'}/subsites/${subsiteId || 'default'}/emailConfig`;
    const emailConfig = await loadMailboxConfig(
      `companies/${companyId}/sites/${siteId || 'default'}/subsites/${subsiteId || 'default'}`,
      configPath,
      'bookings',
    )

    if (!emailConfig || !emailConfig.email || !emailConfig.appPassword) {
      res.status(404).json({ 
        success: false, 
        error: 'Email not configured. Please configure your Gmail mailbox and ensure the password is stored server-side.' 
      });
      return;
    }

    // Create transporter using Gmail App Password
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: emailConfig.email,
        pass: emailConfig.appPassword
      }
    });

    // Send email
    const info = await transporter.sendMail({
      from: `"${emailConfig.senderName || '1Stop System'}" <${emailConfig.email}>`,
      to: recipientEmail,
      subject: subject,
      text: body,
      html: body.replace(/\n/g, '<br>')
    });

    console.log('Email sent:', info.messageId);

    res.status(200).json({ 
      success: true, 
      message: `Email sent successfully to ${recipientEmail}`,
      messageId: info.messageId
    });

  } catch (error: any) {
    console.error('Error sending email:', error);
    
    let errorMessage = 'Failed to send email';
    
    if (error.code === 'EAUTH') {
      errorMessage = 'Authentication failed. Please check your Gmail App Password.';
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    res.status(500).json({ 
      success: false, 
      error: errorMessage 
    });
  }
});

