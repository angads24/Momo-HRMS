"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var EmailService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailService = void 0;
const dns = require("dns");
try {
    dns.setDefaultResultOrder("ipv4first");
}
catch { }
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const nodemailer = require("nodemailer");
let EmailService = EmailService_1 = class EmailService {
    constructor(config) {
        this.config = config;
        this.logger = new common_1.Logger(EmailService_1.name);
        this.transporter = null;
        this.brevoApiKey = (process.env.BREVO_API_KEY || '').trim();
        this.resendApiKey = (process.env.RESEND_API_KEY || '').trim();
        this.host = process.env.SMTP_HOST || 'smtp.gmail.com';
        this.port = parseInt(process.env.SMTP_PORT || '587', 10);
        this.secure = (process.env.SMTP_SECURE || 'false').toLowerCase() === 'true';
        this.user = process.env.SMTP_USER || '';
        this.pass = (process.env.SMTP_PASSWORD || process.env.SMTP_PASS || '').replace(/\s+/g, '');
        this.fromName = process.env.SMTP_FROM_NAME || 'Momo HRMS';
        this.fromEmail = process.env.SMTP_FROM_EMAIL || this.user;
        this.frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        const hasSmtp = Boolean(this.host && this.port && this.user && this.pass);
        this.isConfigured = Boolean(this.brevoApiKey || this.resendApiKey || hasSmtp);
        if (hasSmtp) {
            const isPort465 = this.port === 465;
            const transportOptions = {
                host: this.host,
                port: this.port,
                secure: isPort465 ? true : this.secure,
                auth: {
                    user: this.user,
                    pass: this.pass,
                },
                family: 4,
                connectionTimeout: 8000,
                greetingTimeout: 8000,
                socketTimeout: 10000,
                tls: {
                    rejectUnauthorized: false,
                },
            };
            this.transporter = nodemailer.createTransport(transportOptions);
        }
    }
    async onModuleInit() {
        if (this.brevoApiKey) {
            this.logger.log('Email delivery configured via Brevo HTTP API (Port 443 HTTPS).');
        }
        else if (this.resendApiKey) {
            this.logger.log('Email delivery configured via Resend HTTP API (Port 443 HTTPS).');
        }
        else if (this.transporter) {
            this.logger.log(`SMTP transport initialized for ${this.host}:${this.port} (${this.user}) with IPv4 enforced.`);
            this.transporter
                .verify()
                .then(() => {
                this.logger.log(`SMTP transport connection verified with ${this.host}:${this.port}`);
            })
                .catch((err) => {
                this.logger.warn(`SMTP transport verification note: ${err.message}. (Note: Render Free tier blocks outbound SMTP ports 25, 465, 587)`);
            });
        }
        else {
            this.logger.warn('Email service is not configured with SMTP or API keys; credentials will be logged to console.');
        }
    }
    get fromAddress() {
        return `"${this.fromName}" <${this.fromEmail}>`;
    }
    async sendViaBrevo(toEmail, subject, htmlContent, textContent, recipientName) {
        const url = 'https://api.brevo.com/v3/smtp/email';
        const payload = {
            sender: {
                name: this.fromName,
                email: this.fromEmail || this.user,
            },
            to: [
                {
                    email: toEmail,
                    name: recipientName || toEmail,
                },
            ],
            subject,
            htmlContent,
            textContent,
        };
        const res = await fetch(url, {
            method: 'POST',
            headers: {
                accept: 'application/json',
                'api-key': this.brevoApiKey,
                'content-type': 'application/json',
            },
            body: JSON.stringify(payload),
        });
        if (!res.ok) {
            const errorText = await res.text();
            throw new Error(`Brevo HTTP API ${res.status}: ${errorText}`);
        }
        return await res.json();
    }
    async sendViaResend(toEmail, subject, htmlContent, textContent) {
        const url = 'https://api.resend.com/emails';
        const from = this.fromEmail && this.fromEmail.includes('@') && !this.fromEmail.endsWith('@gmail.com')
            ? `${this.fromName} <${this.fromEmail}>`
            : `${this.fromName} <onboarding@resend.dev>`;
        const payload = {
            from,
            to: [toEmail],
            subject,
            html: htmlContent,
            text: textContent,
        };
        const res = await fetch(url, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${this.resendApiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });
        if (!res.ok) {
            const errorText = await res.text();
            throw new Error(`Resend HTTP API ${res.status}: ${errorText}`);
        }
        return await res.json();
    }
    async sendCredentialEmail(options) {
        const { toEmail, employeeName, officialEmail, username, temporaryPassword, isPasswordReset = false, roleName = 'EMPLOYEE', } = options;
        const isWebAdminOrHr = roleName.includes('HR') ||
            roleName.includes('ADMIN') ||
            roleName === 'SUPER_ADMIN' ||
            roleName === 'HR_ADMIN';
        const loginUrl = `${this.frontendUrl}/login`;
        const subject = isPasswordReset
            ? 'Your Momo HRMS Account Password Has Been Reset'
            : isWebAdminOrHr
                ? 'Welcome to Momo HRMS - Your Admin & HR Portal Credentials'
                : 'Welcome to Momo HRMS - Your Employee Mobile App Credentials';
        const textContent = `
Hello ${employeeName},

${isPasswordReset
            ? 'Your Momo HRMS account password has been reset by an administrator.'
            : isWebAdminOrHr
                ? 'Your Momo HRMS administrative account has been provisioned.'
                : 'Your Momo HRMS employee account has been created.'}

Account Details:
------------------------------------------
Role:                   ${roleName}
Official Email (Login): ${officialEmail}
Username:               ${username}
${temporaryPassword ? `Temporary Password:     ${temporaryPassword}` : ''}
${isWebAdminOrHr ? `Web Portal:             ${loginUrl}` : 'Access Method:          Momo HRMS Mobile Application'}
------------------------------------------

Important:
You will be prompted to set your own secure permanent password upon your first login.

${isWebAdminOrHr
            ? `You can access the Web Management Portal at: ${loginUrl}`
            : 'Please download and open the Momo HRMS Mobile App to check in.'}

Regards,
Momo HRMS Team
`;
        const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; margin: 0; padding: 24px; color: #1e293b; }
    .card { background-color: #ffffff; max-width: 580px; margin: 0 auto; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); padding: 32px; border: 1px solid #e2e8f0; }
    .header { text-align: center; border-bottom: 2px solid #f1f5f9; padding-bottom: 20px; margin-bottom: 24px; }
    .title { font-size: 22px; font-weight: 700; color: #0f172a; margin: 0 0 8px 0; }
    .subtitle { font-size: 14px; color: #64748b; margin: 0; }
    .badge { display: inline-block; font-size: 12px; font-weight: 600; padding: 4px 12px; border-radius: 9999px; margin-top: 12px; }
    .badge-web { background-color: #ede9fe; color: #6d28d9; }
    .badge-mobile { background-color: #dbeafe; color: #1d4ed8; }
    .creds-box { background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 20px; margin: 24px 0; }
    .cred-row { display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 14px; }
    .cred-row:last-child { margin-bottom: 0; }
    .cred-label { font-weight: 600; color: #475569; }
    .cred-value { font-family: monospace; font-size: 15px; color: #0f172a; font-weight: 700; background: #e2e8f0; padding: 2px 8px; border-radius: 4px; }
    .btn { display: inline-block; background-color: #2563eb; color: #ffffff !important; text-decoration: none; font-weight: 600; padding: 12px 24px; border-radius: 6px; margin: 16px 0; }
    .alert-box { background-color: #fffbeb; border-left: 4px solid #f59e0b; padding: 12px 16px; font-size: 13px; color: #92400e; margin: 20px 0; border-radius: 0 4px 4px 0; }
    .mobile-notice { background-color: #f0fdf4; border-left: 4px solid #10b981; padding: 14px 16px; font-size: 13px; color: #065f46; margin: 20px 0; border-radius: 0 4px 4px 0; }
    .step-box { background-color: #f8fafc; border-radius: 8px; padding: 16px; margin: 16px 0; border: 1px dashed #cbd5e1; }
    .step-box ol { margin: 8px 0 0 20px; padding: 0; }
    .step-box li { margin-bottom: 6px; font-size: 13px; color: #334155; }
    .footer { font-size: 12px; color: #94a3b8; margin-top: 24px; text-align: center; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h1 class="title">${isPasswordReset
            ? 'Password Reset Notice'
            : isWebAdminOrHr
                ? 'Welcome to Momo HRMS Admin & HR Portal'
                : 'Welcome to Momo HRMS'}</h1>
      <div class="subtitle">Smart Employee Attendance & Management System</div>
      <div class="badge ${isWebAdminOrHr ? 'badge-web' : 'badge-mobile'}">
        ${isWebAdminOrHr ? '💻 Web Management Portal Access' : '📱 Mobile App Access Only'}
      </div>
    </div>
    <p>Hello <strong>${employeeName}</strong>,</p>
    <p>${isPasswordReset
            ? 'Your account password has been reset by an administrator.'
            : isWebAdminOrHr
                ? 'Your administrative account has been provisioned. You can sign in to the Web Management Portal using the credentials below:'
                : 'Your employee account has been provisioned for the Momo HRMS Mobile Application. Please use the credentials below to log in:'}</p>

    <div class="creds-box">
      <div class="cred-row">
        <span class="cred-label">Role:</span>
        <span class="cred-value">${roleName}</span>
      </div>
      <div class="cred-row">
        <span class="cred-label">Login Email:</span>
        <span class="cred-value">${officialEmail}</span>
      </div>
      <div class="cred-row">
        <span class="cred-label">Username:</span>
        <span class="cred-value">${username}</span>
      </div>
      ${temporaryPassword
            ? `<div class="cred-row">
               <span class="cred-label">Temporary Password:</span>
               <span class="cred-value">${temporaryPassword}</span>
             </div>`
            : ''}
    </div>

    <div class="alert-box">
      <strong>Important:</strong> You must change this temporary password upon your first sign in before accessing the system.
    </div>

    ${isWebAdminOrHr
            ? `<div style="text-align: center;">
             <a href="${loginUrl}" class="btn" target="_blank">Sign In to Admin & HR Portal</a>
           </div>`
            : `<div class="mobile-notice">
             <strong>Platform Policy:</strong> Web browser access is reserved for Admin & HR staff. Standard employees must log in exclusively via the <strong>Momo HRMS Mobile App</strong> (Android / iOS).
           </div>
           <div class="step-box">
             <strong>How to Sign In:</strong>
             <ol>
               <li>Open the Momo HRMS App on your mobile smartphone.</li>
               <li>Sign in with your Login Email or Username and the Temporary Password above.</li>
               <li>You will immediately be guided to set your permanent secure password.</li>
             </ol>
           </div>`}

    <div class="footer">
      This is an automated system email from Momo HRMS. Please do not reply directly to this email.
    </div>
  </div>
</body>
</html>
`;
        if (this.brevoApiKey) {
            try {
                const result = await this.sendViaBrevo(toEmail, subject, htmlContent, textContent, employeeName);
                this.logger.log(`Credentials email dispatched via Brevo HTTP API to ${toEmail} (messageId: ${result.messageId || 'ok'})`);
                return {
                    delivered: true,
                    mode: 'brevo',
                    message: `Credentials email dispatched via Brevo to ${toEmail}`,
                    deliveredTo: toEmail,
                };
            }
            catch (err) {
                this.logger.error(`Brevo HTTP delivery failed to ${toEmail}: ${err.message}`);
            }
        }
        if (this.resendApiKey) {
            try {
                const result = await this.sendViaResend(toEmail, subject, htmlContent, textContent);
                this.logger.log(`Credentials email dispatched via Resend HTTP API to ${toEmail} (id: ${result.id || 'ok'})`);
                return {
                    delivered: true,
                    mode: 'resend',
                    message: `Credentials email dispatched via Resend to ${toEmail}`,
                    deliveredTo: toEmail,
                };
            }
            catch (err) {
                this.logger.error(`Resend HTTP delivery failed to ${toEmail}: ${err.message}`);
            }
        }
        if (this.transporter) {
            try {
                const info = await this.transporter.sendMail({
                    from: this.fromAddress,
                    to: toEmail,
                    subject,
                    text: textContent,
                    html: htmlContent,
                });
                this.logger.log(`Credentials email sent via SMTP to ${toEmail} (messageId: ${info.messageId})`);
                return {
                    delivered: true,
                    mode: 'smtp',
                    message: `Credentials email dispatched via SMTP to ${toEmail}`,
                    deliveredTo: toEmail,
                };
            }
            catch (err) {
                this.logger.error(`SMTP delivery failed to ${toEmail}: ${err.message}`);
                return {
                    delivered: false,
                    mode: 'failed',
                    message: `Email delivery failed via SMTP (${err.message}). (Note: Render Free tier blocks outbound SMTP ports 25, 465, 587. Configure BREVO_API_KEY for free HTTPS email delivery)`,
                    deliveredTo: toEmail,
                };
            }
        }
        this.logger.log(`No active email provider configured. Simulating credential dispatch to ${toEmail}`);
        console.log('\n================== [CREDENTIAL EMAIL DISPATCH] ==================');
        console.log(`To:                 ${toEmail}`);
        console.log(`Subject:            ${subject}`);
        console.log(`Role:               ${roleName}`);
        console.log(`Official Email:     ${officialEmail}`);
        console.log(`Username:           ${username}`);
        if (temporaryPassword) {
            console.log(`Temporary Password: ${temporaryPassword}`);
        }
        console.log('=================================================================\n');
        return {
            delivered: true,
            mode: 'console',
            message: `Credentials printed to server console for ${toEmail} (Email service unconfigured)`,
            deliveredTo: toEmail,
        };
    }
    async sendTestEmail(toEmail) {
        const recipient = toEmail || this.fromEmail || this.user;
        if (this.brevoApiKey) {
            try {
                const res = await this.sendViaBrevo(recipient, 'Momo HRMS - Brevo Email Test Verification', '<h2>Momo HRMS Email Service</h2><p>Brevo HTTP API is working successfully on port 443 HTTPS!</p>', 'Brevo HTTP API is working successfully!');
                return {
                    success: true,
                    provider: 'brevo',
                    recipient,
                    data: res,
                    message: `Test email sent successfully via Brevo to ${recipient}`,
                };
            }
            catch (err) {
                return {
                    success: false,
                    provider: 'brevo',
                    error: err.message,
                };
            }
        }
        if (this.resendApiKey) {
            try {
                const res = await this.sendViaResend(recipient, 'Momo HRMS - Resend Email Test Verification', '<h2>Momo HRMS Email Service</h2><p>Resend HTTP API is working successfully on port 443 HTTPS!</p>', 'Resend HTTP API is working successfully!');
                return {
                    success: true,
                    provider: 'resend',
                    recipient,
                    data: res,
                    message: `Test email sent successfully via Resend to ${recipient}`,
                };
            }
            catch (err) {
                return {
                    success: false,
                    provider: 'resend',
                    error: err.message,
                };
            }
        }
        if (!this.transporter) {
            return {
                success: false,
                error: 'No email service (Brevo, Resend, or SMTP) configured in environment variables.',
                configured: false,
            };
        }
        try {
            const info = await this.transporter.sendMail({
                from: this.fromAddress,
                to: recipient,
                subject: 'Momo HRMS - SMTP Test Verification',
                text: 'This is a test email verifying that SMTP email delivery is operating correctly.',
                html: `
          <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
            <h2 style="color: #2563eb;">Momo HRMS SMTP Test</h2>
            <p>Your SMTP credentials configured in environment variables are working!</p>
            <ul>
              <li><strong>Host:</strong> ${this.host}:${this.port}</li>
              <li><strong>From:</strong> ${this.fromAddress}</li>
              <li><strong>Recipient:</strong> ${recipient}</li>
              <li><strong>Timestamp:</strong> ${new Date().toISOString()}</li>
            </ul>
          </div>
        `,
            });
            return {
                success: true,
                messageId: info.messageId,
                recipient,
                configured: true,
                message: `Test email sent successfully via SMTP to ${recipient}`,
            };
        }
        catch (err) {
            this.logger.error(`Failed to send test email: ${err.message}`);
            return {
                success: false,
                error: err.message,
                recipient,
                configured: true,
            };
        }
    }
};
exports.EmailService = EmailService;
exports.EmailService = EmailService = EmailService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], EmailService);
//# sourceMappingURL=email.service.js.map