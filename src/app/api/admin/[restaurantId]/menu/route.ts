import { NextResponse } from "next/server";
import {
  canManageRestaurant,
  getAdminContext,
  uuidPattern,
} from "@/lib/admin-auth";
import { demoRestaurants } from "@/lib/restaurant-data";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

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
  pricingVariants?: unknown;
  imageUrl?: unknown;
  dietaryTags?: unknown;
  isAvailable?: unknown;
  orderedIds?: unknown;
  icon?: unknown;
};

function text(value: unknown, maxLength: number) {
  return typeof value === "string" && value.trim().length <= maxLength
    ? value.trim()
    : null;
}

function isDemoMode(restaurantId: string): boolean {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return true;
  }
  if (
    restaurantId.startsWith("00000000-0000-4000-8000-") ||
    Object.values(demoRestaurants).some((entry) => entry.restaurant.id === restaurantId) ||
    Boolean(demoRestaurants[restaurantId])
  ) {
    return true;
  }
  return false;
}

function getDemoMenu(restaurantId: string) {
  const demoEntry =
    Object.values(demoRestaurants).find((entry) => entry.restaurant.id === restaurantId) ??
    demoRestaurants[restaurantId] ??
    demoRestaurants["juniper-and-rye"];

  const categories = demoEntry.categories.map((c, idx) => ({
    id: c.id,
    restaurant_id: demoEntry.restaurant.id,
    name: c.name,
    icon: c.icon ?? null,
    image_url: c.imageUrl ?? null,
    sort_order: idx,
  }));

  const items = demoEntry.categories.flatMap((c) =>
    c.items.map((item, idx) => ({
      id: item.id,
      restaurant_id: demoEntry.restaurant.id,
      category_id: c.id,
      name: item.name,
      description: item.description,
      price: item.price,
      pricing_variants: item.pricingVariants ?? null,
      image_url: item.imageUrl || null,
      dietary_tags: item.dietaryTags,
      is_available: item.isAvailable,
      sort_order: idx,
    })),
  );

  return { categories, items };
}

// Resilient query for categories: handles missing icon/image_url columns and table name variations
async function fetchCategories(supabase: SupabaseClient<Database>, restaurantId: string) {
  // 1. Try standard menu_categories with all columns
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let { data, error } = await (supabase as any)
    .from("menu_categories")
    .select("id, restaurant_id, name, icon, image_url, sort_order")
    .eq("restaurant_id", restaurantId)
    .order("sort_order");

  // 2. If icon or image_url column doesn't exist (Postgres 42703)
  if (error && (error.code === "42703" || error.message.includes("does not exist"))) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fallback = await (supabase as any)
      .from("menu_categories")
      .select("id, restaurant_id, name, sort_order")
      .eq("restaurant_id", restaurantId)
      .order("sort_order");

    if (!fallback.error) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data = (fallback.data ?? []).map((c: any) => ({
        ...c,
        icon: null,
        image_url: null,
      }));
      error = null;
    }
  }

  // 3. If table is named categories instead of menu_categories (Postgres 42P01)
  if (error && (error.code === "42P01" || error.message.includes("relation"))) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const catQuery = await (supabase as any)
      .from("categories")
      .select("id, restaurant_id, name, sort_order")
      .eq("restaurant_id", restaurantId)
      .order("sort_order");

    if (!catQuery.error) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data = (catQuery.data ?? []).map((c: any) => ({
        ...c,
        icon: c.icon ?? null,
        image_url: c.image_url ?? null,
      }));
      error = null;
    }
  }

  return { data, error };
}

// Resilient query for items: handles missing pricing_variants column and table name variations
async function fetchMenuItems(supabase: SupabaseClient<Database>, restaurantId: string) {
  // 1. Try standard menu_items with all columns
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let { data, error } = await (supabase as any)
    .from("menu_items")
    .select("id, restaurant_id, category_id, name, description, price, pricing_variants, image_url, dietary_tags, is_available, sort_order")
    .eq("restaurant_id", restaurantId)
    .order("sort_order");

  // 2. If pricing_variants column doesn't exist (Postgres 42703)
  if (error && (error.code === "42703" || error.message.includes("pricing_variants") || error.message.includes("does not exist"))) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fallback = await (supabase as any)
      .from("menu_items")
      .select("id, restaurant_id, category_id, name, description, price, image_url, dietary_tags, is_available, sort_order")
      .eq("restaurant_id", restaurantId)
      .order("sort_order");

    if (!fallback.error) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data = (fallback.data ?? []).map((item: any) => ({
        ...item,
        pricing_variants: null,
      }));
      error = null;
    }
  }

  // 3. If table is named items instead of menu_items (Postgres 42P01)
  if (error && (error.code === "42P01" || error.message.includes("relation"))) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const itemsQuery = await (supabase as any)
      .from("items")
      .select("id, restaurant_id, category_id, name, description, price, image_url, dietary_tags, is_available, sort_order")
      .eq("restaurant_id", restaurantId)
      .order("sort_order");

    if (!itemsQuery.error) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data = (itemsQuery.data ?? []).map((item: any) => ({
        ...item,
        pricing_variants: item.pricing_variants ?? null,
      }));
      error = null;
    }
  }

  return { data, error };
}

export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const { restaurantId } = await params;

    if (!restaurantId) {
      return NextResponse.json({ error: "Restaurant ID is required." }, { status: 400 });
    }

    // 1. Return demo menu data if in demo mode or demo restaurant
    if (isDemoMode(restaurantId)) {
      const demo = getDemoMenu(restaurantId);
      return NextResponse.json(demo, { status: 200 });
    }

    // 2. Query Supabase for real restaurant
    const context = await getAdminContext();
    if (!context) {
      return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });
    }

    if (!uuidPattern.test(restaurantId) || !canManageRestaurant(context, restaurantId)) {
      return NextResponse.json(
        { error: "You don't have access to this restaurant's menu." },
        { status: 403 },
      );
    }

    const supabase = context.serviceClient;
    const [categoriesResult, itemsResult] = await Promise.all([
      fetchCategories(supabase, restaurantId),
      fetchMenuItems(supabase, restaurantId),
    ]);

    if (categoriesResult.error) {
      console.error("Could not fetch categories:", categoriesResult.error.message);
      return NextResponse.json(
        { error: `Could not load categories: ${categoriesResult.error.message}` },
        { status: 400 },
      );
    }

    if (itemsResult.error) {
      console.error("Could not fetch menu items:", itemsResult.error.message);
      return NextResponse.json(
        { error: `Could not load menu items: ${itemsResult.error.message}` },
        { status: 400 },
      );
    }

    return NextResponse.json({
      categories: categoriesResult.data ?? [],
      items: itemsResult.data ?? [],
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Could not fetch menu.";
    console.error("GET /api/admin/[restaurantId]/menu failed:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const { restaurantId } = await params;

    if (!restaurantId) {
      return NextResponse.json({ error: "Restaurant ID is required." }, { status: 400 });
    }

    let input: MenuInput;
    try {
      input = await request.json();
    } catch {
      return NextResponse.json({ error: "Submit valid menu data." }, { status: 400 });
    }

    const operation = typeof input.operation === "string" ? input.operation : "";
    const id = typeof input.id === "string" ? input.id : "";

    // 1. Handle Demo / Simulated mutations
    if (isDemoMode(restaurantId)) {
      if (
        operation === "reorder-items" ||
        operation === "reorder-categories" ||
        operation === "bulk-availability" ||
        operation === "toggle-availability" ||
        operation === "delete-category" ||
        operation === "delete-item"
      ) {
        return NextResponse.json({ success: true });
      }

      if (operation === "create-category" || operation === "update-category") {
        const catName = text(input.name, 100) || "New Category";
        const catIcon = typeof input.icon === "string" && input.icon.trim() ? input.icon.trim() : "☕";
        return NextResponse.json({
          category: {
            id: id || `cat-${Date.now()}`,
            restaurant_id: restaurantId,
            name: catName,
            icon: catIcon,
            image_url: null,
            sort_order: 1,
          },
        });
      }

      if (operation === "create-item" || operation === "update-item") {
        const itemName = text(input.name, 120) || "Dish";
        const itemDesc = text(input.description ?? "", 1000) || "";
        const itemPrice = typeof input.price === "number" && !isNaN(input.price) ? input.price : Number(input.price || 199);
        const itemCatId = typeof input.categoryId === "string" && input.categoryId ? input.categoryId : "cat-demo";
        const itemTags = Array.isArray(input.dietaryTags) ? (input.dietaryTags as string[]) : ["Veg"];
        const itemAvailable = input.isAvailable !== false;
        const itemVariants = Array.isArray(input.pricingVariants) ? input.pricingVariants : null;
        const itemImage = typeof input.imageUrl === "string" && input.imageUrl.trim() ? input.imageUrl.trim() : null;

        return NextResponse.json({
          item: {
            id: id || `item-${Date.now()}`,
            restaurant_id: restaurantId,
            category_id: itemCatId,
            name: itemName,
            description: itemDesc,
            price: itemPrice,
            pricing_variants: itemVariants,
            image_url: itemImage,
            dietary_tags: itemTags,
            is_available: itemAvailable,
            sort_order: 1,
          },
        });
      }

      return NextResponse.json({ error: "Unknown menu action." }, { status: 400 });
    }

    // 2. Real Supabase restaurant mode
    const context = await getAdminContext();
    if (!context) {
      return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });
    }

    if (!uuidPattern.test(restaurantId) || !canManageRestaurant(context, restaurantId)) {
      return NextResponse.json(
        { error: "You don't have access to this restaurant's menu." },
        { status: 403 },
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = context.serviceClient as any;

    // A. Reorder items
    if (operation === "reorder-items") {
      const categoryId = typeof input.categoryId === "string" ? input.categoryId : "";
      const orderedIds = input.orderedIds;
      if (
        !uuidPattern.test(categoryId) ||
        !Array.isArray(orderedIds) ||
        orderedIds.some((itemId) => typeof itemId !== "string" || !uuidPattern.test(itemId)) ||
        new Set(orderedIds).size !== orderedIds.length
      ) {
        return NextResponse.json({ error: "Submit a valid menu item order." }, { status: 400 });
      }

      const { data: currentItems, error: currentError } = await supabase
        .from("menu_items")
        .select("id")
        .eq("restaurant_id", restaurantId)
        .eq("category_id", categoryId);

      if (currentError) {
        console.error("Could not load menu items for reordering:", currentError.message);
        return NextResponse.json({ error: "Could not reorder menu items." }, { status: 400 });
      }

      const currentIds = new Set((currentItems ?? []).map((item: { id: string }) => item.id));
      if (
        currentIds.size !== orderedIds.length ||
        orderedIds.some((itemId) => !currentIds.has(itemId))
      ) {
        return NextResponse.json({ error: "Menu order changed. Refresh and try again." }, { status: 409 });
      }

      const updates = await Promise.all(
        orderedIds.map((itemId, sortOrder) =>
          supabase
            .from("menu_items")
            .update({ sort_order: sortOrder })
            .eq("restaurant_id", restaurantId)
            .eq("category_id", categoryId)
            .eq("id", itemId),
        ),
      );

      const updateError = updates.find((result) => result.error)?.error;
      if (updateError) {
        console.error("Could not save menu item order:", updateError.message);
        return NextResponse.json({ error: "Could not save menu item order." }, { status: 400 });
      }

      return NextResponse.json({ success: true });
    }

    // B. Reorder categories
    if (operation === "reorder-categories") {
      const orderedIds = input.orderedIds;
      if (
        !Array.isArray(orderedIds) ||
        orderedIds.some((catId) => typeof catId !== "string" || !uuidPattern.test(catId)) ||
        new Set(orderedIds).size !== orderedIds.length
      ) {
        return NextResponse.json({ error: "Submit a valid category order." }, { status: 400 });
      }

      await Promise.all(
        orderedIds.map((catId, sortOrder) =>
          supabase
            .from("menu_categories")
            .update({ sort_order: sortOrder })
            .eq("restaurant_id", restaurantId)
            .eq("id", catId),
        ),
      );

      return NextResponse.json({ success: true });
    }

    // C. Toggle item availability
    if (operation === "toggle-availability") {
      if (!uuidPattern.test(id)) return NextResponse.json({ error: "Invalid menu item." }, { status: 400 });
      const isAvailable = Boolean(input.isAvailable);
      const { data, error } = await supabase
        .from("menu_items")
        .update({ is_available: isAvailable })
        .eq("restaurant_id", restaurantId)
        .eq("id", id)
        .select("id, is_available")
        .maybeSingle();

      if (error || !data) {
        return NextResponse.json({ error: error?.message || "Could not update item availability." }, { status: 400 });
      }
      return NextResponse.json({ success: true, item: data });
    }

    // D. Bulk category availability
    if (operation === "bulk-availability") {
      const categoryId = typeof input.categoryId === "string" ? input.categoryId : "";
      const isAvailable = Boolean(input.isAvailable);
      if (!uuidPattern.test(categoryId)) {
        return NextResponse.json({ error: "Invalid category." }, { status: 400 });
      }
      const { error } = await supabase
        .from("menu_items")
        .update({ is_available: isAvailable })
        .eq("restaurant_id", restaurantId)
        .eq("category_id", categoryId);

      if (error) {
        return NextResponse.json({ error: error.message || "Could not update items." }, { status: 400 });
      }
      return NextResponse.json({ success: true });
    }

    // E. Category CRUD
    if (operation === "create-category" || operation === "update-category") {
      const name = text(input.name, 100);
      const icon = typeof input.icon === "string" && input.icon.trim() ? input.icon.trim() : null;
      if (!name) return NextResponse.json({ error: "Category name is required." }, { status: 400 });

      // Try insert or update with icon
      let result =
        operation === "create-category"
          ? await supabase
              .from("menu_categories")
              .insert({ restaurant_id: restaurantId, name, icon })
              .select("id, name, icon, image_url, sort_order")
              .single()
          : !uuidPattern.test(id)
            ? { data: null, error: { message: "Invalid category ID." } }
            : await supabase
                .from("menu_categories")
                .update({ name, icon })
                .eq("restaurant_id", restaurantId)
                .eq("id", id)
                .select("id, name, icon, image_url, sort_order")
                .maybeSingle();

      // If icon column doesn't exist, retry without icon
      if (result.error && (result.error.code === "42703" || result.error.message.includes("icon"))) {
        result =
          operation === "create-category"
            ? await supabase
                .from("menu_categories")
                .insert({ restaurant_id: restaurantId, name })
                .select("id, name, sort_order")
                .single()
            : await supabase
                .from("menu_categories")
                .update({ name })
                .eq("restaurant_id", restaurantId)
                .eq("id", id)
                .select("id, name, sort_order")
                .maybeSingle();
      }

      // If menu_categories doesn't exist, retry on categories table
      if (result.error && (result.error.code === "42P01" || result.error.message.includes("relation"))) {
        result =
          operation === "create-category"
            ? await supabase
                .from("categories")
                .insert({ restaurant_id: restaurantId, name })
                .select("id, name, sort_order")
                .single()
            : await supabase
                .from("categories")
                .update({ name })
                .eq("restaurant_id", restaurantId)
                .eq("id", id)
                .select("id, name, sort_order")
                .maybeSingle();
      }

      if (result.error) {
        const conflict = result.error.message.includes("duplicate key") || result.error.message.includes("unique");
        return NextResponse.json(
          { error: conflict ? "That category already exists." : result.error.message || "Could not save the category." },
          { status: conflict ? 409 : 400 },
        );
      }
      if (!result.data) return NextResponse.json({ error: "Category not found." }, { status: 404 });
      return NextResponse.json({ category: result.data });
    }

    // F. Delete category
    if (operation === "delete-category") {
      if (!uuidPattern.test(id)) return NextResponse.json({ error: "Invalid category ID." }, { status: 400 });

      // Clean up items first in case foreign key cascade isn't configured
      await supabase
        .from("menu_items")
        .delete()
        .eq("restaurant_id", restaurantId)
        .eq("category_id", id);

      const { data, error } = await supabase
        .from("menu_categories")
        .delete()
        .eq("restaurant_id", restaurantId)
        .eq("id", id)
        .select("id")
        .maybeSingle();

      if (error) {
        console.error("Could not delete menu category:", error.message);
        return NextResponse.json({ error: error.message || "Could not delete the category." }, { status: 400 });
      }
      if (!data) return NextResponse.json({ error: "Category not found." }, { status: 404 });
      return NextResponse.json({ success: true });
    }

    // G. Item CRUD
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
        const dietaryTags = Array.isArray(input.dietaryTags) ? input.dietaryTags : [];
        const rawPrice = typeof input.price === "number" ? input.price : Number(input.price);
        const price = Number.isFinite(rawPrice) && rawPrice >= 0 && rawPrice <= 999999 ? rawPrice : null;
        const pricingVariants = Array.isArray(input.pricingVariants) ? input.pricingVariants : null;
        const isAvailable = input.isAvailable !== false;

        if (!uuidPattern.test(categoryId)) {
          return NextResponse.json({ error: "Select a valid category for this item." }, { status: 400 });
        }
        if (!name) {
          return NextResponse.json({ error: "Item name is required." }, { status: 400 });
        }
        if (price === null) {
          return NextResponse.json({ error: "Please enter a valid price." }, { status: 400 });
        }

        if (imageUrl) {
          try {
            if (new URL(imageUrl).protocol !== "https:") throw new Error("HTTPS required");
          } catch {
            return NextResponse.json({ error: "Photo URLs must use HTTPS." }, { status: 400 });
          }
        }

        // Verify category exists
        const { data: category } = await supabase
          .from("menu_categories")
          .select("id")
          .eq("restaurant_id", restaurantId)
          .eq("id", categoryId)
          .maybeSingle();

        if (!category) {
          return NextResponse.json({ error: "Chosen category does not exist." }, { status: 400 });
        }

        const values: Record<string, unknown> = {
          restaurant_id: restaurantId,
          category_id: categoryId,
          name,
          description: description || "",
          price,
          image_url: imageUrl || null,
          dietary_tags: [...new Set((dietaryTags as string[]).map((tag) => String(tag).trim()))],
          is_available: isAvailable,
        };

        if (pricingVariants && pricingVariants.length > 0) {
          values.pricing_variants = pricingVariants;
        }

        // Try insert/update with pricing_variants
        let result =
          operation === "create-item"
            ? await supabase
                .from("menu_items")
                .insert(values)
                .select("id, category_id, name, description, price, pricing_variants, image_url, dietary_tags, is_available, sort_order")
                .single()
            : !uuidPattern.test(id)
              ? { data: null, error: { message: "Invalid item ID." } }
              : await supabase
                  .from("menu_items")
                  .update(values)
                  .eq("restaurant_id", restaurantId)
                  .eq("id", id)
                  .select("id, category_id, name, description, price, pricing_variants, image_url, dietary_tags, is_available, sort_order")
                  .maybeSingle();

        // If pricing_variants column doesn't exist, retry without pricing_variants
        if (result.error && (result.error.code === "42703" || result.error.message.includes("pricing_variants"))) {
          delete values.pricing_variants;
          result =
            operation === "create-item"
              ? await supabase
                  .from("menu_items")
                  .insert(values)
                  .select("id, category_id, name, description, price, image_url, dietary_tags, is_available, sort_order")
                  .single()
              : await supabase
                  .from("menu_items")
                  .update(values)
                  .eq("restaurant_id", restaurantId)
                  .eq("id", id)
                  .select("id, category_id, name, description, price, image_url, dietary_tags, is_available, sort_order")
                  .maybeSingle();
        }

        if (result.error) {
          console.error("Could not save menu item:", result.error.message);
          return NextResponse.json({ error: result.error.message || "Could not save the menu item." }, { status: 400 });
        }
        if (!result.data) return NextResponse.json({ error: "Menu item not found." }, { status: 404 });
        return NextResponse.json({ item: result.data });
      }

      // Delete item
      if (!uuidPattern.test(id)) return NextResponse.json({ error: "Invalid menu item ID." }, { status: 400 });
      const { data, error } = await supabase
        .from("menu_items")
        .delete()
        .eq("restaurant_id", restaurantId)
        .eq("id", id)
        .select("id")
        .maybeSingle();

      if (error) {
        console.error("Could not delete menu item:", error.message);
        return NextResponse.json({ error: error.message || "Could not delete the menu item." }, { status: 400 });
      }
      if (!data) return NextResponse.json({ error: "Menu item not found." }, { status: 404 });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Unknown menu action." }, { status: 400 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "An unexpected error occurred.";
    console.error("POST /api/admin/[restaurantId]/menu failed:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
