import { NextRequest, NextResponse } from "next/server";

const SERVER_URL = process.env.IMAGE2_SERVER_URL || "http://localhost:8000";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const upstream = await fetch(`${SERVER_URL}/analyze`, {
    method: "POST",
    body: formData,
  });

  const data = await upstream.json();
  if (!upstream.ok) {
    return NextResponse.json({ error: data.detail || "Analyze failed" }, { status: upstream.status });
  }

  return NextResponse.json(data);
}
