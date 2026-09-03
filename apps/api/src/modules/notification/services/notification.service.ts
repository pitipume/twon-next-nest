import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);
  private readonly resend: Resend;
  private readonly fromEmail: string;

  constructor(private readonly config: ConfigService) {
    this.resend = new Resend(this.config.get('RESEND_API_KEY') ?? 'disabled');
    this.fromEmail = this.config.get('EMAIL_FROM', 'noreply@twon-platform.com');
  }

  async sendOtpEmail(email: string, displayName: string, otp: string): Promise<void> {
    const apiKey = this.config.get('RESEND_API_KEY');
    if (!apiKey || apiKey === 'disabled') {
      this.logger.warn('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      this.logger.warn(`  DEV OTP for ${email}: ${otp}`);
      this.logger.warn('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      return;
    }

    const { error } = await this.resend.emails.send({
      from: this.fromEmail,
      to: email,
      subject: 'Your Twon verification code',
      html: this.buildOtpEmailHtml(displayName, otp),
    });
    if (error) {
      this.logger.warn(`Failed to send OTP email to ${email}: ${JSON.stringify(error)}`);
    } else {
      this.logger.log(`OTP email sent to ${email}`);
    }
  }

  async sendForgotPasswordEmail(email: string, otp: string): Promise<void> {
    const apiKey = this.config.get('RESEND_API_KEY');
    if (!apiKey || apiKey === 'disabled') {
      this.logger.warn('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      this.logger.warn(`  DEV RESET OTP for ${email}: ${otp}`);
      this.logger.warn('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      return;
    }

    const { error } = await this.resend.emails.send({
      from: this.fromEmail,
      to: email,
      subject: 'Reset your Twon password',
      html: this.buildForgotPasswordEmailHtml(otp),
    });
    if (error) {
      this.logger.warn(`Failed to send reset OTP email to ${email}: ${JSON.stringify(error)}`);
    } else {
      this.logger.log(`Reset OTP email sent to ${email}`);
    }
  }

  async sendPaymentSlipReceivedEmail(email: string, displayName: string, productTitles: string[]): Promise<void> {
    const apiKey = this.config.get('RESEND_API_KEY');
    if (!apiKey || apiKey === 'disabled') {
      this.logger.warn(`[DEV] Payment slip received email skipped for ${email}`);
      return;
    }

    const { error } = await this.resend.emails.send({
      from: this.fromEmail,
      to: email,
      subject: 'We received your payment — Twon',
      html: this.buildSlipReceivedEmailHtml(displayName, productTitles),
    });
    if (error) {
      this.logger.warn(`Failed to send slip-received email to ${email}: ${JSON.stringify(error)}`);
    } else {
      this.logger.log(`Slip-received email sent to ${email}`);
    }
  }

  async sendPaymentApprovedEmail(email: string, displayName: string, productTitles: string[]): Promise<void> {
    const apiKey = this.config.get('RESEND_API_KEY');
    if (!apiKey || apiKey === 'disabled') {
      this.logger.warn(`[DEV] Payment approved email skipped for ${email}`);
      return;
    }

    const { error } = await this.resend.emails.send({
      from: this.fromEmail,
      to: email,
      subject: 'Your payment was approved — Twon',
      html: this.buildPaymentApprovedEmailHtml(displayName, productTitles),
    });
    if (error) {
      this.logger.warn(`Failed to send payment-approved email to ${email}: ${JSON.stringify(error)}`);
    } else {
      this.logger.log(`Payment-approved email sent to ${email}`);
    }
  }

  async sendPaymentRejectedEmail(email: string, displayName: string, reason: string): Promise<void> {
    const apiKey = this.config.get('RESEND_API_KEY');
    if (!apiKey || apiKey === 'disabled') {
      this.logger.warn(`[DEV] Payment rejected email skipped for ${email}`);
      return;
    }

    const { error } = await this.resend.emails.send({
      from: this.fromEmail,
      to: email,
      subject: 'Your payment could not be approved — Twon',
      html: this.buildPaymentRejectedEmailHtml(displayName, reason),
    });
    if (error) {
      this.logger.warn(`Failed to send payment-rejected email to ${email}: ${JSON.stringify(error)}`);
    } else {
      this.logger.log(`Payment-rejected email sent to ${email}`);
    }
  }

  async sendPendingApprovalAdminEmail(email: string, customerName: string, productTitles: string[]): Promise<void> {
    const apiKey = this.config.get('RESEND_API_KEY');
    if (!apiKey || apiKey === 'disabled') {
      this.logger.warn(`[DEV] Pending-approval admin email skipped for ${email}`);
      return;
    }

    const { error } = await this.resend.emails.send({
      from: this.fromEmail,
      to: email,
      subject: 'New payment awaiting your approval — Twon',
      html: this.buildPendingApprovalAdminEmailHtml(customerName, productTitles),
    });
    if (error) {
      this.logger.warn(`Failed to send pending-approval email to ${email}: ${JSON.stringify(error)}`);
    } else {
      this.logger.log(`Pending-approval admin email sent to ${email}`);
    }
  }

  private buildSlipReceivedEmailHtml(displayName: string, productTitles: string[]): string {
    const frontendUrl = this.config.get('FRONTEND_URL', 'http://localhost:3000');
    return `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
        <h2 style="color: #1a1a1a;">Hi ${displayName},</h2>
        <p style="color: #555;">We received your payment evidence for:</p>
        <ul style="color: #1a1a1a;">${productTitles.map((t) => `<li>${t}</li>`).join('')}</ul>
        <p style="color: #555;">Please wait while the seller reviews and approves your payment. We'll email you as soon as it's confirmed.</p>
        <p style="color: #999; font-size: 12px;">You can check the status anytime in your <a href="${frontendUrl}/library">library</a>.</p>
      </div>
    `;
  }

  private buildPaymentApprovedEmailHtml(displayName: string, productTitles: string[]): string {
    const frontendUrl = this.config.get('FRONTEND_URL', 'http://localhost:3000');
    return `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
        <h2 style="color: #1a1a1a;">Hi ${displayName},</h2>
        <p style="color: #555;">Your payment has been approved for:</p>
        <ul style="color: #1a1a1a;">${productTitles.map((t) => `<li>${t}</li>`).join('')}</ul>
        <p style="color: #555;">You can start reading right away.</p>
        <p style="margin: 24px 0;">
          <a href="${frontendUrl}/library" style="display: inline-block; padding: 12px 24px; background: #7c3aed; color: #fff; text-decoration: none; border-radius: 8px;">Go to your library</a>
        </p>
      </div>
    `;
  }

  private buildPaymentRejectedEmailHtml(displayName: string, reason: string): string {
    return `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
        <h2 style="color: #1a1a1a;">Hi ${displayName},</h2>
        <p style="color: #555;">Unfortunately we couldn't approve your payment.</p>
        <p style="color: #1a1a1a; padding: 16px; background: #fef2f2; border-radius: 8px;"><strong>Reason:</strong> ${reason}</p>
        <p style="color: #555;">If you believe this is a mistake, please contact us or try placing the order again with a valid payment slip.</p>
      </div>
    `;
  }

  private buildPendingApprovalAdminEmailHtml(customerName: string, productTitles: string[]): string {
    const frontendUrl = this.config.get('FRONTEND_URL', 'http://localhost:3000');
    return `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
        <h2 style="color: #1a1a1a;">New payment awaiting approval</h2>
        <p style="color: #555;"><strong>${customerName}</strong> submitted payment for:</p>
        <ul style="color: #1a1a1a;">${productTitles.map((t) => `<li>${t}</li>`).join('')}</ul>
        <p style="margin: 24px 0;">
          <a href="${frontendUrl}/admin/orders" style="display: inline-block; padding: 12px 24px; background: #7c3aed; color: #fff; text-decoration: none; border-radius: 8px;">Review pending payments</a>
        </p>
      </div>
    `;
  }

  private buildForgotPasswordEmailHtml(otp: string): string {
    return `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
        <h2 style="color: #1a1a1a;">Reset your password</h2>
        <p style="color: #555;">Enter this code to reset your Twon password:</p>
        <div style="font-size: 36px; font-weight: bold; letter-spacing: 8px;
                    color: #1a1a1a; padding: 24px; background: #f5f5f5;
                    border-radius: 8px; text-align: center; margin: 24px 0;">
          ${otp}
        </div>
        <p style="color: #555;">This code expires in <strong>5 minutes</strong>.</p>
        <p style="color: #999; font-size: 12px;">
          If you didn't request a password reset, please ignore this email.
        </p>
      </div>
    `;
  }

  private buildOtpEmailHtml(displayName: string, otp: string): string {
    return `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
        <h2 style="color: #1a1a1a;">Hi ${displayName},</h2>
        <p style="color: #555;">Your verification code for Twon is:</p>
        <div style="font-size: 36px; font-weight: bold; letter-spacing: 8px;
                    color: #1a1a1a; padding: 24px; background: #f5f5f5;
                    border-radius: 8px; text-align: center; margin: 24px 0;">
          ${otp}
        </div>
        <p style="color: #555;">This code expires in <strong>5 minutes</strong>.</p>
        <p style="color: #999; font-size: 12px;">
          If you didn't request this, please ignore this email.
        </p>
      </div>
    `;
  }
}
