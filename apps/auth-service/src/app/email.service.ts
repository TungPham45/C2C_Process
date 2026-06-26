import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logFilePath = path.join(process.cwd(), 'otp_simulation.log');
  private transporter: nodemailer.Transporter | null = null;

  constructor() {
    // Configure Nodemailer if SMTP settings are provided
    if (process.env.SMTP_USER && process.env.SMTP_PASS) {
      this.transporter = nodemailer.createTransport({
        service: 'gmail', // You can use generic host/port depending on env
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
    }
  }

  async sendOtpEmail(to: string, code: string, purpose: string) {
    const isGmail = to.toLowerCase().endsWith('@gmail.com');
    const isSmtpConfigured = !!this.transporter;

    const messageContent = `
=========================================
[EMAIL VERIFICATION]
To: ${to}
Subject: Your Verification Code
Purpose: ${purpose}
Code: ${code}
Time: ${new Date().toLocaleString()}
=========================================
`;

    if (isSmtpConfigured && isGmail) {
      try {
        await this.transporter!.sendMail({
          from: `"C2C Platform" <${process.env.SMTP_USER}>`,
          to,
          subject: `Your Verification Code for ${purpose}`,
          text: `Here is your verification code: ${code}\n\nThis code will expire in 10 minutes.`,
          html: `<p>Here is your verification code: <strong>${code}</strong></p><p>This code will expire in 10 minutes.</p>`,
        });
        console.log(`[EMAIL] Successfully sent OTP to ${to} via Nodemailer`);
        return true;
      } catch (err) {
        console.error(`[EMAIL] Failed to send OTP to ${to} via Nodemailer`, err);
        // Fallback to simulation if send fails
      }
    }

    // 1. Log to console for real-time visibility in dev terminal
    console.log('[EMAIL SIMULATION] ' + messageContent);

    // 2. Write to a local log file so the agent/user can check it later
    try {
      fs.appendFileSync(this.logFilePath, messageContent);
    } catch (err) {
      console.error('Failed to write to OTP log file', err);
    }

    return true;
  }
}
