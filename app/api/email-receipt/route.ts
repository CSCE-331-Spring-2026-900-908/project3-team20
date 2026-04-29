import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { CartItem, lineTotal, lineTotalDiscounted } from '@/types';
import { HAPPY_HOUR_DISCOUNT_PCT } from '@/lib/happyHour';

export const runtime = 'nodejs';

interface EmailReceiptBody {
  email: string;
  items: CartItem[];
  tip: number;
  orderId?: number;
  isHappyHour: boolean;
  wheelPrize?: { label: string; discountPct: number; fixedDiscount?: number } | null;
}

function estimateWaitMinutes(total: number): number {
  return Math.min(30, Math.max(3, Math.round(3 + total / 2.5)));
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string
  ));
}

function buildReceiptHtml(
  items: CartItem[],
  subtotal: number,
  wheelDiscountAmt: number,
  tip: number,
  total: number,
  waitMinutes: number,
  orderId: number | undefined,
  isHappyHour: boolean,
  wheelPrizeLabel?: string
): string {
  const rows = items.map(item => {
    const price = isHappyHour ? lineTotalDiscounted(item, 1 - HAPPY_HOUR_DISCOUNT_PCT / 100) : lineTotal(item);
    const tops = item.toppings.filter(t => t.amount > 0)
      .map(t => `+ ${escapeHtml(t.name)} x${t.amount}`).join('<br/>');
    return `
      <tr>
        <td style="padding:8px 0;border-bottom:1px solid #eee;">
          <div><strong>${escapeHtml(item.drink.name)}</strong> &times; ${item.quantity}</div>
          <div style="color:#666;font-size:12px;">
            Size: ${escapeHtml(item.customization.size)} &middot;
            Hot: ${escapeHtml(item.customization.hot)} &middot;
            Sweetness: ${escapeHtml(item.customization.sweetness)} &middot;
            Ice: ${escapeHtml(item.customization.ice)}
          </div>
          ${tops ? `<div style="color:#666;font-size:12px;">${tops}</div>` : ''}
        </td>
        <td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right;white-space:nowrap;">
          $${price.toFixed(2)}
        </td>
      </tr>`;
  }).join('');

  return `
  <div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#111;">
    <h1 style="margin:0 0 4px;">🧋 Your Boba Order</h1>
    ${orderId != null ? `<p style="color:#666;margin:0 0 16px;">Order #${orderId}</p>` : ''}
    <div style="background:#fff7ed;border:1px solid #fdba74;border-radius:8px;padding:16px;margin-bottom:20px;">
      <div style="font-size:13px;color:#9a3412;text-transform:uppercase;letter-spacing:0.05em;">Estimated wait</div>
      <div style="font-size:28px;font-weight:700;color:#7c2d12;">~${waitMinutes} minutes</div>
    </div>
    <table style="width:100%;border-collapse:collapse;">
      <thead>
        <tr><th style="text-align:left;padding-bottom:8px;border-bottom:2px solid #111;">Item</th>
        <th style="text-align:right;padding-bottom:8px;border-bottom:2px solid #111;">Price</th></tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    <table style="width:100%;margin-top:16px;font-size:14px;">
      <tr><td>Subtotal</td><td style="text-align:right;">$${subtotal.toFixed(2)}</td></tr>
      ${wheelDiscountAmt > 0 ? `<tr><td style="color:#16a34a;">🎡 Wheel discount${wheelPrizeLabel ? ` (${escapeHtml(wheelPrizeLabel)})` : ''}</td><td style="text-align:right;color:#16a34a;">-$${wheelDiscountAmt.toFixed(2)}</td></tr>` : ''}
      <tr><td>Tip</td><td style="text-align:right;">$${tip.toFixed(2)}</td></tr>
      <tr><td style="font-weight:700;padding-top:6px;border-top:1px solid #ddd;">Total</td>
          <td style="text-align:right;font-weight:700;padding-top:6px;border-top:1px solid #ddd;">$${total.toFixed(2)}</td></tr>
    </table>
    <p style="color:#666;font-size:12px;margin-top:24px;">Thanks for ordering! See you soon.</p>
  </div>`;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as EmailReceiptBody;
    const { email, items, tip, orderId, isHappyHour, wheelPrize } = body;

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
    }
    if (!items || items.length === 0) {
      return NextResponse.json({ error: 'No items' }, { status: 400 });
    }

    const discountMult = isHappyHour ? 1 - HAPPY_HOUR_DISCOUNT_PCT / 100 : 1;
    const subtotal = items.reduce((s, i) => s + lineTotalDiscounted(i, discountMult), 0);
    const wheelDiscountAmt = wheelPrize
      ? wheelPrize.discountPct > 0
        ? subtotal * wheelPrize.discountPct / 100
        : (wheelPrize.fixedDiscount ?? 0)
      : 0;
    const discountedSubtotal = Math.max(0, subtotal - wheelDiscountAmt);
    const total = discountedSubtotal + (tip || 0);
    const waitMinutes = estimateWaitMinutes(discountedSubtotal);
    const html = buildReceiptHtml(items, subtotal, wheelDiscountAmt, tip || 0, total, waitMinutes, orderId, isHappyHour, wheelPrize?.label);
    const subject = `Your boba order — ~${waitMinutes} min wait${orderId != null ? ` (#${orderId})` : ''}`;

    const gmailUser = process.env.GMAIL_USER;
    const gmailPass = process.env.GMAIL_APP_PASSWORD;
    const fromName = process.env.EMAIL_FROM_NAME || 'Boba Shop';

    if (!gmailUser || !gmailPass) {
      console.log(`[email-receipt] GMAIL credentials not set — would send to ${email}: ${subject}`);
      return NextResponse.json({ ok: true, waitMinutes, simulated: true });
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: gmailUser, pass: gmailPass },
    });

    await transporter.sendMail({
      from: `"${fromName}" <${gmailUser}>`,
      to: email,
      subject,
      html,
    });

    return NextResponse.json({ ok: true, waitMinutes });
  } catch (err) {
    console.error('email-receipt error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
