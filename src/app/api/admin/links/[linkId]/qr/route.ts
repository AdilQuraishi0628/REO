import { NextResponse } from "next/server";
import QRCode from "qrcode";
import {
  canManageRestaurant,
  getAdminContext,
  uuidPattern,
} from "@/lib/admin-auth";

type RouteContext = {
  params: Promise<{ linkId: string }>;
};

export async function GET(request: Request, { params }: RouteContext) {
  const { linkId } = await params;
  const context = await getAdminContext();
  if (!context) {
    return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });
  }
  if (!uuidPattern.test(linkId)) {
    return NextResponse.json({ error: "Invalid QR code." }, { status: 400 });
  }

  const { data: link, error } = await context.serviceClient
    .from("guest_links")
    .select("id, restaurant_id, token")
    .eq("id", linkId)
    .maybeSingle();
  if (error) {
    console.error("Could not load QR link:", error.message);
    return NextResponse.json({ error: "Could not load QR code." }, { status: 500 });
  }
  if (!link || !canManageRestaurant(context, link.restaurant_id)) {
    return NextResponse.json({ error: "Guest link not found." }, { status: 404 });
  }

  const configuredOrigin = process.env.NEXT_PUBLIC_SITE_URL;
  const origin = configuredOrigin
    ? new URL(configuredOrigin).origin
    : new URL(request.url).origin;
  const target = new URL(`/go/${link.token}`, origin).toString();
  const qr = await QRCode.toBuffer(target, {
    type: "png",
    width: 720,
    margin: 2,
    errorCorrectionLevel: "H",
    color: { dark: "#2A1A1D", light: "#ffffff" },
  });

  return new Response(new Uint8Array(qr), {
    headers: {
      "Content-Type": "image/png",
      "Content-Disposition": `attachment; filename="tabletap-${link.id}.png"`,
      "Cache-Control": "private, no-store",
    },
  });
}
