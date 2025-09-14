// src/app/api/allergens/route.ts
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// In-memory store (dev/demo). Swap for DB later.
type AllergenFlags = Record<string, boolean>;
type Item = {
  id: string;
  name: string;
  category?: string | null;
  notes?: string | null;
  flags: AllergenFlags;
};

const G: any = globalThis as any;
if (!G.__ALLERGENS__) G.__ALLERGENS__ = [] as Item[];
const store = (): Item[] => G.__ALLERGENS__ as Item[];

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

// GET /api/allergens
export async function GET() {
  return NextResponse.json(store());
}

// POST /api/allergens  (upsert)
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body || !body.name) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
  const items = store();
  const id: string = body.id || uid();
  const idx = items.findIndex((x) => x.id === id);

  const item: Item = {
    id,
    name: String(body.name).trim(),
    category: body.category ? String(body.category).trim() : null,
    notes: body.notes ? String(body.notes).trim() : null,
    flags: typeof body.flags === "object" && body.flags ? body.flags : {},
  };

  if (idx >= 0) items[idx] = item;
  else items.push(item);

  return NextResponse.json(item);
}

// DELETE /api/allergens?id=...
export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const items = store();
  G.__ALLERGENS__ = items.filter((x: Item) => x.id !== id);
  return NextResponse.json({ ok: true });
}
