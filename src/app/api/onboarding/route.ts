import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { getAdminContext, uuidPattern } from "@/lib/admin-auth";

function text(value: unknown, maxLength: number) {
  return typeof value === "string" && value.trim().length <= maxLength
    ? value.trim()
    : null;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

async function readInput(request: Request) {
  try {
    const value: unknown = await request.json();
    return typeof value === "object" && value !== null
      ? value as Record<string, unknown>
      : null;
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const context = await getAdminContext();
  if (!context) {
    return NextResponse.json({ error: "Verify your email and sign in to continue." }, { status: 401 });
  }
  if (!context.restaurantIds.length) {
    return NextResponse.json({ complete: false, restaurant: null });
  }
  const { data, error } = await context.serviceClient
    .from("restaurants")
    .select("id, slug, name, is_published, onboarding_step")
    .in("id", context.restaurantIds)
    .order("created_at", { ascending: false });
  if (error) {
    console.error("Could not load onboarding progress:", error.message);
    return NextResponse.json({ error: "Could not load your setup progress." }, { status: 500 });
  }
  const restaurant = data?.find((entry) => !entry.is_published) ?? null;
  if (!restaurant && data?.length) return NextResponse.json({ complete: true });
  if (restaurant?.onboarding_step === 4) {
    const { data: link, error: linkError } = await context.serviceClient
      .from("guest_links")
      .select("id, token")
      .eq("restaurant_id", restaurant.id)
      .eq("kind", "qr")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (linkError) {
      console.error("Could not resume onboarding QR link:", linkError.message);
      return NextResponse.json({ error: "Could not load your QR code." }, { status: 500 });
    }
    if (link) {
      const origin = new URL(process.env.NEXT_PUBLIC_SITE_URL ?? request.url).origin;
      return NextResponse.json({
        complete: false,
        restaurant,
        guestUrl: new URL(`/go/${link.token}`, origin).toString(),
        linkId: link.id,
      });
    }
  }
  return NextResponse.json({ complete: false, restaurant });
}

export async function POST(request: Request) {
  const context = await getAdminContext();
  if (!context) {
    return NextResponse.json({ error: "Verify your email and sign in to continue." }, { status: 401 });
  }
  const input = await readInput(request);
  if (!input || typeof input.action !== "string") {
    return NextResponse.json({ error: "Check the setup details and try again." }, { status: 400 });
  }
  const service = context.serviceClient;

  if (input.action === "create-restaurant") {
    const name = text(input.name, 120);
    const address = text(input.address ?? "", 200);
    const city = text(input.city ?? "", 120);
    const phone = text(input.phone ?? "", 40);
    if (!name || !address || !city || !phone) {
      return NextResponse.json({ error: "Add the restaurant name, address, city, and phone." }, { status: 400 });
    }

    const baseSlug = slugify(name);
    if (!baseSlug) {
      return NextResponse.json({ error: "Choose a restaurant name with letters or numbers." }, { status: 400 });
    }
    const slug = `${baseSlug}-${randomBytes(6).toString("hex")}`;
    const initials = name
      .split(/\s+/)
      .slice(0, 2)
      .map((word) => word[0]?.toUpperCase() ?? "")
      .join("");
    const { data: restaurant, error } = await service
      .from("restaurants")
      .insert({
        slug,
        name,
        address,
        city,
        phone,
        initials,
        is_published: false,
        onboarding_step: 1,
      })
      .select("id, slug, name, is_published, onboarding_step")
      .single();
    if (error) {
      console.error("Could not create onboarding restaurant:", error.message);
      return NextResponse.json({ error: "We couldn't create the restaurant. Please try again." }, { status: 500 });
    }

    const { error: membershipError } = await service.from("restaurant_admins").insert({
      restaurant_id: restaurant.id,
      user_id: context.user.id,
    });
    if (membershipError) {
      console.error("Could not create restaurant admin membership:", membershipError.message);
      await service.from("restaurants").delete().eq("id", restaurant.id);
      return NextResponse.json({ error: "We couldn't finish creating your workspace. Please try again." }, { status: 500 });
    }
    return NextResponse.json({ restaurant, step: 1 }, { status: 201 });
  }

  const restaurantId = typeof input.restaurantId === "string" ? input.restaurantId : "";
  if (!uuidPattern.test(restaurantId) || !context.restaurantIds.includes(restaurantId)) {
    return NextResponse.json({ error: "Choose a restaurant in your workspace." }, { status: 403 });
  }

  const { data: restaurant, error: restaurantError } = await service
    .from("restaurants")
    .select("id, slug, name, onboarding_step, is_published")
    .eq("id", restaurantId)
    .single();
  if (restaurantError || !restaurant) {
    console.error("Could not verify onboarding restaurant:", restaurantError?.message);
    return NextResponse.json({ error: "This restaurant is no longer available." }, { status: 404 });
  }
  if (restaurant.is_published) {
    return NextResponse.json({ error: "This restaurant setup is already complete." }, { status: 409 });
  }

  if (input.action === "menu") {
    if (restaurant.onboarding_step >= 2) return NextResponse.json({ step: 2 });
    const name = text(input.itemName ?? "", 120);
    const description = text(input.description ?? "", 1000);
    const price = input.price === "" || input.price === undefined ? null : Number(input.price);
    if (name === null || description === null) {
      return NextResponse.json({ error: "Check the menu item name and description." }, { status: 400 });
    }
    if (name) {
      if (price === null || !Number.isFinite(price) || price < 0 || price > 999999) {
        return NextResponse.json({ error: "Check the menu item name, description, and price." }, { status: 400 });
      }
      const { data: category, error: categoryError } = await service
        .from("menu_categories")
        .upsert(
          { restaurant_id: restaurantId, name: "Menu", sort_order: 1 },
          { onConflict: "restaurant_id,name" },
        )
        .select("id")
        .single();
      if (categoryError || !category) {
        console.error("Could not create onboarding menu category:", categoryError?.message);
        return NextResponse.json({ error: "We couldn't add the menu category." }, { status: 500 });
      }
      const { error: itemError } = await service.from("menu_items").insert({
        restaurant_id: restaurantId,
        category_id: category.id,
        name,
        description,
        price,
      });
      if (itemError) {
        console.error("Could not create onboarding menu item:", itemError.message);
        return NextResponse.json({ error: "We couldn't add that menu item. Try again." }, { status: 500 });
      }
    }
    const { error } = await service
      .from("restaurants")
      .update({ onboarding_step: 2 })
      .eq("id", restaurantId);
    if (error) {
      console.error("Could not save onboarding progress:", error.message);
      return NextResponse.json({ error: "Your menu was saved, but setup progress couldn't be updated." }, { status: 500 });
    }
    return NextResponse.json({ step: 2 });
  }

  if (input.action === "wifi") {
    if (restaurant.onboarding_step >= 3) return NextResponse.json({ step: 3 });
    const wifiSsid = text(input.wifiSsid, 128);
    const wifiPassword = text(input.wifiPassword, 256);
    if (wifiSsid === null || wifiPassword === null) {
      return NextResponse.json({ error: "Check the network name and password." }, { status: 400 });
    }
    const { error } = await service
      .from("restaurants")
      .update({ wifi_ssid: wifiSsid, wifi_password: wifiPassword, onboarding_step: 3 })
      .eq("id", restaurantId);
    if (error) {
      console.error("Could not save onboarding Wi-Fi:", error.message);
      return NextResponse.json({ error: "We couldn't save your Wi-Fi details." }, { status: 500 });
    }
    return NextResponse.json({ step: 3 });
  }

  if (input.action === "qr") {
    if (restaurant.onboarding_step < 3) {
      return NextResponse.json({ error: "Complete the Wi-Fi step first." }, { status: 409 });
    }
    const tableLabel = text(input.tableLabel ?? "", 80);
    if (tableLabel === null) {
      return NextResponse.json({ error: "Keep the table label under 80 characters." }, { status: 400 });
    }
    const { data: existingLink, error: existingLinkError } = await service
      .from("guest_links")
      .select("id, token")
      .eq("restaurant_id", restaurantId)
      .eq("kind", "qr")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (existingLinkError) {
      console.error("Could not check onboarding QR links:", existingLinkError.message);
      return NextResponse.json({ error: "We couldn't create your QR code. Please try again." }, { status: 500 });
    }
    let link = existingLink;
    if (!link) {
      const token = randomBytes(12).toString("base64url");
      const { data: createdLink, error } = await service.from("guest_links").insert({
        restaurant_id: restaurantId,
        kind: "qr",
        token,
        table_label: tableLabel || null,
      }).select("id, token").single();
      if (error || !createdLink) {
        console.error("Could not create onboarding QR link:", error?.message);
        return NextResponse.json({ error: "We couldn't create your QR code. Please try again." }, { status: 500 });
      }
      link = createdLink;
    }
    const origin = process.env.NEXT_PUBLIC_SITE_URL ?? new URL(request.url).origin;
    const guestUrl = new URL(`/go/${link.token}`, origin).toString();
    const { error: progressError } = await service
      .from("restaurants")
      .update({ onboarding_step: 4 })
      .eq("id", restaurantId);
    if (progressError) {
      console.error("Could not save QR onboarding progress:", progressError.message);
      return NextResponse.json({ error: "QR code created, but setup progress couldn't be saved." }, { status: 500 });
    }
    return NextResponse.json({ step: 4, guestUrl, linkId: link.id });
  }

  if (input.action === "finish") {
    if (restaurant.onboarding_step < 4) {
      return NextResponse.json({ error: "Create your first QR code before publishing." }, { status: 409 });
    }
    const { data: qrLink, error: qrError } = await service
      .from("guest_links")
      .select("id")
      .eq("restaurant_id", restaurantId)
      .eq("kind", "qr")
      .limit(1)
      .maybeSingle();
    if (qrError || !qrLink) {
      console.error("Could not verify first onboarding QR link:", qrError?.message);
      return NextResponse.json({ error: "Create a QR code before publishing your guest page." }, { status: 409 });
    }
    const { error } = await service
      .from("restaurants")
      .update({ is_published: true })
      .eq("id", restaurantId);
    if (error) {
      console.error("Could not publish onboarding restaurant:", error.message);
      return NextResponse.json({ error: "We couldn't publish your guest page. Please try again." }, { status: 500 });
    }
    return NextResponse.json({ complete: true, slug: restaurant.slug });
  }

  return NextResponse.json({ error: "Choose a valid setup step." }, { status: 400 });
}
