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
const common_1 = require("@nestjs/common");
const nodemailer = require("nodemailer");
let EmailService = EmailService_1 = class EmailService {
    constructor() {
        this.logger = new common_1.Logger(EmailService_1.name);
        this.transporter = null;
        this.host = process.env.SMTP_HOST || 'smtp.gmail.com';
        this.port = parseInt(process.env.SMTP_PORT || '587', 10);
        this.secure = (process.env.SMTP_SECURE || 'false').toLowerCase() === 'true';
        this.user = process.env.SMTP_USER || '';
        this.pass = (process.env.SMTP_PASSWORD || process.env.SMTP_PASS || '').replace(/\s+/g, '');
        this.fromName = process.env.SMTP_FROM_NAME || 'Momo HRMS';
        this.fromEmail = process.env.SMTP_FROM_EMAIL || this.user;
        this.frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        this.isConfigured = Boolean(this.host && this.port && this.user && this.pass);
        if (this.isConfigured) {
            this.transporter = nodemailer.createTransport({
                host: this.host,
                port: this.port,
                secure: this.secure,
                auth: {
                    user: this.user,
                    pass: this.pass,
                },
            });
        }
    }
    async onModuleInit() {
        if (this.isConfigured && this.transporter) {
            try {
                await this.transporter.verify();
                this.logger.log(`SMTP transport initialized & verified with ${this.host}:${this.port} (${this.user})`);
            }
            catch (err) {
                this.logger.warn(`SMTP transport verification failed: ${err.message}`);
            }
        }
        else {
            this.logger.warn('SMTP not fully configured; email sending will be logged to console.');
        }
    }
    get fromAddress() {
        return `"${this.fromName}" <${this.fromEmail}>`;
    }
    async sendSpecialWorkingHoursEmail(options) {
        const { hrEmail, employeeName, employeeId, employeeEmail, attendanceDate, additionalHours, reason, exceptionId, } = options;
        const portalUrl = `${this.frontendUrl}/notifications`;
        const subject = `[Momo HRMS] Special Working Hours Request: ${employeeName} (+${additionalHours}h on ${attendanceDate})`;
        const textContent = `
Momo HRMS - Special Working Hours Request
==========================================

Employee:        ${employeeName} (${employeeId})
Email:           ${employeeEmail || 'N/A'}
Applicable Date: ${attendanceDate}
Requested Time:  +${additionalHours} hours
HR Recipient:    ${hrEmail}

Reason / Genuine Situation:
${reason}

To review and approve/reject this request, please sign in to the HR Web Portal:
${portalUrl}

(Exception ID: ${exceptionId})
`;
        const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; margin: 0; padding: 24px; color: #1e293b; }
    .card { background-color: #ffffff; max-width: 600px; margin: 0 auto; border-radius: 12px; border: 1px solid #e2e8f0; padding: 32px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
    .header { margin-bottom: 24px; border-bottom: 1px solid #e2e8f0; padding-bottom: 16px; }
    .logo { font-size: 18px; font-weight: 800; color: #2563eb; letter-spacing: -0.5px; }
    .title { font-size: 20px; font-weight: 700; color: #0f172a; margin: 8px 0 4px 0; }
    .badge { display: inline-block; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 700; background-color: #eff6ff; color: #2563eb; border: 1px solid #bfdbfe; }
    .info-box { background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0; }
    .info-row { display: flex; justify-content: space-between; margin-bottom: 12px; font-size: 14px; }
    .info-row:last-child { margin-bottom: 0; }
    .info-label { font-weight: 600; color: #64748b; }
    .info-val { font-weight: 700; color: #0f172a; }
    .hours-highlight { color: #2563eb; font-size: 16px; }
    .reason-box { background-color: #fefce8; border-left: 4px solid #eab308; border-radius: 4px; padding: 14px 18px; margin: 20px 0; font-size: 14px; color: #854d0e; }
    .btn { display: inline-block; background-color: #2563eb; color: #ffffff !important; text-decoration: none; font-weight: 600; padding: 12px 28px; border-radius: 6px; margin: 20px 0; }
    .footer { font-size: 12px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 16px; margin-top: 24px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div class="logo">Momo HRMS</div>
      <div class="title">Special Working Hours Request</div>
      <span class="badge">Action Required by HR</span>
    </div>

    <p>An employee has submitted a special working hours request for HR review and approval.</p>

    <div class="info-box">
      <div class="info-row">
        <span class="info-label">Employee:</span>
        <span class="info-val">${employeeName} (${employeeId})</span>
      </div>
      <div class="info-row">
        <span class="info-label">Applicable Date:</span>
        <span class="info-val">${attendanceDate}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Additional Hours:</span>
        <span class="info-val hours-highlight">+${additionalHours} hours</span>
      </div>
      <div class="info-row">
        <span class="info-label">Assigned HR:</span>
        <span class="info-val">${hrEmail}</span>
      </div>
    </div>

    <div class="reason-box">
      <strong>Reason / Genuine Situation:</strong><br/>
      ${reason}
    </div>

    <div style="text-align: center;">
      <a href="${portalUrl}" class="btn" target="_blank">Review Request in Web Portal</a>
    </div>

    <div class="footer">
      This is an automated notification from Momo HRMS. Login to the portal to approve or reject this request.
    </div>
  </div>
</body>
</html>
`;
        const recipients = [];
        if (hrEmail && hrEmail.includes('@')) {
            recipients.push(hrEmail);
        }
        if (this.user && !recipients.includes(this.user)) {
            recipients.push(this.user);
        }
        if (!this.isConfigured || !this.transporter) {
            this.logger.log(`[SIMULATED EMAIL] To: ${recipients.join(', ')} | Subject: ${subject}`);
            return false;
        }
        try {
            const info = await this.transporter.sendMail({
                from: this.fromAddress,
                to: recipients.join(', '),
                subject,
                text: textContent,
                html: htmlContent,
            });
            this.logger.log(`Special working hours request email sent to [${recipients.join(', ')}]: ${info.messageId}`);
            return true;
        }
        catch (err) {
            this.logger.error(`Failed to send email to [${recipients.join(', ')}]: ${err.message}`);
            if (this.user && recipients.length > 1) {
                try {
                    const fallbackInfo = await this.transporter.sendMail({
                        from: this.fromAddress,
                        to: this.user,
                        subject,
                        text: textContent,
                        html: htmlContent,
                    });
                    this.logger.log(`Fallback email delivered directly to SMTP_USER (${this.user}): ${fallbackInfo.messageId}`);
                    return true;
                }
                catch (fallbackErr) {
                    this.logger.error(`Fallback email failed: ${fallbackErr.message}`);
                }
            }
            return false;
        }
    }
    async sendDecisionEmail(options) {
        const { employeeEmail, employeeName, status, attendanceDate, additionalHours, comment } = options;
        if (!employeeEmail || !employeeEmail.includes('@')) {
            return false;
        }
        const isApproved = status === 'APPROVED';
        const subject = `[Momo HRMS] Special Working Hours Request ${isApproved ? 'Approved' : 'Rejected'} (${attendanceDate})`;
        const textContent = `
Hello ${employeeName},

Your request for special working hours on ${attendanceDate} has been ${status} by HR.
${additionalHours ? `Hours Credited: +${additionalHours} hours\n` : ''}
${comment ? `HR Note: ${comment}\n` : ''}

Best regards,
Momo HRMS Team
`;
        if (!this.isConfigured || !this.transporter) {
            return false;
        }
        try {
            await this.transporter.sendMail({
                from: this.fromAddress,
                to: employeeEmail,
                subject,
                text: textContent,
            });
            this.logger.log(`Decision email sent to employee (${employeeEmail})`);
            return true;
        }
        catch (err) {
            this.logger.warn(`Could not send decision email to employee: ${err.message}`);
            return false;
        }
    }
};
exports.EmailService = EmailService;
exports.EmailService = EmailService = EmailService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], EmailService);
//# sourceMappingURL=email.service.js.map