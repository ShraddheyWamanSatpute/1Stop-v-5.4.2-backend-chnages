import { onRequest } from 'firebase-functions/v2/https';
import { firestore } from './admin';
import { FUNCTION_KEYS } from './keys';

export const sendTestEmail = onRequest({ cors: true }, async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).send('Method not allowed');
    return;
  }

  try {
    const { provider, recipientEmail, companyId, siteId, subsiteId } = req.body;

    if (!provider || !recipientEmail) {
      res.status(400).json({ 
        success: false, 
        error: 'Provider and recipient email are required' 
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

    const tokenDocId = `${companyId}_${siteId || 'default'}_${subsiteId || 'default'}_${provider}`;
    
    console.log('Looking for OAuth token:', tokenDocId);

    // Get OAuth tokens from Firestore
    const tokenDoc = await firestore.collection('oauth_tokens').doc(tokenDocId).get();

    if (!tokenDoc.exists) {
      res.status(404).json({ 
        success: false, 
        error: `No ${provider} account connected. Please connect your account first.` 
      });
      return;
    }

    const tokenData = tokenDoc.data();
    
    if (!tokenData?.tokens) {
      res.status(404).json({ 
        success: false, 
        error: 'Invalid token data' 
      });
      return;
    }

    if (provider === 'gmail') {
      await sendGmailTestEmail(tokenData.tokens, recipientEmail, tokenData.email);
      
      // Update last used timestamp
      await firestore.collection('oauth_tokens').doc(tokenDocId).update({
        lastUsed: new Date()
      });

      res.status(200).json({ 
        success: true, 
        message: `Test email sent successfully to ${recipientEmail} from ${tokenData.email}` 
      });
    } else if (provider === 'outlook') {
      await sendOutlookTestEmail(tokenData.tokens, recipientEmail, tokenData.email);
      
      // Update last used timestamp
      await firestore.collection('oauth_tokens').doc(tokenDocId).update({
        lastUsed: new Date()
      });

      res.status(200).json({ 
        success: true, 
        message: `Test email sent successfully to ${recipientEmail} from ${tokenData.email}` 
      });
    } else {
      res.status(400).json({ 
        success: false, 
        error: 'Unsupported provider. Use "gmail" or "outlook"' 
      });
    }
  } catch (error: any) {
    console.error('Error sending test email:', error);
    res.status(500).json({ 
      success: false, 
      error: `Failed to send test email: ${error.message}` 
    });
  }
});

async function sendGmailTestEmail(tokens: any, recipientEmail: string, senderEmail: string) {
  // Lazy import to keep deploy-time export analysis fast.
  const { google } = await import("googleapis");
  const oauth2Client = new google.auth.OAuth2(
    FUNCTION_KEYS.google.clientId,
    FUNCTION_KEYS.google.clientSecret
  );

  oauth2Client.setCredentials(tokens);

  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

  // Create email content
  const subject = 'Test Email from 1Stop System';
  const body = `Hello,

This is a test email from your 1Stop booking system to verify that your email configuration is working correctly.

Email sent from: ${senderEmail}
Sent at: ${new Date().toLocaleString()}

If you received this email, your email integration is working properly!

Best regards,
1Stop Team`;

  // Encode email in base64
  const message = [
    `To: ${recipientEmail}`,
    `From: ${senderEmail}`,
    `Subject: ${subject}`,
    '',
    body
  ].join('\n');

  const encodedMessage = Buffer.from(message)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  await gmail.users.messages.send({
    userId: 'me',
    requestBody: {
      raw: encodedMessage,
    },
  });
}

async function sendOutlookTestEmail(tokens: any, recipientEmail: string, senderEmail: string) {
  const subject = 'Test Email from 1Stop System';
  const body = `Hello,

This is a test email from your 1Stop booking system to verify that your email configuration is working correctly.

Email sent from: ${senderEmail}
Sent at: ${new Date().toLocaleString()}

If you received this email, your email integration is working properly!

Best regards,
1Stop Team`;

  const emailMessage = {
    message: {
      subject: subject,
      body: {
        contentType: 'Text',
        content: body
      },
      toRecipients: [
        {
          emailAddress: {
            address: recipientEmail
          }
        }
      ]
    },
    saveToSentItems: 'true'
  };

  const response = await fetch('https://graph.microsoft.com/v1.0/me/sendMail', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${tokens.access_token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(emailMessage)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to send Outlook email: ${response.statusText} - ${errorText}`);
  }
}

