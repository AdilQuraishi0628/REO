import { NextResponse } from "next/server";
import QRCode from "qrcode";
import {
  canManageRestaurant,
  getAdminContext,
  uuidPattern,
} from "@/lib/admin-auth";

type RouteContext = {
  params: Promise<{ tableId: string }>;
};

export async function GET(request: Request, { params }: RouteContext) {
  const { tableId } = await params;
  const context = await getAdminContext();
  if (!context) {
    return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });
  }
  if (!uuidPattern.test(tableId)) {
    return NextResponse.json({ error: "Invalid table QR code." }, { status: 400 });
  }

  const { data: table, error } = await context.serviceClient
    .from("tables")
    .select("id, restaurant_id, unique_code")
    .eq("id", tableId)
    .maybeSingle();
  if (error) {
    console.error("Could not load table QR destination:", error.message);
    return NextResponse.json({ error: "Could not load table QR code." }, { status: 500 });
  }
  if (!table || !canManageRestaurant(context, table.restaurant_id)) {
    return NextResponse.json({ error: "Table not found." }, { status: 404 });
  }

  const configuredOrigin = process.env.NEXT_PUBLIC_SITE_URL || "https://reo-tau.vercel.app";
  const origin = configuredOrigin
    ? new URL(configuredOrigin).origin
    : new URL(request.url).origin;
  const target = new URL(`/t/${table.unique_code}`, origin).toString();
  const format = new URL(request.url).searchParams.get("format");
  if (format === "svg") {
    const svg = await QRCode.toString(target, {
      type: "svg",
      width: 720,
      margin: 2,
      errorCorrectionLevel: "H",
      color: { dark: "#2A1A1D", light: "#F7F1E9" },
    });
    return new Response(svg, {
      headers: {
        "Content-Type": "image/svg+xml",
        "Content-Disposition": `attachment; filename="tabletap-${table.id}.svg"`,
        "Cache-Control": "private, no-store",
      },
    });
  }

  const png = await QRCode.toBuffer(target, {
    type: "png",
    width: 1200,
    margin: 3,
    errorCorrectionLevel: "H",
    color: { dark: "#2A1A1D", light: "#F7F1E9" },
  });
  return new Response(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      "Content-Disposition": `attachment; filename="tabletap-${table.id}.png"`,
      "Cache-Control": "private, no-store",
    },
  });
}
