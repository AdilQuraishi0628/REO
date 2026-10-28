import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import {
  canManageRestaurant,
  getAdminContext,
  uuidPattern,
} from "@/lib/admin-auth";

type RouteContext = {
  params: Promise<{ restaurantId: string }>;
};

export async function POST(request: Request, { params }: RouteContext) {
  const { restaurantId } = await params;
  const context = await getAdminContext();
  if (!context) {
    return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });
  }
  if (!uuidPattern.test(restaurantId) || !canManageRestaurant(context, restaurantId)) {
    return NextResponse.json({ error: "You don't have access to this restaurant." }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Submit valid link details." }, { status: 400 });
  }
  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "Submit valid link details." }, { status: 400 });
  }

  const input = body as Record<string, unknown>;
  const kind = input.kind;
  const tableLabel =
    typeof input.tableLabel === "string" ? input.tableLabel.trim() : "";
  if (
    (kind !== "qr" && kind !== "nfc") ||
    tableLabel.length > 80 ||
    (input.tableLabel !== undefined && typeof input.tableLabel !== "string")
  ) {
    return NextResponse.json({ error: "Choose QR or NFC and check the table label." }, { status: 400 });
  }

  const token = randomBytes(12).toString("base64url");
  const { data, error } = await context.serviceClient
    .from("guest_links")
    .insert({
      restaurant_id: restaurantId,
      kind,
      token,
      table_label: tableLabel || null,
    })
    .select("id, kind, token, table_label, created_at")
    .single();

  if (error) {
    console.error("Could not create guest link:", error.message);
    return NextResponse.json({ error: "Could not create the guest link." }, { status: 500 });
  }

  const configuredOrigin = process.env.NEXT_PUBLIC_SITE_URL;
  const origin = configuredOrigin
    ? new URL(configuredOrigin).origin
    : new URL(request.url).origin;
  return NextResponse.json(
    { link: data, url: new URL(`/go/${token}`, origin).toString() },
    { status: 201 },
  );
}

export async function DELETE(request: Request, { params }: RouteContext) {
  const { restaurantId } = await params;
  const context = await getAdminContext();
  if (!context) {
    return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });
  }
  if (!uuidPattern.test(restaurantId) || !canManageRestaurant(context, restaurantId)) {
    return NextResponse.json({ error: "You don't have access to this restaurant." }, { status: 403 });
  }

  const linkId = new URL(request.url).searchParams.get("linkId") ?? "";
  if (!uuidPattern.test(linkId)) {
    return NextResponse.json({ error: "Choose a valid guest link." }, { status: 400 });
  }

  const { data, error } = await context.serviceClient
    .from("guest_links")
    .delete()
    .eq("restaurant_id", restaurantId)
    .eq("id", linkId)
    .select("id")
    .maybeSingle();
  if (error) {
    console.error("Could not delete guest link:", error.message);
    return NextResponse.json({ error: "Could not delete the guest link." }, { status: 500 });
  }
  if (!data) return NextResponse.json({ error: "Guest link not found." }, { status: 404 });
  return NextResponse.json({ success: true });
}
