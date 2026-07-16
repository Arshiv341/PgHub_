/**
 * Generates password recovery email details.
 * @param {string} resetToken - security token
 * @returns {Object} { subject, html, text }
 */
export const getForgotPasswordTemplate = (resetToken) => {
  const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}`;
  const subject = 'PGHub Password Reset Instructions';
  const text = `You requested a password reset. Please click the link to reset your credentials: ${resetUrl}. It is valid for 1 hour.`;
  const html = `
    <div style="font-family: sans-serif; padding: 20px; color: #212529; background-color: #f8f9fa; border-radius: 12px; max-width: 500px;">
      <h2 style="color: #7d2ae8; font-size: 20px; font-weight: bold; margin-bottom: 15px;">Reset your PGHub Password</h2>
      <p style="font-size: 14px; line-height: 1.5; color: #495057;">You are receiving this email because you (or someone else) requested to reset your PGHub account password. Click the button below to set up a new password:</p>
      <div style="text-align: center; margin: 25px 0;">
        <a href="${resetUrl}" style="background-color: #7d2ae8; color: #ffffff; padding: 12px 24px; border-radius: 8px; font-size: 14px; font-weight: bold; text-decoration: none; display: inline-block;">
          Reset Password
        </a>
      </div>
      <p style="font-size: 11px; color: #868e96; margin-top: 20px;">This password reset link is valid for 1 hour. If you did not request this reset, no action is needed.</p>
    </div>
  `;
  return { subject, html, text };
};
