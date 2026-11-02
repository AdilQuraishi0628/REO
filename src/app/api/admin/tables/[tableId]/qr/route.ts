import { NextResponse } from "next/server";
import QRCode from "qrcode";
import {
  canManageRestaurant,
  getAdminContext,
  uuidPattern,
} from "@/lib/admin-auth";
import { generateTableToken } from "@/lib/table-token";
import { generateTableStandPdf } from "@/lib/table-qr-pdf";

type RouteContext = {
  params: Promise<{ tableId: string }>;
};

export async function GET(request: Request, { params }: RouteContext) {
  const { tableId } = await params;
  const configuredOrigin = process.env.NEXT_PUBLIC_SITE_URL || "https://reo-tau.vercel.app";
  const origin = configuredOrigin
    ? new URL(configuredOrigin).origin
    : new URL(request.url).origin;
  const format = new URL(request.url).searchParams.get("format") || "png";

  const context = await getAdminContext();

  // Support demo tables when unauthenticated or in demo mode
  const isDemoTable =
    !context ||
    tableId.startsWith("table-id-") ||
    tableId.startsWith("demo-") ||
    tableId.startsWith("table-demo-");

  if (isDemoTable) {
    const rawNumberMatch = tableId.match(/(\d+)$/);
    const num = rawNumberMatch ? rawNumberMatch[1] : "1";
    const prefix = tableId.includes("chai") ? "chai" : tableId.includes("royal") ? "royal" : "juniper";
    const venueName =
      prefix === "chai" ? "Chai & Chutney Bistro" : prefix === "royal" ? "The Royal Feast" : "Juniper & Rye";
    const tableName = `Table ${num}`;
    const uniqueCode = `demo-${prefix}-t${num}`;
    const token = generateTableToken(uniqueCode);
    const target = new URL(`/t/${uniqueCode}?token=${token}`, origin).toString();

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
          "Content-Disposition": `attachment; filename="${tableName.replace(/\s+/g, "-")}-QR.svg"`,
          "Cache-Control": "private, no-store",
        },
      });
    }

    if (format === "pdf") {
      const pdf = generateTableStandPdf({ venueName, tableName, targetUrl: target });
      return new Response(new Uint8Array(pdf), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${tableName.replace(/\s+/g, "-")}-Stand.pdf"`,
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
        "Content-Disposition": `attachment; filename="${tableName.replace(/\s+/g, "-")}-QR.png"`,
        "Cache-Control": "private, no-store",
      },
    });
  }

  if (!uuidPattern.test(tableId)) {
    return NextResponse.json({ error: "Invalid table QR code." }, { status: 400 });
  }

  const { data: table, error } = await context.serviceClient
    .from("tables")
    .select("id, restaurant_id, table_number, unique_code, restaurants(name)")
    .eq("id", tableId)
    .maybeSingle();

  if (error) {
    console.error("Could not load table QR destination:", error.message);
    return NextResponse.json({ error: "Could not load table QR code." }, { status: 500 });
  }
  if (!table || !canManageRestaurant(context, table.restaurant_id)) {
    return NextResponse.json({ error: "Table not found." }, { status: 404 });
  }

  const tableName = table.table_number || "Table";
  const restaurantRelation = table.restaurants as unknown as { name?: string } | null;
  const venueName = restaurantRelation?.name || "Restaurant";
  const token = generateTableToken(table.unique_code);
  const target = new URL(`/t/${table.unique_code}?token=${token}`, origin).toString();

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

  if (format === "pdf") {
    const pdf = generateTableStandPdf({ venueName, tableName, targetUrl: target });
    return new Response(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="tabletap-${table.id}.pdf"`,
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
