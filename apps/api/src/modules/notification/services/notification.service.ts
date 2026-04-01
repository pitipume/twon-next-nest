import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);
  private readonly resend: Resend;
  private readonly fromEmail: string;

  constructor(private readonly config: ConfigService) {
    this.resend = new Resend(this.config.get('RESEND_API_KEY'));
    this.fromEmail = this.config.get('EMAIL_FROM', 'noreply@aura-platform.com');
  }

  async sendOtpEmail(email: string, displayName: string, otp: string): Promise<void> {
    // DEV MODE: log OTP to console when no API key configured
    if (!this.config.get('RESEND_API_KEY')) {
      this.logger.warn('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      this.logger.warn(`  DEV OTP for ${email}: ${otp}`);
      this.logger.warn('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      return;
    }

    try {
      await this.resend.emails.send({
        from: this.fromEmail,
        to: email,
        subject: 'Your Aura verification code',
        html: this.buildOtpEmailHtml(displayName, otp),
      });
    } catch (error) {
      // Fire-and-forget — never throw to callers (same pattern as EagleLogger in .NET)
      this.logger.warn(`Failed to send OTP email to ${email}: ${error}`);
    }
  }

  private buildOtpEmailHtml(displayName: string, otp: string): string {
    return `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
        <h2 style="color: #1a1a1a;">Hi ${displayName},</h2>
        <p style="color: #555;">Your verification code for Aura is:</p>
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
