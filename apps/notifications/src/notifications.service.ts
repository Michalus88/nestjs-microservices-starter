import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { NotifyEmailDto } from '@app/common';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private readonly transporter: nodemailer.Transporter;

  constructor(private readonly configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get('SMTP_HOST'),
      port: Number(this.configService.get('SMTP_PORT')),
      secure: this.configService.get('SMTP_TLS') === 'true',
      auth: {
        user: this.configService.get('SMTP_USERNAME'),
        pass: this.configService.get('SMTP_PASSWORD'),
      },
    });
  }

  async notifyEmail({ email, text }: NotifyEmailDto) {
    try {
      const result = await this.transporter.sendMail({
        from: this.configService.get('SMTP_USERNAME'),
        to: email,
        subject: 'Sleepr Notification',
        text,
      });
      this.logger.log(`Email sent to ${email}, messageId: ${result.messageId}`);
    } catch (error) {
      this.logger.error(`Failed to send email to ${email}`, error.stack);
    }
  }
}
