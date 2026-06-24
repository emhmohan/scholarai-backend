import { Resend } from 'resend';
import logger from './logger.js';

const FRONTEND  = process.env.FRONTEND_URL  || 'http://localhost:5173';
const FROM      = process.env.RESEND_FROM   || 'ScholarAI <onboarding@resend.dev>';

const getResend = () => new Resend(process.env.RESEND_API_KEY);

const templates = {

  welcome: (name) => ({
    subject: 'Welcome to ScholarAI!',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#0a0a0f;color:#e2e8f0;padding:40px;border-radius:16px;">
        <div style="text-align:center;margin-bottom:30px;">
          <div style="background:linear-gradient(135deg,#6c63ff,#a78bfa);width:60px;height:60px;border-radius:16px;display:inline-block;line-height:60px;text-align:center;">
            <span style="color:white;font-size:24px;font-weight:bold;">S</span>
          </div>
          <h1 style="color:#ffffff;margin:16px 0 0;">Welcome to ScholarAI!</h1>
        </div>
        <p style="color:#94a3b8;font-size:16px;">Hi <strong style="color:#ffffff;">${name}</strong>,</p>
        <p style="color:#94a3b8;">Your AI-powered scholarship journey starts now!</p>
        <div style="background:#111118;border-radius:12px;padding:20px;margin:20px 0;">
          <p style="color:#6c63ff;margin:0 0 8px;font-weight:bold;">Find Scholarships</p>
          <p style="color:#94a3b8;margin:0 0 16px;">AI matches you with Fulbright, Chevening, DAAD and more</p>
          <p style="color:#6c63ff;margin:0 0 8px;font-weight:bold;">Write SOP and LOR</p>
          <p style="color:#94a3b8;margin:0 0 16px;">Generate polished documents in 30 seconds</p>
          <p style="color:#6c63ff;margin:0 0 8px;font-weight:bold;">Find Colleges</p>
          <p style="color:#94a3b8;margin:0;">Safe, Match and Reach college suggestions</p>
        </div>
        <div style="text-align:center;margin-top:30px;">
          <a href="${FRONTEND}/profile"
            style="background:linear-gradient(135deg,#6c63ff,#a78bfa);color:white;padding:14px 32px;border-radius:12px;text-decoration:none;font-weight:bold;display:inline-block;">
            Complete Your Profile
          </a>
        </div>
        <p style="color:#64748b;font-size:12px;text-align:center;margin-top:30px;">
          ScholarAI · Built with love · $0/month
        </p>
      </div>
    `,
  }),

  deadlineReminder: (name, scholarships) => ({
    subject: `Deadline Reminder: ${scholarships.length} scholarship(s) due soon`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#0a0a0f;color:#e2e8f0;padding:40px;border-radius:16px;">
        <div style="text-align:center;margin-bottom:30px;">
          <h1 style="color:#ffffff;">Deadline Reminders</h1>
          <p style="color:#94a3b8;">Hi ${name}, these scholarships are due soon!</p>
        </div>
        ${scholarships.map((s) => {
          const days    = Math.ceil((new Date(s.deadline) - new Date()) / (1000 * 60 * 60 * 24));
          const urgency = days <= 3 ? '#f87171' : days <= 7 ? '#fbbf24' : '#34d399';
          return `
            <div style="background:#111118;border-radius:12px;padding:20px;margin:12px 0;border-left:4px solid ${urgency};">
              <h3 style="color:#ffffff;margin:0 0 8px;">${s.title}</h3>
              <p style="color:#94a3b8;margin:0 0 4px;">Provider: ${s.provider}</p>
              <p style="color:${urgency};margin:0 0 8px;font-weight:bold;">
                ${days <= 0 ? 'Due TODAY!' : days === 1 ? 'Due TOMORROW!' : `Due in ${days} days`}
                — ${new Date(s.deadline).toLocaleDateString()}
              </p>
              ${s.url ? `<a href="${s.url}" style="color:#6c63ff;font-size:13px;text-decoration:none;">Apply Now</a>` : ''}
            </div>
          `;
        }).join('')}
        <div style="text-align:center;margin-top:30px;">
          <a href="${FRONTEND}/scholarships"
            style="background:linear-gradient(135deg,#6c63ff,#a78bfa);color:white;padding:14px 32px;border-radius:12px;text-decoration:none;font-weight:bold;display:inline-block;">
            View All Scholarships
          </a>
        </div>
      </div>
    `,
  }),

  statusUpdate: (name, scholarship, status) => ({
    subject: `Application Status Updated: ${scholarship.title}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#0a0a0f;color:#e2e8f0;padding:40px;border-radius:16px;">
        <div style="text-align:center;margin-bottom:30px;">
          <h1 style="color:#ffffff;">Status Updated</h1>
        </div>
        <p style="color:#94a3b8;">Hi <strong style="color:#ffffff;">${name}</strong>,</p>
        <p style="color:#94a3b8;">
          Your application status for
          <strong style="color:#ffffff;">${scholarship.title}</strong>
          has been updated.
        </p>
        <div style="background:#111118;border-radius:12px;padding:24px;margin:20px 0;text-align:center;">
          <p style="color:#94a3b8;margin:0 0 12px;">New Status</p>
          <span style="
            background:${status === 'accepted' ? 'rgba(52,211,153,0.2)' : status === 'rejected' ? 'rgba(248,113,113,0.2)' : 'rgba(108,99,255,0.2)'};
            color:${status === 'accepted' ? '#34d399' : status === 'rejected' ? '#f87171' : '#6c63ff'};
            padding:10px 28px;border-radius:24px;font-weight:bold;font-size:18px;
            text-transform:capitalize;display:inline-block;">
            ${status}
          </span>
        </div>
        <div style="text-align:center;margin-top:30px;">
          <a href="${FRONTEND}/scholarships"
            style="background:linear-gradient(135deg,#6c63ff,#a78bfa);color:white;padding:14px 32px;border-radius:12px;text-decoration:none;font-weight:bold;display:inline-block;">
            View Scholarships
          </a>
        </div>
      </div>
    `,
  }),

  checklistReminder: (name, pendingCount) => ({
    subject: `You have ${pendingCount} pending tasks on ScholarAI`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#0a0a0f;color:#e2e8f0;padding:40px;border-radius:16px;">
        <div style="text-align:center;margin-bottom:30px;">
          <h1 style="color:#ffffff;">Pending Tasks</h1>
        </div>
        <p style="color:#94a3b8;">Hi <strong style="color:#ffffff;">${name}</strong>,</p>
        <p style="color:#94a3b8;">
          You have <strong style="color:#fbbf24;">${pendingCount} pending tasks</strong>
          on your application checklist.
        </p>
        <p style="color:#94a3b8;">Stay on track to maximize your scholarship chances!</p>
        <div style="text-align:center;margin-top:30px;">
          <a href="${FRONTEND}/checklist"
            style="background:linear-gradient(135deg,#6c63ff,#a78bfa);color:white;padding:14px 32px;border-radius:12px;text-decoration:none;font-weight:bold;display:inline-block;">
            View Checklist
          </a>
        </div>
      </div>
    `,
  }),

  recommenderInvite: (recommenderName, studentName, program, portalUrl) => ({
    subject: `${studentName} requests a Letter of Recommendation`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#0a0a0f;color:#e2e8f0;padding:40px;border-radius:16px;">
        <div style="text-align:center;margin-bottom:30px;">
          <h1 style="color:#ffffff;">Letter of Recommendation Request</h1>
        </div>
        <p style="color:#94a3b8;">Dear <strong style="color:#ffffff;">${recommenderName}</strong>,</p>
        <p style="color:#94a3b8;">
          <strong style="color:#ffffff;">${studentName}</strong> has requested a letter of
          recommendation for their application to
          <strong style="color:#ffffff;">${program}</strong>.
        </p>
        <p style="color:#94a3b8;">
          An AI-drafted letter has been prepared for your review.
          You can edit it or write a completely new one.
        </p>
        <div style="text-align:center;margin:30px 0;">
          <a href="${portalUrl}"
            style="background:linear-gradient(135deg,#6c63ff,#a78bfa);color:white;padding:14px 32px;border-radius:12px;text-decoration:none;font-weight:bold;display:inline-block;">
            View and Submit LOR
          </a>
        </div>
        <p style="color:#64748b;font-size:12px;text-align:center;">
          This link expires in 30 days.
        </p>
      </div>
    `,
  }),

  lorSubmitted: (studentName, recommenderName, program) => ({
    subject: `Your LOR has been submitted by ${recommenderName}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#0a0a0f;color:#e2e8f0;padding:40px;border-radius:16px;">
        <div style="text-align:center;margin-bottom:30px;">
          <h1 style="color:#ffffff;">LOR Submitted!</h1>
        </div>
        <p style="color:#94a3b8;">Hi <strong style="color:#ffffff;">${studentName}</strong>,</p>
        <p style="color:#94a3b8;">
          Great news! <strong style="color:#ffffff;">${recommenderName}</strong> has submitted
          your Letter of Recommendation for
          <strong style="color:#ffffff;">${program}</strong>.
        </p>
        <div style="background:#111118;border-radius:12px;padding:20px;margin:20px 0;text-align:center;">
          <span style="background:rgba(52,211,153,0.2);color:#34d399;padding:10px 24px;border-radius:24px;font-weight:bold;font-size:16px;display:inline-block;">
            LOR Submitted
          </span>
        </div>
        <div style="text-align:center;margin-top:30px;">
          <a href="${FRONTEND}/lor"
            style="background:linear-gradient(135deg,#6c63ff,#a78bfa);color:white;padding:14px 32px;border-radius:12px;text-decoration:none;font-weight:bold;display:inline-block;">
            View LOR
          </a>
        </div>
      </div>
    `,
  }),
};

export const sendEmail = async (to, templateName, templateData) => {
  try {
    if (!process.env.RESEND_API_KEY) {
      logger.warn('RESEND_API_KEY not set — skipping email');
      return false;
    }

    const template = templates[templateName](...templateData);

    const { error } = await getResend().emails.send({
      from:    FROM,
      to:      [to],
      subject: template.subject,
      html:    template.html,
    });

    if (error) {
      logger.error(`Resend error: ${JSON.stringify(error)}`);
      return false;
    }

    logger.info(`Email sent via Resend: ${templateName} to ${to}`);
    return true;
  } catch (error) {
    logger.error(`Email send failed: ${error.message}`);
    return false;
  }
};

export default templates;