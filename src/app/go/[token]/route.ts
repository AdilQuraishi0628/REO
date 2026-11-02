import { NextResponse } from "next/server";

type RouteContext = {
  params: Promise<{ token: string }>;
};

export async function GET(request: Request, { params }: RouteContext) {
  const { token } = await params;
  const cleanToken = (token || "").trim();

  // Tolerate tokens 3 to 64 chars containing letters, numbers, dash, underscore
  if (!/^[A-Za-z0-9_-]{3,64}$/.test(cleanToken)) {
    return NextResponse.redirect(new URL("/", request.url), 307);
  }

  // Canonical route is /t/[code]
  const destination = new URL(`/t/${encodeURIComponent(cleanToken)}`, request.url);
  // Forward any incoming search query parameters
  const incomingUrl = new URL(request.url);
  incomingUrl.searchParams.forEach((value, key) => {
    destination.searchParams.set(key, value);
  });

  return NextResponse.redirect(destination, 307);
}
