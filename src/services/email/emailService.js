import resendEmailService from './resendEmailService.js';
import nodemailerService from './nodemailerService.js';

class EmailService {
  /**
   * Main email dispatcher wrapper.
   * Automatically attempts Resend first, falling back to SMTP Nodemailer on failures.
   * @param {Object} options 
   * @param {string} options.to - recipient email
   * @param {string} options.subject - subject header
   * @param {string} options.html - html text
   * @param {string} options.text - plain text
   * @returns {Promise<Object>} dispatch report details
   */
  async sendEmail({ to, subject, html, text }) {
    // 1. Try Resend Service if configured
    if (resendEmailService.isConfigured()) {
      try {
        console.log(`Email Service: Attempting dispatch to ${to} via Resend...`);
        const report = await resendEmailService.sendEmail({ to, subject, html, text });
        console.log(`Email Service Success: Dispatched via ${report.provider}. Msg ID: ${report.messageId}`);
        return report;
      } catch (err) {
        console.warn(`Email Service Warning: Resend dispatch failed. Transitioning to fallback... Error: ${err.message}`);
      }
    }

    // 2. Fallback to Nodemailer SMTP Transporter
    try {
      console.log(`Email Service: Attempting dispatch to ${to} via Nodemailer SMTP...`);
      const report = await nodemailerService.sendEmail({ to, subject, html, text });
      console.log(`Email Service Success: Dispatched via fallback ${report.provider}. Msg ID: ${report.messageId}`);
      return report;
    } catch (err) {
      console.error(`Email Service Error: All email providers failed to dispatch to ${to}. Error: ${err.message}`);
      return {
        success: false,
        error: err.message,
        provider: 'none',
      };
    }
  }
}

export default new EmailService();
