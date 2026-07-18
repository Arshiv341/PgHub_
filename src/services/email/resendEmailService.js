import { Resend } from 'resend';
import dotenv from 'dotenv';

dotenv.config();

class ResendEmailService {
  constructor() {
    this.apiKey = process.env.RESEND_API_KEY;
    this.fromEmail = process.env.EMAIL_FROM;
    
    if (this.apiKey) {
      this.client = new Resend(this.apiKey);
    } else {
      console.warn('Resend Email Provider Warning: RESEND_API_KEY is not configured in environment variables.');
    }
    
    if (!this.fromEmail) {
      console.warn('Resend Email Provider Warning: EMAIL_FROM is not configured in environment variables.');
    }
  }

  /**
   * Check if Resend is configured.
   */
  isConfigured() {
    return !!(this.client && this.fromEmail);
  }

  /**
   * Sends email via Resend SDK.
   * @param {Object} options 
   * @returns {Promise<Object>} success response metadata
   */
  async sendEmail({ to, subject, html, text }) {
    if (!this.apiKey) {
      throw new Error('Resend API Key is missing. Please configure RESEND_API_KEY in your environment variables.');
    }
    if (!this.fromEmail) {
      throw new Error('Sender email address is missing. Please configure EMAIL_FROM in your environment variables.');
    }
    if (!this.client) {
      this.client = new Resend(this.apiKey);
    }

    try {
      const { data, error } = await this.client.emails.send({
        from: this.fromEmail,
        to,
        subject,
        html,
        text,
      });

      if (error) {
        throw new Error(`Resend API Error: ${error.message}`);
      }

      return {
        success: true,
        messageId: data.id,
        provider: 'resend',
      };
    } catch (err) {
      console.error('Resend provider email failure:', err.message);
      throw err;
    }
  }
}

export default new ResendEmailService();
