const nodemailer = require('nodemailer');

/**
 * Generate a numeric 6-digit OTP code
 * @returns {Object} OTP data with code and expiry
 */
function generateOtp() {
  const code = String(Math.floor(100000 + Math.random() * 900000));
  const expiresAt = Date.now() + 5 * 60 * 1000; // 5 mins
  return { code, expiresAt };
}

/**
 * Generate a 6-digit alphanumeric OTP code
 * @returns {Object} OTP data with code and expiry
 */
function generateAlphanumericOtp() {
  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  const expiresAt = Date.now() + 5 * 60 * 1000; // 5 mins
  return { code, expiresAt };
}

/**
 * Verify if the provided OTP matches the expected one and is not expired
 * @param {Object} expected - Expected OTP data
 * @param {string} provided - User provided OTP code
 * @returns {boolean} True if OTP is valid and not expired
 */
function verifyOtpCode(expected, provided) {
  if (!expected) return false;
  const notExpired = expected.expiresAt > Date.now();
  return notExpired && String(expected.code) === String(provided);
}

/**
 * Send OTP to user's email
 * @param {string} email - User's email address
 * @param {string} otp - OTP code to send
 * @returns {Promise<Object>} Sending result
 */
async function sendOtpEmail(email, otp) {
  // Development version using basic SMTP with dotenv
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT || '587'),
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD
    }
  });

  const mailOptions = {
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
    to: email,
    subject: 'Your Verification Code',
    text: `Your verification code is: ${otp}\n\nThis code will expire in 5 minutes.`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
        <h2 style="color: #01c0a4;">Verification Code</h2>
        <p>Your verification code is:</p>
        <div style="font-size: 24px; font-weight: bold; letter-spacing: 5px; padding: 15px; background-color: #f9f9f9; border-radius: 5px; margin: 15px 0; text-align: center;">
          ${otp}
        </div>
        <p>This code will expire in 5 minutes.</p>
        <p style="font-size: 12px; color: #777; margin-top: 20px;">
          If you didn't request this code, please ignore this email.
        </p>
      </div>
    `
  };

  return transporter.sendMail(mailOptions);
}

/**
 * Generate an OTP and send it to user's email
 * @param {string} email - User's email address
 * @returns {Promise<Object>} OTP data
 */
async function generateAndSendOtp(email) {
  const otpData = generateAlphanumericOtp();
  
  try {
    await sendOtpEmail(email, otpData.code);
    console.log(`OTP sent to ${email}`);
  } catch (error) {
    console.error('Failed to send OTP email:', error);
    // Don't throw here, we'll just log the error
    // In production, you might want to handle this differently
  }
  
  return otpData;
}

/* PRODUCTION READY EMAIL SENDING CODE (UNCOMMENT WHEN NEEDED)
async function sendOtpEmail(email, otp) {
  // Production version using SendGrid
  const sgMail = require('@sendgrid/mail');
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  
  const msg = {
    to: email,
    from: process.env.EMAIL_FROM,
    subject: 'Your Verification Code',
    text: `Your verification code is: ${otp}\n\nThis code will expire in 5 minutes.`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
        <h2 style="color: #01c0a4;">Verification Code</h2>
        <p>Your verification code is:</p>
        <div style="font-size: 24px; font-weight: bold; letter-spacing: 5px; padding: 15px; background-color: #f9f9f9; border-radius: 5px; margin: 15px 0; text-align: center;">
          ${otp}
        </div>
        <p>This code will expire in 5 minutes.</p>
        <p style="font-size: 12px; color: #777; margin-top: 20px;">
          If you didn't request this code, please ignore this email.
        </p>
      </div>
    `
  };
  
  return sgMail.send(msg);
}
*/

module.exports = { 
  generateOtp, 
  generateAlphanumericOtp,
  verifyOtpCode,
  sendOtpEmail,
  generateAndSendOtp
};