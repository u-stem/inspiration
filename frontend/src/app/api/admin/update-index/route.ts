import { NextResponse } from "next/server";

const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:8000";
const ADMIN_API_KEY = process.env.ADMIN_API_KEY || "";

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const download = searchParams.get("download") === "true";

  if (!ADMIN_API_KEY) {
    return NextResponse.json(
      { error: "Admin API not configured" },
      { status: 503 }
    );
  }

  const params = new URLSearchParams();
  if (download) {
    params.set("download", "true");
  }

  try {
    const response = await fetch(
      `${API_BASE_URL}/api/rhyme/update-index?${params}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": ADMIN_API_KEY,
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Index update failed:", error);
    return NextResponse.json(
      { error: "Failed to connect to backend API" },
      { status: 502 }
    );
  }
}
