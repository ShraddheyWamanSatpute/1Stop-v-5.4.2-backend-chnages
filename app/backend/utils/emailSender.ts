import emailjs from '@emailjs/browser';

interface EmailResult {
  success: boolean;
  message?: string;
  error?: string;
}

// EmailJS Configuration
// Get these free from https://www.emailjs.com/
const EMAILJS_CONFIG = {
  serviceId: 'your_service_id',  // Replace with your EmailJS service ID
  templateId: 'your_template_id', // Replace with your EmailJS template ID
  publicKey: 'your_public_key'   // Replace with your EmailJS public key
};

// Check if EmailJS is configured
function isConfigured(): boolean {
  return EMAILJS_CONFIG.serviceId !== 'your_service_id' &&
         EMAILJS_CONFIG.templateId !== 'your_template_id' &&
         EMAILJS_CONFIG.publicKey !== 'your_public_key';
}

/**
 * Send a test email using EmailJS (super simple!)
 * No backend, no Firestore, no OAuth!
 */
export async function sendTestEmail(
  recipientEmail: string,
  senderName: string = '1Stop System'
): Promise<EmailResult> {
  // Check if EmailJS is configured
  if (!isConfigured()) {
    return {
      success: false,
      error: `EmailJS not configured yet! 
      
Please follow these steps:
1. Sign up FREE at https://www.emailjs.com/
2. Create an email service and template
3. Update the config in src/backend/utils/emailSender.ts

See EMAILJS_SETUP.md for detailed instructions.`
    };
  }

  try {
    const templateParams = {
      to_email: recipientEmail,
      from_name: senderName,
      subject: 'Test Email from 1Stop System',
      message: `Hello,

This is a test email from your 1Stop booking system to verify that your email configuration is working correctly.

Sent at: ${new Date().toLocaleString()}

If you received this email, your email integration is working properly!

Best regards,
1Stop Team`,
      reply_to: recipientEmail
    };

    const response = await emailjs.send(
      EMAILJS_CONFIG.serviceId,
      EMAILJS_CONFIG.templateId,
      templateParams,
      EMAILJS_CONFIG.publicKey
    );

    if (response.status === 200) {
      return {
        success: true,
        message: `Test email sent successfully to ${recipientEmail}!`
      };
    } else {
      return {
        success: false,
        error: 'Failed to send email'
      };
    }
  } catch (error: any) {
    console.error('Error sending email:', error);
    
    let errorMessage = 'Failed to send email';
    
    if (error.text) {
      errorMessage = `EmailJS Error: ${error.text}`;
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    // Add helpful hint for common errors
    if (error.status === 400 || error.text?.includes('Invalid')) {
      errorMessage += '\n\nPlease check your EmailJS configuration in src/backend/utils/emailSender.ts';
    }
    
    return {
      success: false,
      error: errorMessage
    };
  }
}

/**
 * Send a custom email using EmailJS
 */
export async function sendEmail(
  recipientEmail: string,
  subject: string,
  message: string,
  senderName: string = '1Stop System'
): Promise<EmailResult> {
  // Check if EmailJS is configured
  if (!isConfigured()) {
    return {
      success: false,
      error: `EmailJS not configured yet! 
      
Please follow these steps:
1. Sign up FREE at https://www.emailjs.com/
2. Create an email service and template
3. Update the config in src/backend/utils/emailSender.ts

See EMAILJS_SETUP.md for detailed instructions.`
    };
  }

  try {
    const templateParams = {
      to_email: recipientEmail,
      from_name: senderName,
      subject: subject,
      message: message,
      reply_to: recipientEmail
    };

    const response = await emailjs.send(
      EMAILJS_CONFIG.serviceId,
      EMAILJS_CONFIG.templateId,
      templateParams,
      EMAILJS_CONFIG.publicKey
    );

    if (response.status === 200) {
      return {
        success: true,
        message: `Email sent successfully to ${recipientEmail}!`
      };
    } else {
      return {
        success: false,
        error: 'Failed to send email'
      };
    }
  } catch (error: any) {
    console.error('Error sending email:', error);
    
    let errorMessage = 'Failed to send email';
    
    if (error.text) {
      errorMessage = `EmailJS Error: ${error.text}`;
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    // Add helpful hint for common errors
    if (error.status === 400 || error.text?.includes('Invalid')) {
      errorMessage += '\n\nPlease check your EmailJS configuration in src/backend/utils/emailSender.ts';
    }
    
    return {
      success: false,
      error: errorMessage
    };
  }
}
