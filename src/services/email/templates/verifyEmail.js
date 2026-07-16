/**
 * Generates verification email subject, html and text payloads.
 * @param {string} otp - 6 digit verification code
 * @returns {Object} { subject, html, text }
 */
export const getVerifyEmailTemplate = (otp) => {
  const subject = 'PGHub Email Verification Code';
  const text = `Your PGHub email verification OTP code is: ${otp}. It is valid for 10 minutes.`;
  const html = `
    <div style="font-family: sans-serif; padding: 20px; color: #212529; background-color: #f8f9fa; border-radius: 12px; max-width: 500px;">
      <h2 style="color: #7d2ae8; font-size: 20px; font-weight: bold; margin-bottom: 15px;">Verify your PGHub Account</h2>
      <p style="font-size: 14px; line-height: 1.5; color: #495057;">Thank you for registering with PGHub! Please use the following 6-digit Verification Code (OTP) to complete your email registration:</p>
      <div style="background-color: #f3ebfe; border: 1px solid #7d2ae8; padding: 12px 20px; border-radius: 8px; font-size: 24px; font-weight: bold; color: #7d2ae8; text-align: center; margin: 20px 0; letter-spacing: 4px;">
        ${otp}
      </div>
      <p style="font-size: 11px; color: #868e96; margin-top: 20px;">This code will expire in 10 minutes. If you did not request this, you can safely ignore this email.</p>
    </div>
  `;
  return { subject, html, text };
};
