import * as dns from "dns";
try {
  dns.setDefaultResultOrder("ipv4first");
} catch {}
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

export interface SendCredentialEmailOptions {
  toEmail: string;
  employeeName: string;
  officialEmail: string;
  username: string;
  temporaryPassword?: string;
  isPasswordReset?: boolean;
  roleName?: string;
  hrPortalEmail?: string;
  hrPortalPassword?: string;
}

export interface CredentialDeliveryResult {
  delivered: boolean;
  mode: 'brevo' | 'resend' | 'smtp' | 'console' | 'failed';
  message: string;
  deliveredTo: string;
}

@Injectable()
export class EmailService implements OnModuleInit {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter | null = null;
  public readonly isConfigured: boolean;

  private readonly brevoApiKey: string;
  private readonly resendApiKey: string;
  private readonly host: string;
  private readonly port: number;
  private readonly secure: boolean;
  private readonly user: string;
  private readonly pass: string;
  private readonly fromName: string;
  private readonly fromEmail: string;
  private readonly frontendUrl: string;

  constructor(private readonly config: ConfigService) {
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
      const transportOptions: any = {
        host: this.host,
        port: this.port,
        secure: isPort465 ? true : this.secure,
        auth: {
          user: this.user,
          pass: this.pass,
        },
        family: 4, // CRITICAL: Force IPv4 to prevent ENETUNREACH on Render/cloud containers
        connectionTimeout: 20000,
        greetingTimeout: 20000,
        socketTimeout: 30000,
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
    } else if (this.resendApiKey) {
      this.logger.log('Email delivery configured via Resend HTTP API (Port 443 HTTPS).');
    } else if (this.transporter) {
      this.logger.log(`SMTP transport initialized for ${this.host}:${this.port} (${this.user}) with IPv4 enforced.`);
      // Non-blocking verification check
      this.transporter
        .verify()
        .then(() => {
          this.logger.log(`SMTP transport connection verified with ${this.host}:${this.port}`);
        })
        .catch((err: any) => {
          this.logger.warn(`SMTP transport verification note: ${err.message}. (Note: Render Free tier blocks outbound SMTP ports 25, 465, 587)`);
        });
    } else {
      this.logger.warn('Email service is not configured with SMTP or API keys; credentials will be logged to console.');
    }
  }

  get fromAddress(): string {
    return `"${this.fromName}" <${this.fromEmail}>`;
  }

  /**
   * Dispatches email via Brevo HTTPS REST API (Port 443)
   */
  private async sendViaBrevo(
    toEmail: string,
    subject: string,
    htmlContent: string,
    textContent: string,
    recipientName?: string
  ): Promise<any> {
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

  /**
   * Dispatches email via Resend HTTPS REST API (Port 443)
   */
  private async sendViaResend(
    toEmail: string,
    subject: string,
    htmlContent: string,
    textContent: string
  ): Promise<any> {
    const url = 'https://api.resend.com/emails';
    const from =
      this.fromEmail && this.fromEmail.includes('@') && !this.fromEmail.endsWith('@gmail.com')
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

  /**
   * Send account credentials or password reset email.
   * Prioritizes HTTP APIs (Brevo / Resend over HTTPS port 443) then falls back to direct SMTP.
   * Guarantees non-throwing behavior so employee creation is never blocked.
   */
  async sendCredentialEmail(options: SendCredentialEmailOptions): Promise<CredentialDeliveryResult> {
    const {
      toEmail,
      employeeName,
      officialEmail,
      username,
      temporaryPassword,
      isPasswordReset = false,
      roleName = 'EMPLOYEE',
    } = options;

    const isWebAdminOrHr =
      roleName.includes('HR') ||
      roleName.includes('ADMIN') ||
      roleName === 'SUPER_ADMIN' ||
      roleName === 'HR_ADMIN';

    const loginUrl = `${this.frontendUrl}/login`;

    const hasDualHr = Boolean(options.hrPortalEmail && options.hrPortalPassword);

    const subject = isPasswordReset
      ? 'Your Momo HRMS Account Password Has Been Reset'
      : hasDualHr
      ? 'Welcome to Momo HRMS - Your HR Web & Mobile Attendance Credentials'
      : isWebAdminOrHr
      ? 'Welcome to Momo HRMS - Your Admin & HR Portal Credentials'
      : 'Welcome to Momo HRMS - Your Employee Mobile App Credentials';

    const textContent = hasDualHr
      ? `
Hello ${employeeName},

Your Momo HRMS Human Resources accounts have been provisioned.

1. HR Management Web Portal (Desktop / Browser)
------------------------------------------
Portal URL:             ${loginUrl}
Role:                   HR_ADMIN
Login Email:            ${options.hrPortalEmail}
Temporary Password:     ${options.hrPortalPassword}
------------------------------------------

2. Mobile Attendance App (Daily Check-in & Punch Logs)
------------------------------------------
Access Method:          Momo HRMS Mobile Application
Role:                   EMPLOYEE
Login Email:            ${officialEmail}
Username:               ${username}
${temporaryPassword ? `Temporary Password:     ${temporaryPassword}` : ''}
------------------------------------------

Important:
You will be prompted to set your own secure permanent password upon your first login.

Regards,
Momo HRMS Team
`
      : `
Hello ${employeeName},

${
  isPasswordReset
    ? 'Your Momo HRMS account password has been reset by an administrator.'
    : isWebAdminOrHr
    ? 'Your Momo HRMS administrative account has been provisioned.'
    : 'Your Momo HRMS employee account has been created.'
}

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

${
  isWebAdminOrHr
    ? `You can access the Web Management Portal at: ${loginUrl}`
    : 'Please download and open the Momo HRMS Mobile App to check in.'
}

Regards,
Momo HRMS Team
`;

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Momo HRMS Credentials</title>
</head>
<body style="margin: 0; padding: 24px 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f1f5f9; padding: 20px 0;">
    <tr>
      <td align="center">
        <!-- Main Container -->
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);">
          
          <!-- Header Banner -->
          <tr>
            <td style="background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%); padding: 32px 24px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0 0 6px 0; font-size: 24px; font-weight: 800; letter-spacing: -0.02em;">Momo HRMS</h1>
              <p style="color: #bfdbfe; margin: 0 0 12px 0; font-size: 14px; font-weight: 500;">Smart Employee Attendance & Workforce Management</p>
              <div style="display: inline-block; background-color: rgba(255, 255, 255, 0.2); color: #ffffff; padding: 4px 14px; border-radius: 9999px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">
                ${hasDualHr ? '✨ HR Management & Attendance Accounts' : isWebAdminOrHr ? '💻 Web Management Portal' : '📱 Mobile App Access'}
              </div>
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td style="padding: 32px 28px;">
              <h2 style="color: #0f172a; margin: 0 0 12px 0; font-size: 18px; font-weight: 700;">
                ${isPasswordReset ? 'Password Reset Notice' : `Welcome, ${employeeName}!`}
              </h2>
              <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 20px 0;">
                ${isPasswordReset 
                  ? 'Your account password has been reset by an administrator. Please find your new login credentials below:' 
                  : hasDualHr
                  ? 'Your HR Specialist profile has been created with access to both the HR Web Management Portal and Mobile Attendance App:'
                  : isWebAdminOrHr 
                  ? 'Your official administrative account has been provisioned. You can sign in to the Web Management Portal using the credentials below:' 
                  : 'Your official employee account has been created for the Momo HRMS Mobile Application. Please use the credentials below to log in:'}
              </p>

              ${hasDualHr ? `
              <!-- CARD 1: HR WEB PORTAL -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #faf5ff; border: 2px solid #9333ea; border-radius: 10px; margin: 16px 0; overflow: hidden;">
                <tr>
                  <td style="background-color: #f3e8ff; padding: 12px 20px; border-bottom: 1px solid #d8b4fe;">
                    <strong style="color: #7e22ce; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em;">💻 1. HR Web Management Portal (Desktop)</strong>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 16px 20px;">
                    <table width="100%" cellpadding="6" cellspacing="0" border="0">
                      <tr>
                        <td width="35%" style="color: #64748b; font-size: 13px; font-weight: 600; padding: 6px 0;">Role:</td>
                        <td width="65%" style="color: #7e22ce; font-size: 14px; font-weight: 700; padding: 6px 0;">HR_ADMIN</td>
                      </tr>
                      <tr>
                        <td style="color: #64748b; font-size: 13px; font-weight: 600; padding: 6px 0;">Web Login Email:</td>
                        <td style="padding: 6px 0;">
                          <span style="font-family: monospace; font-size: 14px; font-weight: 700; color: #7e22ce; background-color: #f3e8ff; padding: 4px 10px; border-radius: 4px; display: inline-block;">${options.hrPortalEmail}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="color: #b45309; font-size: 13px; font-weight: 700; padding: 10px 0 6px 0; border-top: 1px dashed #e9d5ff;">Temp Password:</td>
                        <td style="padding: 10px 0 6px 0; border-top: 1px dashed #e9d5ff;">
                          <span style="font-family: monospace; font-size: 16px; font-weight: 800; color: #b45309; background-color: #fef3c7; border: 1.5px solid #f59e0b; padding: 5px 12px; border-radius: 6px; display: inline-block;">${options.hrPortalPassword}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="color: #64748b; font-size: 13px; font-weight: 600; padding: 6px 0;">Web Portal URL:</td>
                        <td style="padding: 6px 0;">
                          <a href="${loginUrl}" target="_blank" style="color: #7e22ce; font-weight: 700; text-decoration: underline;">${loginUrl}</a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- CARD 2: MOBILE ATTENDANCE APP -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f0fdf4; border: 2px solid #16a34a; border-radius: 10px; margin: 16px 0; overflow: hidden;">
                <tr>
                  <td style="background-color: #dcfce7; padding: 12px 20px; border-bottom: 1px solid #bbf7d0;">
                    <strong style="color: #15803d; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em;">📱 2. Employee Mobile Attendance App</strong>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 16px 20px;">
                    <table width="100%" cellpadding="6" cellspacing="0" border="0">
                      <tr>
                        <td width="35%" style="color: #64748b; font-size: 13px; font-weight: 600; padding: 6px 0;">Role:</td>
                        <td width="65%" style="color: #15803d; font-size: 14px; font-weight: 700; padding: 6px 0;">EMPLOYEE (Human Resources)</td>
                      </tr>
                      <tr>
                        <td style="color: #64748b; font-size: 13px; font-weight: 600; padding: 6px 0;">App Login Email:</td>
                        <td style="padding: 6px 0;">
                          <span style="font-family: monospace; font-size: 14px; font-weight: 700; color: #15803d; background-color: #dcfce7; padding: 4px 10px; border-radius: 4px; display: inline-block;">${officialEmail}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="color: #64748b; font-size: 13px; font-weight: 600; padding: 6px 0;">Username / Code:</td>
                        <td style="color: #0f172a; font-size: 14px; font-family: monospace; font-weight: 700; padding: 6px 0;">${username}</td>
                      </tr>
                      ${temporaryPassword ? `
                      <tr>
                        <td style="color: #b45309; font-size: 13px; font-weight: 700; padding: 10px 0 6px 0; border-top: 1px dashed #bbf7d0;">Temp Password:</td>
                        <td style="padding: 10px 0 6px 0; border-top: 1px dashed #bbf7d0;">
                          <span style="font-family: monospace; font-size: 16px; font-weight: 800; color: #b45309; background-color: #fef3c7; border: 1.5px solid #f59e0b; padding: 5px 12px; border-radius: 6px; display: inline-block;">${temporaryPassword}</span>
                        </td>
                      </tr>
                      ` : ''}
                    </table>
                  </td>
                </tr>
              </table>
              ` : `
              <!-- PROMINENT CREDENTIALS CARD -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f8fafc; border: 2px solid #2563eb; border-radius: 10px; margin: 20px 0; overflow: hidden;">
                <tr>
                  <td style="background-color: #eff6ff; padding: 12px 20px; border-bottom: 1px solid #bfdbfe;">
                    <strong style="color: #1e40af; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em;">🔑 Official Login Credentials</strong>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 16px 20px;">
                    <table width="100%" cellpadding="6" cellspacing="0" border="0">
                      <tr>
                        <td width="35%" style="color: #64748b; font-size: 13px; font-weight: 600; padding: 6px 0;">Role / Access:</td>
                        <td width="65%" style="color: #0f172a; font-size: 14px; font-weight: 700; padding: 6px 0;">${roleName}</td>
                      </tr>
                      <tr>
                        <td style="color: #64748b; font-size: 13px; font-weight: 600; padding: 6px 0;">Login Email (ID):</td>
                        <td style="padding: 6px 0;">
                          <span style="font-family: 'Courier New', Courier, monospace; font-size: 15px; font-weight: 700; color: #1d4ed8; background-color: #e0e7ff; padding: 4px 10px; border-radius: 4px; word-break: break-all; display: inline-block;">${officialEmail}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="color: #64748b; font-size: 13px; font-weight: 600; padding: 6px 0;">Username:</td>
                        <td style="color: #0f172a; font-size: 14px; font-family: monospace; font-weight: 700; padding: 6px 0;">${username}</td>
                      </tr>
                      ${temporaryPassword ? `
                      <tr>
                        <td style="color: #b45309; font-size: 13px; font-weight: 700; padding: 10px 0 6px 0; border-top: 1px dashed #cbd5e1;">Temporary Password:</td>
                        <td style="padding: 10px 0 6px 0; border-top: 1px dashed #cbd5e1;">
                          <span style="font-family: 'Courier New', Courier, monospace; font-size: 18px; font-weight: 800; color: #b45309; background-color: #fef3c7; border: 1.5px solid #f59e0b; padding: 6px 14px; border-radius: 6px; letter-spacing: 0.06em; display: inline-block;">${temporaryPassword}</span>
                        </td>
                      </tr>
                      ` : ''}
                    </table>
                  </td>
                </tr>
              </table>
              `}

              <!-- Security Alert Box -->
              <table width="100%" cellpadding="12" cellspacing="0" border="0" style="background-color: #fffbeb; border-left: 4px solid #f59e0b; border-radius: 0 6px 6px 0; margin-bottom: 24px;">
                <tr>
                  <td style="color: #92400e; font-size: 13px; line-height: 1.5;">
                    <strong>⚠️ Security Notice:</strong><br>
                    You must change this temporary password upon your first sign in before accessing the system. Do not share your login credentials with anyone.
                  </td>
                </tr>
              </table>

              <!-- Action Section -->
              ${isWebAdminOrHr ? `
                <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 24px 0 16px 0; text-align: center;">
                  <tr>
                    <td align="center">
                      <a href="${loginUrl}" target="_blank" style="display: inline-block; background-color: #2563eb; color: #ffffff !important; text-decoration: none; font-size: 15px; font-weight: 700; padding: 14px 28px; border-radius: 8px; box-shadow: 0 2px 4px rgba(37, 99, 235, 0.2);">
                        Sign In to Web Management Portal &rarr;
                      </a>
                    </td>
                  </tr>
                  <tr>
                    <td align="center" style="padding-top: 12px; color: #94a3b8; font-size: 12px;">
                      Portal URL: <a href="${loginUrl}" style="color: #2563eb; text-decoration: underline;">${loginUrl}</a>
                    </td>
                  </tr>
                </table>
              ` : `
                <!-- Mobile App Notice -->
                <table width="100%" cellpadding="14" cellspacing="0" border="0" style="background-color: #f0fdf4; border-left: 4px solid #10b981; border-radius: 0 6px 6px 0; margin-bottom: 20px;">
                  <tr>
                    <td style="color: #065f46; font-size: 13px; line-height: 1.5;">
                      <strong>📱 Mobile Application Sign-in:</strong><br>
                      Browser login is reserved for Admin & HR management. All employees mark daily attendance, view punch logs, and manage profile exclusively via the <strong>Momo HRMS Mobile App</strong> (Android / iOS).
                    </td>
                  </tr>
                </table>

                <table width="100%" cellpadding="14" cellspacing="0" border="0" style="background-color: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 8px;">
                  <tr>
                    <td>
                      <strong style="color: #334155; font-size: 13px;">How to Sign In:</strong>
                      <ol style="margin: 8px 0 0 18px; padding: 0; color: #475569; font-size: 13px; line-height: 1.6;">
                        <li>Open the <strong>Momo HRMS App</strong> on your smartphone.</li>
                        <li>Enter your <strong>Login Email</strong> and the <strong>Temporary Password</strong> above.</li>
                        <li>Follow the prompt to set your permanent, secure password.</li>
                      </ol>
                    </td>
                  </tr>
                </table>
              `}

              <!-- Footer -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top: 32px; border-top: 1px solid #f1f5f9; padding-top: 20px;">
                <tr>
                  <td align="center" style="color: #94a3b8; font-size: 12px; line-height: 1.5;">
                    This is an automated system email from <strong>Momo HRMS</strong>.<br>
                    Please do not reply directly to this email. For assistance, contact your system administrator.
                  </td>
                </tr>
              </table>

            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

    // 1. Try Brevo HTTP API (Port 443 HTTPS - Unblocked on Render Free Tier)
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
      } catch (err: any) {
        this.logger.error(`Brevo HTTP delivery failed to ${toEmail}: ${err.message}`);
      }
    }

    // 2. Try Resend HTTP API (Port 443 HTTPS - Unblocked on Render Free Tier)
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
      } catch (err: any) {
        this.logger.error(`Resend HTTP delivery failed to ${toEmail}: ${err.message}`);
      }
    }

    // 3. Try SMTP Transport (Port 587/465) with IPv4 enforcement
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
      } catch (err: any) {
        this.logger.error(`SMTP delivery failed to ${toEmail}: ${err.message}`);
        return {
          delivered: false,
          mode: 'failed',
          message: `Email delivery failed via SMTP (${err.message}). (Note: Render Free tier blocks outbound SMTP ports 25, 465, 587. Configure BREVO_API_KEY for free HTTPS email delivery)`,
          deliveredTo: toEmail,
        };
      }
    }

    // 4. Fallback / Console Simulation Mode
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

  /**
   * Diagnostic test method
   */
  async sendTestEmail(toEmail?: string) {
    const recipient = toEmail || this.fromEmail || this.user;

    if (this.brevoApiKey) {
      try {
        const res = await this.sendViaBrevo(
          recipient,
          'Momo HRMS - Brevo Email Test Verification',
          '<h2>Momo HRMS Email Service</h2><p>Brevo HTTP API is working successfully on port 443 HTTPS!</p>',
          'Brevo HTTP API is working successfully!'
        );
        return {
          success: true,
          provider: 'brevo',
          recipient,
          data: res,
          message: `Test email sent successfully via Brevo to ${recipient}`,
        };
      } catch (err: any) {
        return {
          success: false,
          provider: 'brevo',
          error: err.message,
        };
      }
    }

    if (this.resendApiKey) {
      try {
        const res = await this.sendViaResend(
          recipient,
          'Momo HRMS - Resend Email Test Verification',
          '<h2>Momo HRMS Email Service</h2><p>Resend HTTP API is working successfully on port 443 HTTPS!</p>',
          'Resend HTTP API is working successfully!'
        );
        return {
          success: true,
          provider: 'resend',
          recipient,
          data: res,
          message: `Test email sent successfully via Resend to ${recipient}`,
        };
      } catch (err: any) {
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
    } catch (err: any) {
      this.logger.error(`Failed to send test email: ${err.message}`);
      return {
        success: false,
        error: err.message,
        recipient,
        configured: true,
      };
    }
  }
}
