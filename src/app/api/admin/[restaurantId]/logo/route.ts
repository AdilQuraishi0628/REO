import { NextResponse } from "next/server";
import { canManageRestaurant, getAdminContext, uuidPattern } from "@/lib/admin-auth";

type RouteContext = {
  params: Promise<{ restaurantId: string }>;
};

const imageTypes = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);
const bucketName = "restaurant-assets";

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const { restaurantId } = await params;

    // 1. Demo mode fallback
    if (
      !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      !process.env.SUPABASE_SERVICE_ROLE_KEY ||
      restaurantId.startsWith("00000000-0000-4000-8000-")
    ) {
      return NextResponse.json({
        logoUrl: "https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=300&q=80",
      });
    }

    const context = await getAdminContext();
    if (!context) {
      return NextResponse.json({
        logoUrl: "https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=300&q=80",
      });
    }
    if (!uuidPattern.test(restaurantId) || !canManageRestaurant(context, restaurantId)) {
      return NextResponse.json({ error: "You don't have access to this restaurant." }, { status: 403 });
    }

    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return NextResponse.json({ error: "Choose an image to upload." }, { status: 400 });
    }
    const file = formData.get("logo");
    if (!(file instanceof File) || file.size === 0 || file.size > 2 * 1024 * 1024) {
      return NextResponse.json({ error: "Choose a logo image smaller than 2 MB." }, { status: 400 });
    }
    const extension = imageTypes.get(file.type);
    if (!extension) {
      return NextResponse.json({ error: "Logo images must be PNG, JPEG, or WebP." }, { status: 400 });
    }

    const objectPath = `${restaurantId}/logo-${crypto.randomUUID()}.${extension}`;
    const { error: uploadError } = await context.serviceClient.storage
      .from(bucketName)
      .upload(objectPath, new Uint8Array(await file.arrayBuffer()), {
        contentType: file.type,
        cacheControl: "31536000",
        upsert: false,
      });

    if (uploadError) {
      console.warn("Could not upload restaurant logo to storage:", uploadError.message);
      return NextResponse.json(
        { error: `Could not upload logo: ${uploadError.message}` },
        { status: 400 },
      );
    }

    const logoUrl = context.serviceClient.storage.from(bucketName).getPublicUrl(objectPath).data.publicUrl;
    const { data: restaurant, error: updateError } = await context.serviceClient
      .from("restaurants")
      .select("logo_url")
      .eq("id", restaurantId)
      .maybeSingle();

    if (updateError || !restaurant) {
      await context.serviceClient.storage.from(bucketName).remove([objectPath]);
      return NextResponse.json({ error: "Restaurant not found." }, { status: 404 });
    }

    const { error: saveError } = await context.serviceClient
      .from("restaurants")
      .update({ logo_url: logoUrl })
      .eq("id", restaurantId);

    if (saveError) {
      await context.serviceClient.storage.from(bucketName).remove([objectPath]);
      return NextResponse.json({ error: "Could not save restaurant logo URL." }, { status: 400 });
    }

    return NextResponse.json({ logoUrl });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Could not upload logo.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
