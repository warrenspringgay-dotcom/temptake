import { NextRequest, NextResponse } from "next/server";
import { getFourWeeklyReview } from "@/app/actions/reports";
import { fourWeekSummaryToLines } from "@/lib/fourWeekReport";

function pdfEscape(s: string) {
  return s.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function buildSimplePdf(lines: string[]) {
  const fontSize = 11;
  const left = 44;
  const top = 800;
  const leading = 14;

  const maxLines = 52;
  const clipped = lines.slice(0, maxLines);

  let y = top;
  const contentParts: string[] = [];
  contentParts.push("BT");
  contentParts.push(`/F1 ${fontSize} Tf`);
  contentParts.push(`${left} ${y} Td`);

  for (let i = 0; i < clipped.length; i++) {
    const text = pdfEscape(clipped[i] ?? "");
    if (i === 0) contentParts.push(`(${text}) Tj`);
    else {
      contentParts.push(`0 -${leading} Td`);
      contentParts.push(`(${text}) Tj`);
    }
    y -= leading;
  }

  contentParts.push("ET");
  const content = contentParts.join("\n");

  const objects: string[] = [];
  objects.push(`1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj`);
  objects.push(`2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj`);
  objects.push(`3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>
endobj`);
  objects.push(`4 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj`);

  const contentBytes = Buffer.from(content, "utf8");
  objects.push(`5 0 obj
<< /Length ${contentBytes.length} >>
stream
${content}
endstream
endobj`);

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [0];

  for (const obj of objects) {
    offsets.push(Buffer.byteLength(pdf, "utf8"));
    pdf += obj + "\n";
  }

  const xrefOffset = Buffer.byteLength(pdf, "utf8");
  pdf += `xref
0 ${objects.length + 1}
0000000000 65535 f \n`;

  for (let i = 1; i < offsets.length; i++) {
    const off = String(offsets[i]).padStart(10, "0");
    pdf += `${off} 00000 n \n`;
  }

  pdf += `trailer
<< /Size ${objects.length + 1} /Root 1 0 R >>
startxref
${xrefOffset}
%%EOF`;

  return Buffer.from(pdf, "utf8");
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const to = searchParams.get("to") ?? undefined;

  const summary = await getFourWeeklyReview({ to });
  const lines = fourWeekSummaryToLines(summary);
  const pdfBytes = buildSimplePdf(lines);

  const filename = `four-weekly-review_${summary.period.from}_to_${summary.period.to}.pdf`;

  return new NextResponse(pdfBytes, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
