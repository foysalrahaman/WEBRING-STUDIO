import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import nodemailer from 'nodemailer';
import { writeClient } from '@/sanity/lib/client';
import { rateLimit, stripHtml, formatDate } from '@/lib/utils';

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

const bookingSchema = z.object({
  clientName: z.string().min(2).max(100).transform(stripHtml),
  email: z.string().email().max(255),
  whatsapp: z.string().max(20).optional().transform((v) => v ? stripHtml(v) : undefined),
  company: z.string().max(200).optional().transform((v) => v ? stripHtml(v) : undefined),
  services: z.array(z.string().max(100)).min(1),
  productCategory: z.string().min(1).max(100).transform(stripHtml),
  budget: z.string().min(1).max(100).transform(stripHtml),
  notes: z.string().max(5000).optional().transform((v) => v ? stripHtml(v) : undefined),
  selectedDate: z.string().min(1),
  selectedTime: z.string().min(1).max(20),
  referral: z.string().max(100).optional().transform((v) => v ? stripHtml(v) : undefined),
});

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const rateLimitResult = rateLimit(ip, 3, 3600000);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { success: false, error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    const body = await request.json();
    const data = bookingSchema.parse(body);

    // Save to Sanity
    let bookingId = 'local-' + Date.now();
    try {
      if (process.env.SANITY_API_TOKEN) {
        const result = await writeClient.create({
          _type: 'booking',
          clientName: data.clientName,
          email: data.email,
          whatsapp: data.whatsapp,
          company: data.company,
          services: data.services,
          productCategory: data.productCategory,
          budget: data.budget,
          notes: data.notes,
          selectedDate: data.selectedDate,
          selectedTime: data.selectedTime,
          referral: data.referral,
          status: 'pending',
          createdAt: new Date().toISOString(),
        });
        bookingId = result._id;
      }
    } catch (sanityError) {
      console.error('Failed to save booking to Sanity:', sanityError);
    }

    // Send emails via Nodemailer
    if (process.env.SMTP_USER && process.env.SMTP_PASSWORD) {
      const servicesHtml = data.services.map(s => `<li>${s}</li>`).join('');
      const formattedDate = formatDate(data.selectedDate);

      // Alert to Agency (You)
      await transporter.sendMail({
        from: `"WEBRING Bookings" <${process.env.SMTP_USER}>`,
        to: CONTACT_EMAIL,
        subject: `🗓️ New Booking: ${data.clientName} — ${formattedDate}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #C8A96E;">New Booking Received</h2>
            <div style="background: #f5f5f5; padding: 20px; border-radius: 12px; margin-bottom: 20px;">
              <h3 style="margin: 0 0 16px;">Client Details</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr><td style="padding: 6px 0; color: #666;">Name</td><td style="padding: 6px 0; font-weight: bold;">${data.clientName}</td></tr>
                <tr><td style="padding: 6px 0; color: #666;">Email</td><td style="padding: 6px 0;"><a href="mailto:${data.email}">${data.email}</a></td></tr>
                ${data.whatsapp ? `<tr><td style="padding: 6px 0; color: #666;">WhatsApp</td><td style="padding: 6px 0;">${data.whatsapp}</td></tr>` : ''}
                ${data.company ? `<tr><td style="padding: 6px 0; color: #666;">Company</td><td style="padding: 6px 0;">${data.company}</td></tr>` : ''}
              </table>
            </div>
            <div style="background: #f5f5f5; padding: 20px; border-radius: 12px; margin-bottom: 20px;">
              <h3 style="margin: 0 0 16px;">Project Details</h3>
              <p><strong>Services:</strong></p><ul>${servicesHtml}</ul>
              <p><strong>Category:</strong> ${data.productCategory}</p>
              <p><strong>Budget:</strong> ${data.budget}</p>
              ${data.notes ? `<p><strong>Notes:</strong> ${data.notes}</p>` : ''}
            </div>
            <div style="background: #C8A96E; color: #0A0A0A; padding: 20px; border-radius: 12px; text-align: center;">
              <h3 style="margin: 0;">📅 ${formattedDate}</h3>
              <p style="margin: 4px 0 0; font-size: 18px; font-weight: bold;">⏰ ${data.selectedTime} GMT+6</p>
            </div>
          </div>
        `,
      });

      // Confirmation to Client
      await transporter.sendMail({
        from: `"WEBRING" <${process.env.SMTP_USER}>`,
        to: data.email,
        subject: `Your WEBRING Strategy Call is Confirmed!`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #C8A96E;">You're booked, ${data.clientName}! 🎉</h2>
            <p>Your free strategy call with the WEBRING team is confirmed.</p>
            <div style="background: #f5f5f5; padding: 20px; border-radius: 12px; margin: 20px 0; text-align: center;">
              <h3 style="margin: 0;">📅 ${formattedDate}</h3>
              <p style="margin: 4px 0 0; font-size: 18px; font-weight: bold;">⏰ ${data.selectedTime} GMT+6</p>
            </div>
            <p>We'll reach out via email before the call to finalize details.</p>
            <p style="margin-top: 24px; color: #666;">— The WEBRING Team</p>
          </div>
        `,
      });
    }

    // Send to Google Sheets
    const GOOGLE_SHEET_URL = process.env.GOOGLE_SHEET_URL;
    if (GOOGLE_SHEET_URL) {
      try {
        await fetch(GOOGLE_SHEET_URL, {
          method: 'POST',
          body: JSON.stringify({
            ...data,
            services: data.services.join(', '),
            submittedAt: new Date().toISOString()
          }),
        });
      } catch (error) {
        console.error('Failed to save to Google Sheets:', error);
      }
    }

    return NextResponse.json({ success: true, bookingId });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid booking data', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Booking error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create booking' },
      { status: 500 }
    );
  }
}
