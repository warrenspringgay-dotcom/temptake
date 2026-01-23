// src/lib/emailTemplates.ts
export function baseEmailHtml(opts: { title: string; body: string }) {
  return `
  <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px">
    <h2 style="margin:0 0 12px">${opts.title}</h2>
    <div style="font-size:14px;line-height:1.5;color:#222">${opts.body}</div>
    <hr style="margin:24px 0;border:none;border-top:1px solid #eee" />
    <div style="font-size:12px;color:#666">
      TempTake · Food compliance made simple
    </div>
  </div>`;
}
import "server-only";

export function fmtDDMMYYYY(d: Date) {
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const yyyy = d.getUTCFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

export function getOriginFromEnv(fallbackOrigin: string) {
  const env =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.NEXT_PUBLIC_VERCEL_URL
      ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
      : "");
  return (env || fallbackOrigin).replace(/\/$/, "");
}

export function wrapHtml(title: string, body: string) {
  return `
    <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;line-height:1.5;color:#111">
      <h2 style="margin:0 0 12px">${title}</h2>
      ${body}
      <p style="margin:18px 0 0;color:#555;font-size:12px">
        Need help? Reply to this email.
      </p>
    </div>
  `;
}

export function ctaButton(url: string, label: string) {
  return `
    <p style="margin:0 0 18px">
      <a href="${url}" style="display:inline-block;background:#111;color:#fff;text-decoration:none;padding:10px 14px;border-radius:10px">
        ${label}
      </a>
    </p>
  `;
}
