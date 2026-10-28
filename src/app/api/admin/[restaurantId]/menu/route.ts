import { NextResponse } from "next/server";
import {
  canManageRestaurant,
  getAdminContext,
  uuidPattern,
} from "@/lib/admin-auth";

type RouteContext = {
  params: Promise<{ restaurantId: string }>;
};

type MenuInput = {
  operation?: unknown;
  id?: unknown;
  categoryId?: unknown;
  name?: unknown;
  description?: unknown;
  price?: unknown;
  imageUrl?: unknown;
  isAvailable?: unknown;
};

function text(value: unknown, maxLength: number) {
  return typeof value === "string" && value.trim().length <= maxLength
    ? value.trim()
    : null;
}

export async function POST(request: Request, { params }: RouteContext) {
  const { restaurantId } = await params;
  const context = await getAdminContext();
  if (!context) {
    return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });
  }
  if (!uuidPattern.test(restaurantId) || !canManageRestaurant(context, restaurantId)) {
    return NextResponse.json({ error: "You don't have access to this restaurant." }, { status: 403 });
  }

  let input: MenuInput;
  try {
    input = await request.json();
  } catch {
    return NextResponse.json({ error: "Submit valid menu data." }, { status: 400 });
  }

  const operation = input.operation;
  const id = typeof input.id === "string" ? input.id : "";
  const supabase = context.serviceClient;

  if (operation === "create-category" || operation === "update-category") {
    const name = text(input.name, 100);
    if (!name) return NextResponse.json({ error: "Category name is required." }, { status: 400 });
    const result =
      operation === "create-category"
        ? await supabase
            .from("menu_categories")
            .insert({ restaurant_id: restaurantId, name })
            .select("id, name, sort_order")
            .single()
        : !uuidPattern.test(id)
          ? { data: null, error: { message: "Invalid category ID." } }
          : await supabase
              .from("menu_categories")
              .update({ name })
              .eq("restaurant_id", restaurantId)
              .eq("id", id)
              .select("id, name, sort_order")
              .maybeSingle();
    if (result.error) {
      const conflict = result.error.message.includes("duplicate key");
      return NextResponse.json(
        { error: conflict ? "That category already exists." : "Could not save the category." },
        { status: conflict ? 409 : 500 },
      );
    }
    if (!result.data) return NextResponse.json({ error: "Category not found." }, { status: 404 });
    return NextResponse.json({ category: result.data });
  }

  if (operation === "delete-category") {
    if (!uuidPattern.test(id)) return NextResponse.json({ error: "Invalid category." }, { status: 400 });
    const { data, error } = await supabase
      .from("menu_categories")
      .delete()
      .eq("restaurant_id", restaurantId)
      .eq("id", id)
      .select("id")
      .maybeSingle();
    if (error) {
      console.error("Could not delete menu category:", error.message);
      return NextResponse.json({ error: "Could not delete the category." }, { status: 500 });
    }
    if (!data) return NextResponse.json({ error: "Category not found." }, { status: 404 });
    return NextResponse.json({ success: true });
  }

  if (
    operation === "create-item" ||
    operation === "update-item" ||
    operation === "delete-item"
  ) {
    if (operation !== "delete-item") {
      const categoryId = typeof input.categoryId === "string" ? input.categoryId : "";
      const name = text(input.name, 120);
      const description = text(input.description ?? "", 1000);
      const imageUrl = text(input.imageUrl ?? "", 2048);
      const price = input.price;
      if (
        !uuidPattern.test(categoryId) ||
        !name ||
        description === null ||
        imageUrl === null ||
        typeof price !== "number" ||
        !Number.isFinite(price) ||
        price < 0 ||
        price > 999999 ||
        typeof input.isAvailable !== "boolean"
      ) {
        return NextResponse.json({ error: "Check all menu item fields." }, { status: 400 });
      }
      if (imageUrl) {
        try {
          if (new URL(imageUrl).protocol !== "https:") throw new Error("HTTPS required");
        } catch {
          return NextResponse.json({ error: "Photo URLs must use HTTPS." }, { status: 400 });
        }
      }
      const { data: category, error: categoryError } = await supabase
        .from("menu_categories")
        .select("id")
        .eq("restaurant_id", restaurantId)
        .eq("id", categoryId)
        .maybeSingle();
      if (categoryError) {
        console.error("Could not validate item category:", categoryError.message);
        return NextResponse.json({ error: "Could not validate the menu category." }, { status: 500 });
      }
      if (!category) return NextResponse.json({ error: "Choose a category for this item." }, { status: 400 });

      const values = {
        restaurant_id: restaurantId,
        category_id: categoryId,
        name,
        description,
        price,
        image_url: imageUrl || null,
        is_available: input.isAvailable,
      };
      const result =
        operation === "create-item"
          ? await supabase
              .from("menu_items")
              .insert(values)
              .select("id, category_id, name, description, price, image_url, is_available, sort_order")
              .single()
          : !uuidPattern.test(id)
            ? { data: null, error: { message: "Invalid item ID." } }
            : await supabase
                .from("menu_items")
                .update(values)
                .eq("restaurant_id", restaurantId)
                .eq("id", id)
                .select("id, category_id, name, description, price, image_url, is_available, sort_order")
                .maybeSingle();
      if (result.error) {
        console.error("Could not save menu item:", result.error.message);
        return NextResponse.json({ error: "Could not save the menu item." }, { status: 500 });
      }
      if (!result.data) return NextResponse.json({ error: "Menu item not found." }, { status: 404 });
      return NextResponse.json({ item: result.data });
    }

    if (!uuidPattern.test(id)) return NextResponse.json({ error: "Invalid menu item." }, { status: 400 });
    const { data, error } = await supabase
      .from("menu_items")
      .delete()
      .eq("restaurant_id", restaurantId)
      .eq("id", id)
      .select("id")
      .maybeSingle();
    if (error) {
      console.error("Could not delete menu item:", error.message);
      return NextResponse.json({ error: "Could not delete the menu item." }, { status: 500 });
    }
    if (!data) return NextResponse.json({ error: "Menu item not found." }, { status: 404 });
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Unknown menu action." }, { status: 400 });
}
