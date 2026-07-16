/**
 * Generates welcome email subject, html, and text.
 * @param {string} ownerName - PG Owner's Name
 * @returns {Object} { subject, html, text }
 */
export const getWelcomeTemplate = (ownerName) => {
  const subject = 'Welcome to PGHub!';
  const text = `Hi ${ownerName}, welcome to PGHub! Manage your PGs, rooms, and billing collections seamlessly.`;
  const html = `
    <div style="font-family: sans-serif; padding: 20px; color: #212529; background-color: #f8f9fa; border-radius: 12px; max-width: 500px;">
      <h2 style="color: #7d2ae8; font-size: 20px; font-weight: bold; margin-bottom: 10px;">Welcome to PGHub, ${ownerName}!</h2>
      <p style="font-size: 14px; line-height: 1.5; color: #495057;">We are absolutely thrilled to have you join our SaaS co-living operations network.</p>
      <p style="font-size: 14px; line-height: 1.5; color: #495057;">With your new owner account, you can now:</p>
      <ul style="font-size: 13px; color: #495057; line-height: 1.6;">
        <li>Create and configure multiple PG Properties</li>
        <li>Allocate rooms and beds to students/tenants</li>
        <li>Track rent transactions and generate auto-invoices</li>
        <li>View operational reports and occupancies in real-time</li>
      </ul>
      <p style="font-size: 14px; line-height: 1.5; color: #495057; margin-top: 15px;">Get started today by configuring your first property in your dashboard workspace.</p>
      <p style="font-size: 12px; color: #868e96; margin-top: 20px;">Best regards,<br>The PGHub Team</p>
    </div>
  `;
  return { subject, html, text };
};
