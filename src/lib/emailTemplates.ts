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
