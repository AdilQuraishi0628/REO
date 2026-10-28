import { createClient } from "@supabase/supabase-js";

export type Restaurant = {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  description: string;
  address: string;
  city: string;
  phone: string;
  hours: string;
  heroImage: string;
  initials: string;
  wifiSsid: string;
  wifiPassword: string;
  googleReviewUrl: string;
  logoUrl: string;
  primaryColor: string;
};

export type MenuItem = {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  dietaryTags: string[];
  isAvailable: boolean;
};

export type MenuCategory = {
  id: string;
  name: string;
  items: MenuItem[];
};

export type GuestPageData = {
  restaurant: Restaurant;
  categories: MenuCategory[];
  tableId?: string | null;
  tableLabel?: string | null;
};

const demoRestaurantId = "00000000-0000-4000-8000-000000000001";

const demoRestaurant: Restaurant = {
  id: demoRestaurantId,
  slug: "juniper-and-rye",
  name: "Juniper & Rye",
  tagline: "A little slower. A lot more delicious.",
  description:
    "Season-led California cooking, natural wine, and the kind of evening you wish would last a little longer.",
  address: "4124 Piedmont Avenue",
  city: "Oakland, CA 94611",
  phone: "(510) 555-0142",
  hours: "Open today · 11:30 am – 10 pm",
  heroImage:
    "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1800&q=88",
  initials: "J&R",
  wifiSsid: "Juniper Guest",
  wifiPassword: "gatheraround",
  googleReviewUrl:
    "https://www.google.com/maps/search/?api=1&query=Juniper%20%26%20Rye%20Oakland%20CA",
  logoUrl: "",
  primaryColor: "#536543",
};

const demoCategories: MenuCategory[] = [
  {
    id: "to-start",
    name: "To start",
    items: [
      {
        id: "heirloom-tomatoes",
        name: "Heirloom tomatoes",
        description: "Whipped ricotta, basil oil, grilled sourdough",
        price: 16,
        imageUrl:
          "https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=900&q=82",
        dietaryTags: ["Vegetarian"],
        isAvailable: true,
      },
      {
        id: "crispy-artichokes",
        name: "Crispy artichokes",
        description: "Lemon aioli, pecorino, garden herbs",
        price: 14,
        imageUrl:
          "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=900&q=82",
        dietaryTags: ["Vegetarian", "Gluten free"],
        isAvailable: true,
      },
      {
        id: "wood-fired-carrots",
        name: "Wood-fired carrots",
        description: "Green harissa, toasted pistachio, labneh",
        price: 15,
        imageUrl:
          "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=900&q=82",
        dietaryTags: ["Vegetarian"],
        isAvailable: true,
      },
    ],
  },
  {
    id: "the-main-event",
    name: "The main event",
    items: [
      {
        id: "ricotta-gnocchi",
        name: "Ricotta gnocchi",
        description: "Wild mushrooms, sage brown butter, hazelnut",
        price: 28,
        imageUrl:
          "https://images.unsplash.com/photo-1551183053-bf91a1d81141?auto=format&fit=crop&w=900&q=82",
        dietaryTags: ["Vegetarian"],
        isAvailable: true,
      },
      {
        id: "roasted-salmon",
        name: "Roasted king salmon",
        description: "Spring peas, crispy potatoes, dill crème fraîche",
        price: 34,
        imageUrl:
          "https://images.unsplash.com/photo-1467003909585-2f8a72700288?auto=format&fit=crop&w=900&q=82",
        dietaryTags: ["Gluten free"],
        isAvailable: true,
      },
      {
        id: "steak-frites",
        name: "Steak frites",
        description: "Hanger steak, shoestring fries, green peppercorn",
        price: 38,
        imageUrl:
          "https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=900&q=82",
        dietaryTags: ["Gluten free"],
        isAvailable: true,
      },
    ],
  },
  {
    id: "something-sweet",
    name: "Something sweet",
    items: [
      {
        id: "olive-oil-cake",
        name: "Olive oil cake",
        description: "Macerated strawberries, vanilla cream",
        price: 12,
        imageUrl:
          "https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=900&q=82",
        dietaryTags: ["Vegetarian"],
        isAvailable: true,
      },
      {
        id: "dark-chocolate-tart",
        name: "Dark chocolate tart",
        description: "Flaky sea salt, crème fraîche",
        price: 13,
        imageUrl:
          "https://images.unsplash.com/photo-1551024506-0bccd828d307?auto=format&fit=crop&w=900&q=82",
        dietaryTags: ["Vegetarian"],
        isAvailable: true,
      },
    ],
  },
];

export async function getGuestPageData(
  slug: string,
): Promise<GuestPageData | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl && !supabaseAnonKey) {
    return slug === demoRestaurant.slug
      ? { restaurant: demoRestaurant, categories: demoCategories }
      : null;
  }

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Both NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be configured.",
    );
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: restaurantRow, error: restaurantError } = await supabase
    .from("restaurants")
    .select(
      "id, slug, name, tagline, description, address, city, phone, hours, hero_image, initials, wifi_ssid, wifi_password, google_review_url, logo_url, primary_color",
    )
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();

  if (restaurantError) {
    throw new Error(`Could not load restaurant: ${restaurantError.message}`);
  }

  if (!restaurantRow) {
    return null;
  }

  const { data: categoryRows, error: categoriesError } = await supabase
    .from("menu_categories")
    .select("id, name, sort_order")
    .eq("restaurant_id", restaurantRow.id)
    .order("sort_order", { ascending: true });

  if (categoriesError) {
    throw new Error(`Could not load menu categories: ${categoriesError.message}`);
  }

  const { data: itemRows, error: itemsError } = await supabase
    .from("menu_items")
    .select(
      "id, category_id, name, description, price, image_url, dietary_tags, is_available, sort_order",
    )
    .eq("restaurant_id", restaurantRow.id)
    .order("sort_order", { ascending: true });

  if (itemsError) {
    throw new Error(`Could not load menu items: ${itemsError.message}`);
  }

  const categories = (categoryRows ?? []).map((category) => ({
    id: category.id,
    name: category.name,
    items: (itemRows ?? [])
      .filter((item) => item.category_id === category.id)
      .map((item) => ({
        id: item.id,
        name: item.name,
        description: item.description,
        price: Number(item.price),
        imageUrl: item.image_url ?? "",
        dietaryTags: item.dietary_tags ?? [],
        isAvailable: item.is_available,
      })),
  }));

  return {
    restaurant: {
      id: restaurantRow.id,
      slug: restaurantRow.slug,
      name: restaurantRow.name,
      tagline: restaurantRow.tagline,
      description: restaurantRow.description,
      address: restaurantRow.address,
      city: restaurantRow.city,
      phone: restaurantRow.phone,
      hours: restaurantRow.hours,
      heroImage: restaurantRow.hero_image,
      initials: restaurantRow.initials,
      wifiSsid: restaurantRow.wifi_ssid ?? "",
      wifiPassword: restaurantRow.wifi_password ?? "",
      googleReviewUrl:
        restaurantRow.google_review_url ||
        `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${restaurantRow.name} ${restaurantRow.address} ${restaurantRow.city}`)}`,
      logoUrl: restaurantRow.logo_url ?? "",
      primaryColor: restaurantRow.primary_color ?? "#536543",
    },
    categories,
  };
}

export async function getTableGuestPageData(
  code: string,
): Promise<GuestPageData | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl && !supabaseAnonKey) return null;
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Both NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be configured.",
    );
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: table, error } = await supabase
    .from("tables")
    .select("id, table_number, restaurant_id")
    .eq("unique_code", code)
    .eq("is_active", true)
    .maybeSingle();

  if (error) throw new Error(`Could not load table: ${error.message}`);
  if (!table) return null;

  const { data: restaurant, error: restaurantError } = await supabase
    .from("restaurants")
    .select("slug")
    .eq("id", table.restaurant_id)
    .eq("is_published", true)
    .maybeSingle();
  if (restaurantError) {
    throw new Error(`Could not load table restaurant: ${restaurantError.message}`);
  }
  if (!restaurant) return null;

  const page = await getGuestPageData(restaurant.slug);
  if (!page) return null;
  return {
    ...page,
    tableId: table.id,
    tableLabel: table.table_number,
  };
}
