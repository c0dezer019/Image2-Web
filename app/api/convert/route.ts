import { NextRequest, NextResponse } from "next/server";

const SERVER_URL = process.env.IMAGE2_SERVER_URL || "http://localhost:8000";

export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("mode");
  if (mode !== "ascii" && mode !== "ansi") {
    return NextResponse.json({ error: "Invalid mode" }, { status: 400 });
  }

  const formData = await req.formData();
  const upstream = await fetch(`${SERVER_URL}/convert/${mode}`, {
    method: "POST",
    body: formData,
  });

  const data = await upstream.json();
  if (!upstream.ok) {
    return NextResponse.json({ error: data.detail || "Conversion failed" }, { status: upstream.status });
  }

  return NextResponse.json(data);
}
