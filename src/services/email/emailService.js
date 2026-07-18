import resendEmailService from './resendEmailService.js';

class EmailService {
  /**
   * Main email dispatcher wrapper using Resend.
   * @param {Object} options 
   * @param {string} options.to - recipient email
   * @param {string} options.subject - subject header
   * @param {string} options.html - html text
   * @param {string} options.text - plain text
   * @returns {Promise<Object>} dispatch report details
   */
  async sendEmail({ to, subject, html, text }) {
    try {
      console.log(`Email Service: Attempting dispatch to ${to} via Resend...`);
      const report = await resendEmailService.sendEmail({ to, subject, html, text });
      console.log(`Email Service Success: Dispatched via ${report.provider}. Msg ID: ${report.messageId}`);
      return report;
    } catch (err) {
      console.error(`Email Service Error: Resend failed to dispatch to ${to}. Error: ${err.message}`);
      throw err;
    }
  }
}

export default new EmailService();
