import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

class NodemailerService {
  constructor() {
    this.fromEmail = process.env.EMAIL_FROM || 'noreply@pghub.com';
    
    // Check if configuration exists before creating transporter
    this.host = process.env.SMTP_HOST;
    this.port = Number(process.env.SMTP_PORT) || 587;
    this.user = process.env.SMTP_USER;
    this.pass = process.env.SMTP_PASS;

    if (this.host && this.user && this.pass) {
      this.transporter = nodemailer.createTransport({
        host: this.host,
        port: this.port,
        auth: {
          user: this.user,
          pass: this.pass,
        },
      });
    } else {
      console.warn('Nodemailer SMTP Warning: Credentials are not configured in environment variables.');
    }
  }

  /**
   * Check if Nodemailer SMTP fallback is configured.
   */
  isConfigured() {
    return !!this.transporter;
  }

  /**
   * Sends email via SMTP transporter.
   * @param {Object} options 
   * @returns {Promise<Object>} success response metadata
   */
  async sendEmail({ to, subject, html, text }) {
    if (!this.isConfigured()) {
      // If SMTP is completely unconfigured, we will run in offline mode during development.
      if (process.env.NODE_ENV !== 'production') {
        console.warn('Offline mode: Nodemailer transporter not configured. Logging content:');
        console.log(`[TO]: ${to}\n[SUBJECT]: ${subject}\n[BODY]: ${text}\n`);
        return { success: true, messageId: 'mock_offline_smtp_id', provider: 'offline_log' };
      }
      throw new Error('Nodemailer SMTP service credentials are not configured.');
    }

    try {
      const info = await this.transporter.sendMail({
        from: `"PGHub Support" <${this.fromEmail}>`,
        to,
        subject,
        html,
        text,
      });

      return {
        success: true,
        messageId: info.messageId,
        provider: 'nodemailer',
      };
    } catch (err) {
      console.error('Nodemailer SMTP email failure:', err.message);
      throw err;
    }
  }
}

export default new NodemailerService();
