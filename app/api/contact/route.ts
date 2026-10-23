import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import nodemailer from 'nodemailer';
import { writeClient } from '@/sanity/lib/client';
import { rateLimit, stripHtml } from '@/lib/utils';

// Email transporter configuration
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '465'),
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

const CONTACT_EMAIL = process.env.CONTACT_EMAIL || 'hello@webring.studio';

const contactSchema = z.object({
  name: z.string().min(2).max(100).transform(stripHtml),
  email: z.string().email().max(255),
  phone: z.string().max(25).optional().transform((v) => v ? stripHtml(v) : undefined),
  subject: z.string().min(3).max(200).transform(stripHtml),
  service: z.string().min(1).max(100).transform(stripHtml),
  message: z.string().min(10).max(5000).transform(stripHtml),
});

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const rateLimitResult = rateLimit(ip, 5, 3600000);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { success: false, error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    const body = await request.json();
    const data = contactSchema.parse(body);

    // 1. Save to Sanity
    let contactId = 'local-' + Date.now();
    try {
      if (process.env.SANITY_API_TOKEN) {
        const result = await writeClient.create({
          _type: 'contact',
          name: data.name,
          email: data.email,
          phone: data.phone,
          subject: data.subject,
          service: data.service,
          message: data.message,
          status: 'new',
          createdAt: new Date().toISOString(),
        });
        contactId = result._id;
      }
    } catch (sanityError) {
      console.error('Failed to save to Sanity:', sanityError);
    }

    // 2. Send emails via Nodemailer
    if (process.env.SMTP_USER && process.env.SMTP_PASSWORD) {
      // Alert to Agency (You)
      await transporter.sendMail({
        from: `"WEBRING Alerts" <${process.env.SMTP_USER}>`,
        to: CONTACT_EMAIL,
        subject: `📩 New Message: ${data.subject}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 12px; padding: 24px;">
            <h2 style="color: #C8A96E; margin-bottom: 24px;">New Contact Submission</h2>
            <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; margin-bottom: 24px;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr><td style="padding: 8px 0; color: #666; width: 120px;">Name</td><td style="padding: 8px 0; font-weight: bold;">${data.name}</td></tr>
                <tr><td style="padding: 8px 0; color: #666;">Email</td><td style="padding: 8px 0;"><a href="mailto:${data.email}">${data.email}</a></td></tr>
                ${data.phone ? `<tr><td style="padding: 8px 0; color: #666;">Phone</td><td style="padding: 8px 0;">${data.phone}</td></tr>` : ''}
                <tr><td style="padding: 8px 0; color: #666;">Subject</td><td style="padding: 8px 0;">${data.subject}</td></tr>
                <tr><td style="padding: 8px 0; color: #666;">Service</td><td style="padding: 8px 0;">${data.service}</td></tr>
              </table>
            </div>
            <h3 style="color: #333; margin-bottom: 12px;">Message Content:</h3>
            <div style="background: #fff; border-left: 4px solid #C8A96E; padding: 16px; margin-bottom: 24px; font-style: italic; color: #444;">
              ${data.message}
            </div>
          </div>
        `,
      });

      // Thank You to Client
      await transporter.sendMail({
        from: `"WEBRING" <${process.env.SMTP_USER}>`,
        to: data.email,
        subject: `We've received your message, ${data.name}!`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #C8A96E;">Hi ${data.name},</h2>
            <p>Thanks for reaching out to WEBRING! We've received your message about <strong>"${data.subject}"</strong>.</p>
            <p>One of our team members will review your inquiry and get back to you within 24 hours.</p>
            <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #eee;">
              <p style="margin: 0; font-weight: bold;">The WEBRING Team</p>
              <p style="margin: 4px 0; color: #666; font-size: 14px;">Elevating Brands through AI Visuals</p>
              <a href="https://webring.studio" style="color: #C8A96E; text-decoration: none; font-size: 14px;">webring.studio</a>
            </div>
          </div>
        `,
      });
    }

    // 3. Send to Google Sheets
    const CONTACT_SHEET_URL = process.env.CONTACT_GOOGLE_SHEET_URL || process.env.GOOGLE_SHEET_URL;
    if (CONTACT_SHEET_URL) {
      try {
        await fetch(CONTACT_SHEET_URL, {
          method: 'POST',
          body: JSON.stringify({
            ...data,
            submittedAt: new Date().toISOString()
          }),
        });
      } catch (error) {
        console.error('Failed to save to Google Sheets:', error);
      }
    }

    return NextResponse.json({ success: true, contactId });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid form data', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Contact form error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to send message' },
      { status: 500 }
    );
  }
}
