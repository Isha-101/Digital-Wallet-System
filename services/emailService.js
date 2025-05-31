const nodemailer = require('nodemailer');

// Mock email transporter (in production, use real SMTP settings)
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com', // Replace with your SMTP host
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER || 'your-email@gmail.com',
    pass: process.env.EMAIL_PASS || 'your-app-password'
  }
});

/**
 * Send alert email for suspicious transactions
 */
const sendAlertEmail = async (userId, alertType, details) => {
  try {
    // In a real application, you'd fetch the user's email
    // For this demo, we'll just log the alert
    console.log(`🚨 FRAUD ALERT: ${alertType}`);
    console.log(`User ID: ${userId}`);
    console.log(`Details:`, details);
    console.log(`Timestamp: ${new Date().toISOString()}`);

    // Mock email sending (uncomment and configure for real emails)
    /*
    const mailOptions = {
      from: process.env.EMAIL_FROM || 'alerts@digitalwallet.com',
      to: 'admin@digitalwallet.com',
      subject: `Fraud Alert: ${alertType}`,
      html: `
        <h2>Fraud Detection Alert</h2>
        <p><strong>Alert Type:</strong> ${alertType}</p>
        <p><strong>User ID:</strong> ${userId}</p>
        <p><strong>Details:</strong></p>
        <pre>${JSON.stringify(details, null, 2)}</pre>
        <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log('Alert email sent successfully');
    */

    return { success: true, message: 'Alert logged successfully' };
  } catch (error) {
    console.error('Error sending alert email:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Send transaction notification email
 */
const sendTransactionNotification = async (userEmail, transactionDetails) => {
  try {
    // Mock notification (replace with real email sending in production)
    console.log(`📧 Transaction Notification for ${userEmail}`);
    console.log(`Transaction:`, transactionDetails);
    
    return { success: true, message: 'Notification sent successfully' };
  } catch (error) {
    console.error('Error sending transaction notification:', error);
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendAlertEmail,
  sendTransactionNotification
};