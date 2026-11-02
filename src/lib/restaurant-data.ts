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
  wifiName?: string | null;
  wifiSsid: string;
  wifiPassword: string;
  enableWifi?: boolean;
  enableCallWaiter?: boolean;
  enableRequestBill?: boolean;
  googleReviewUrl: string;
  logoUrl: string;
  primaryColor: string;
  secondaryColor?: string;
  instagramUrl?: string;
  enableMenu?: boolean;
  enableOrdering?: boolean;
  enableFeedback?: boolean;
  enableGoogleReviews?: boolean;
  loyaltyEnabled: boolean;
  loyaltyType?: "stamps" | "points";
  loyaltyRewardGoal: number;
  loyaltyRewardDescription?: string;
  loyaltyPointsPerAmount?: number;
  loyaltyPointsGoal?: number;
  kitchenPin?: string;
  enableReservations?: boolean;
};

export type MenuItem = {
  id: string;
  name: string;
  description: string;
  price: number;
  pricingVariants?: { name: string; price: number }[];
  imageUrl: string;
  dietaryTags: string[];
  isAvailable: boolean;
};

export type MenuCategory = {
  id: string;
  name: string;
  icon?: string;
  imageUrl?: string;
  items: MenuItem[];
};

export type GuestPageData = {
  restaurant: Restaurant;
  categories: MenuCategory[];
  tableId?: string | null;
  tableCode?: string | null;
  tableLabel?: string | null;
};

export type DemoTableConfig = {
  code: string;
  tableLabel: string;
  restaurantSlug: string;
};

export const demoRestaurants: Record<string, { restaurant: Restaurant; categories: MenuCategory[] }> = {
  "juniper-and-rye": {
    restaurant: {
      id: "00000000-0000-4000-8000-000000000001",
      slug: "juniper-and-rye",
      name: "Juniper & Rye",
      tagline: "European Cafe & Specialty Coffee",
      description: "Artisan sourdough, wood-fired plates, and specialty coffee in the heart of Civil Lines.",
      address: "Civil Lines, Near Raj Bhavan",
      city: "Raipur, Chhattisgarh",
      phone: "+91 98271 23456",
      hours: "Open daily · 8:30 am – 11:00 pm",
      heroImage: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80",
      initials: "J&R",
      wifiName: "Juniper_Guest_WiFi",
      wifiSsid: "Juniper_Guest_WiFi",
      wifiPassword: "gatheraround",
      enableWifi: true,
      enableCallWaiter: true,
      enableRequestBill: true,
      googleReviewUrl: "https://maps.google.com/?q=Juniper+Rye+Civil+Lines+Raipur",
      logoUrl: "",
      primaryColor: "#722F37",
      secondaryColor: "#B7A89A",
      instagramUrl: "https://instagram.com/juniperandrye",
      enableMenu: true,
      enableOrdering: true,
      enableFeedback: true,
      enableGoogleReviews: true,
      loyaltyEnabled: true,
      loyaltyType: "stamps",
      loyaltyRewardGoal: 5,
      loyaltyRewardDescription: "Complimentary Cold Brew or Basque Cheesecake",
      loyaltyPointsPerAmount: 10,
      loyaltyPointsGoal: 100,
    },
    categories: [
      {
        id: "jr-coffee",
        name: "Coffee & Beverages",
        icon: "coffee",
        items: [
          {
            id: "jr-c1",
            name: "Classic Cold Brew",
            description: "16-hour slow steeped Chikmagalur roast served over hand-cut ice",
            price: 189,
            imageUrl: "https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&w=600&q=80",
            dietaryTags: ["Veg", "Bestseller"],
            isAvailable: true,
          },
          {
            id: "jr-c2",
            name: "Spanish Iced Latte",
            description: "Double shot espresso, condensed milk, chilled textured milk",
            price: 219,
            imageUrl: "https://images.unsplash.com/photo-1541167760496-1628856ab772?auto=format&fit=crop&w=600&q=80",
            dietaryTags: ["Veg"],
            isAvailable: true,
          },
          {
            id: "jr-c3",
            name: "Peach & Mint Iced Tea",
            description: "Brewed black tea with wild peach reduction and garden fresh mint",
            price: 169,
            imageUrl: "https://images.unsplash.com/photo-1499638673689-79a0b5115d87?auto=format&fit=crop&w=600&q=80",
            dietaryTags: ["Veg"],
            isAvailable: true,
          },
        ],
      },
      {
        id: "jr-small-plates",
        name: "Small Plates & Starters",
        items: [
          {
            id: "jr-s1",
            name: "Truffle Parmesan Fries",
            description: "Hand-cut potato fries, white truffle oil, grated aged parmesan, garlic dip",
            price: 229,
            imageUrl: "https://images.unsplash.com/photo-1576107232684-1279f3908594?auto=format&fit=crop&w=600&q=80",
            dietaryTags: ["Veg", "Bestseller"],
            isAvailable: true,
          },
          {
            id: "jr-s2",
            name: "Whipped Ricotta Sourdough",
            description: "House-baked sourdough, whipped ricotta, heirloom cherry tomatoes, basil oil",
            price: 269,
            imageUrl: "https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=600&q=80",
            dietaryTags: ["Veg"],
            isAvailable: true,
          },
          {
            id: "jr-s3",
            name: "Crispy Peri Peri Chicken Poppers",
            description: "Tender chicken bites with spiced crunchy coating and smoked chipotle mayo",
            price: 289,
            imageUrl: "https://images.unsplash.com/photo-1562967914-608f82629710?auto=format&fit=crop&w=600&q=80",
            dietaryTags: ["Non-Veg", "Spicy"],
            isAvailable: true,
          },
        ],
      },
      {
        id: "jr-mains",
        name: "Artisan Pizzas & Mains",
        items: [
          {
            id: "jr-m1",
            name: "Wild Mushroom Gnocchi",
            description: "Pan-seared potato gnocchi, roasted forest mushrooms, sage butter & toasted hazelnut",
            price: 349,
            imageUrl: "https://images.unsplash.com/photo-1551183053-bf91a1d81141?auto=format&fit=crop&w=600&q=80",
            dietaryTags: ["Veg", "Chef's Special"],
            isAvailable: true,
          },
          {
            id: "jr-m2",
            name: "Classic Burrata & Pesto Pizza",
            description: "Wood-fired crust, San Marzano tomato sauce, fresh burrata, basil pesto swirl",
            price: 449,
            imageUrl: "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=600&q=80",
            dietaryTags: ["Veg", "Bestseller"],
            isAvailable: true,
          },
          {
            id: "jr-m3",
            name: "Herb Crusted Grilled Chicken",
            description: "Rosemary marinated chicken breast, creamy mashed potatoes, grilled butter veggies",
            price: 399,
            imageUrl: "https://images.unsplash.com/photo-1532550907401-a500c9a57435?auto=format&fit=crop&w=600&q=80",
            dietaryTags: ["Non-Veg"],
            isAvailable: true,
          },
        ],
      },
      {
        id: "jr-desserts",
        name: "Desserts",
        items: [
          {
            id: "jr-d1",
            name: "San Sebastian Cheesecake",
            description: "Burnt basque style creamy cheesecake topped with dark Belgian chocolate ganache",
            price: 249,
            imageUrl: "https://images.unsplash.com/photo-1533134242443-d4fd215305ad?auto=format&fit=crop&w=600&q=80",
            dietaryTags: ["Veg", "Bestseller"],
            isAvailable: true,
          },
          {
            id: "jr-d2",
            name: "Dark Chocolate Tart",
            description: "70% single origin cocoa tart with flaky sea salt and vanilla bean cream",
            price: 199,
            imageUrl: "https://images.unsplash.com/photo-1551024506-0bccd828d307?auto=format&fit=crop&w=600&q=80",
            dietaryTags: ["Veg"],
            isAvailable: true,
          },
        ],
      },
    ],
  },
  "chai-and-chutney": {
    restaurant: {
      id: "00000000-0000-4000-8000-000000000002",
      slug: "chai-and-chutney",
      name: "Chai & Chutney Bistro",
      tagline: "Modern Indian Street Kitchen & Chai Bar",
      description: "Desi street flavors reimagined with clay kulhad chai, crunchy chaat, and butter-dripping kulchas in Shankar Nagar.",
      address: "VIP Chowk, Shankar Nagar",
      city: "Raipur, Chhattisgarh",
      phone: "+91 97555 67890",
      hours: "Open daily · 10:00 am – 11:30 pm",
      heroImage: "https://images.unsplash.com/photo-1552566626-52f8b828add9?auto=format&fit=crop&w=1200&q=80",
      initials: "C&C",
      wifiName: "Chai_Chutney_5G",
      wifiSsid: "ChaiChutney_Guest",
      wifiPassword: "chaiislove",
      enableWifi: true,
      enableCallWaiter: true,
      enableRequestBill: true,
      googleReviewUrl: "https://maps.google.com/?q=Chai+Chutney+Bistro+Shankar+Nagar+Raipur",
      logoUrl: "",
      primaryColor: "#C84B16",
      loyaltyEnabled: true,
      loyaltyRewardGoal: 5,
    },
    categories: [
      {
        id: "cc-chai",
        name: "Artisanal Chais & Coolers",
        items: [
          {
            id: "cc-c1",
            name: "Special Kulhad Adrak Elaichi Chai",
            description: "Slow-brewed Assam tea with freshly crushed ginger, green cardamom and buffalo milk",
            price: 69,
            imageUrl: "https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=600&q=80",
            dietaryTags: ["Veg", "Bestseller"],
            isAvailable: true,
          },
          {
            id: "cc-c2",
            name: "Kesar Pista Badam Milk",
            description: "Rich chilled milk infused with Kashmiri saffron strands, chopped pistachios and almonds",
            price: 129,
            imageUrl: "https://images.unsplash.com/photo-1571115177098-24ec42ed204d?auto=format&fit=crop&w=600&q=80",
            dietaryTags: ["Veg"],
            isAvailable: true,
          },
          {
            id: "cc-c3",
            name: "Raipur Masala Shikanji",
            description: "Fizzy lime cooler with roasted cumin, rock salt, mint and ginger crush",
            price: 89,
            imageUrl: "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=600&q=80",
            dietaryTags: ["Veg"],
            isAvailable: true,
          },
        ],
      },
      {
        id: "cc-chaat",
        name: "Chaat & Street Starters",
        items: [
          {
            id: "cc-s1",
            name: "Dahi Puri Bomb Platter",
            description: "Crispy puris filled with potato mash, sweetened hung curd, date-tamarind & spicy coriander chutney",
            price: 149,
            imageUrl: "https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=600&q=80",
            dietaryTags: ["Veg", "Bestseller"],
            isAvailable: true,
          },
          {
            id: "cc-s2",
            name: "Kurkure Cheese Momos",
            description: "6 pieces of crunchy cornflake-crusted steamed dumplings filled with melting mozzarella & veggies",
            price: 189,
            imageUrl: "https://images.unsplash.com/photo-1625220194771-7ebdea0b70b9?auto=format&fit=crop&w=600&q=80",
            dietaryTags: ["Veg", "Spicy"],
            isAvailable: true,
          },
          {
            id: "cc-s3",
            name: "Tandoori Chicken Tikka Roll",
            description: "Charcoal roasted smoky chicken tikka rolled in flaky butter paratha with mint mayo",
            price: 219,
            imageUrl: "https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?auto=format&fit=crop&w=600&q=80",
            dietaryTags: ["Non-Veg", "Spicy"],
            isAvailable: true,
          },
        ],
      },
      {
        id: "cc-kulchas",
        name: "Stuffed Kulcha Platters",
        items: [
          {
            id: "cc-k1",
            name: "Amritsari Paneer Stuffed Kulcha",
            description: "Crispy clay oven tandoor kulcha stuffed with spiced paneer, served with spicy pindi chole and tamarind dip",
            price: 229,
            imageUrl: "https://images.unsplash.com/photo-1565557623262-b51c2513a641?auto=format&fit=crop&w=600&q=80",
            dietaryTags: ["Veg", "Bestseller"],
            isAvailable: true,
          },
          {
            id: "cc-k2",
            name: "Dal Makhani & Butter Naan Combo",
            description: "18-hour slow cooked creamy black lentils served with hot butter garlic naan and laccha onions",
            price: 249,
            imageUrl: "https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=600&q=80",
            dietaryTags: ["Veg"],
            isAvailable: true,
          },
        ],
      },
      {
        id: "cc-sweets",
        name: "Sweet Finishes",
        items: [
          {
            id: "cc-d1",
            name: "Hot Gulab Jamun with Rabri",
            description: "Pair of melt-in-mouth mawa gulab jamuns drenched in rose syrup and layered with chilled malai rabri",
            price: 139,
            imageUrl: "https://images.unsplash.com/photo-1541781774459-bb2af2f05b55?auto=format&fit=crop&w=600&q=80",
            dietaryTags: ["Veg", "Bestseller"],
            isAvailable: true,
          },
        ],
      },
    ],
  },
  "the-royal-feast": {
    restaurant: {
      id: "00000000-0000-4000-8000-000000000003",
      slug: "the-royal-feast",
      name: "The Royal Feast",
      tagline: "Authentic Mughlai & Charcoal Tandoor Fine Dine",
      description: "Grand Awadhi recipes, slow-cooked handi curries and aromatic dum biryanis on VIP Road, Raipur.",
      address: "VIP Road, Near Magneto Mall",
      city: "Raipur, Chhattisgarh",
      phone: "+91 94252 89012",
      hours: "Open daily · 12:00 pm – 11:30 pm",
      heroImage: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80",
      initials: "TRF",
      wifiName: "RoyalFeast_VIP",
      wifiSsid: "RoyalFeast_VIP",
      wifiPassword: "royalhospitality",
      enableWifi: true,
      enableCallWaiter: true,
      enableRequestBill: true,
      googleReviewUrl: "https://maps.google.com/?q=The+Royal+Feast+VIP+Road+Raipur",
      logoUrl: "",
      primaryColor: "#7B113A",
      loyaltyEnabled: true,
      loyaltyRewardGoal: 5,
    },
    categories: [
      {
        id: "rf-tandoor",
        name: "Royal Tandoori Starters",
        items: [
          {
            id: "rf-t1",
            name: "Paneer Tikka Angara",
            description: "Charcoal smoked cottage cheese cubes marinated in fiery Mathania chili paste and mustard oil",
            price: 319,
            imageUrl: "https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?auto=format&fit=crop&w=600&q=80",
            dietaryTags: ["Veg", "Spicy", "Bestseller"],
            isAvailable: true,
          },
          {
            id: "rf-t2",
            name: "Dahi Ke Kebab",
            description: "Golden fried hung yogurt patties infused with roasted cumin, green chilies and fresh coriander",
            price: 289,
            imageUrl: "https://images.unsplash.com/photo-1541544741938-0af808871cc0?auto=format&fit=crop&w=600&q=80",
            dietaryTags: ["Veg"],
            isAvailable: true,
          },
          {
            id: "rf-t3",
            name: "Bhatti Da Murgh Tikka",
            description: "Boneless chicken thigh chunks char-grilled with rustic whole spices, lemon juice and butter",
            price: 369,
            imageUrl: "https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?auto=format&fit=crop&w=600&q=80",
            dietaryTags: ["Non-Veg", "Spicy", "Chef's Special"],
            isAvailable: true,
          },
        ],
      },
      {
        id: "rf-biryani",
        name: "Dum Biryani & Rice",
        items: [
          {
            id: "rf-b1",
            name: "Awadhi Dum Gosht Biryani",
            description: "Aged long-grain basmati rice and tender mutton pieces dum cooked in sealed handi with saffron and kewra",
            price: 469,
            imageUrl: "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=600&q=80",
            dietaryTags: ["Non-Veg", "Bestseller"],
            isAvailable: true,
          },
          {
            id: "rf-b2",
            name: "Subz Shahi Paneer Biryani",
            description: "Fragrant basmati cooked with spiced vegetables, marinated paneer cubes, fried onions and fresh mint",
            price: 349,
            imageUrl: "https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=600&q=80",
            dietaryTags: ["Veg"],
            isAvailable: true,
          },
        ],
      },
      {
        id: "rf-curry",
        name: "Rich Handi Curries",
        items: [
          {
            id: "rf-c1",
            name: "Murgh Tikka Butter Masala",
            description: "Tandoor roasted chicken tikka folded into rich velvet tomato gravy laced with butter and kasuri methi",
            price: 399,
            imageUrl: "https://images.unsplash.com/photo-1588166524941-3bf61a9c41db?auto=format&fit=crop&w=600&q=80",
            dietaryTags: ["Non-Veg", "Bestseller"],
            isAvailable: true,
          },
          {
            id: "rf-c2",
            name: "Paneer Khas Khas Malai",
            description: "Fresh cottage cheese in smooth white cashew and poppy seed gravy, finished with cardamom aroma",
            price: 359,
            imageUrl: "https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=600&q=80",
            dietaryTags: ["Veg", "Chef's Special"],
            isAvailable: true,
          },
        ],
      },
    ],
  },
};

export const demoTables: DemoTableConfig[] = [
  // Juniper & Rye
  { code: "demo-juniper-t1", tableLabel: "Table 1", restaurantSlug: "juniper-and-rye" },
  { code: "demo-juniper-t2", tableLabel: "Table 2", restaurantSlug: "juniper-and-rye" },
  { code: "demo-juniper-t4", tableLabel: "Table 4", restaurantSlug: "juniper-and-rye" },
  { code: "demo-juniper-t5", tableLabel: "Table 5", restaurantSlug: "juniper-and-rye" },
  // Chai & Chutney
  { code: "demo-chai-t1", tableLabel: "Table 1", restaurantSlug: "chai-and-chutney" },
  { code: "demo-chai-t3", tableLabel: "Table 3", restaurantSlug: "chai-and-chutney" },
  { code: "demo-chai-t5", tableLabel: "Table 5", restaurantSlug: "chai-and-chutney" },
  { code: "demo-chai-t7", tableLabel: "Table 7", restaurantSlug: "chai-and-chutney" },
  // The Royal Feast
  { code: "demo-royal-t2", tableLabel: "Table 2", restaurantSlug: "the-royal-feast" },
  { code: "demo-royal-t5", tableLabel: "Table 5", restaurantSlug: "the-royal-feast" },
  { code: "demo-royal-t8", tableLabel: "Table 8", restaurantSlug: "the-royal-feast" },
  { code: "demo-royal-t10", tableLabel: "Table 10", restaurantSlug: "the-royal-feast" },
  // Universal aliases
  { code: "table01", tableLabel: "Table 1", restaurantSlug: "juniper-and-rye" },
  { code: "table04", tableLabel: "Table 4", restaurantSlug: "juniper-and-rye" },
  { code: "table12", tableLabel: "Table 12", restaurantSlug: "juniper-and-rye" },
];

export function getAllDemoRestaurants() {
  return Object.values(demoRestaurants).map((entry) => entry.restaurant);
}

export async function getGuestPageData(
  slug: string,
): Promise<GuestPageData | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    const demo = demoRestaurants[slug] ?? demoRestaurants["juniper-and-rye"];
    return demo ? { restaurant: demo.restaurant, categories: demo.categories } : null;
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: restaurantRow, error: restaurantError } = await supabase
    .from("restaurants")
    .select(
      "id, slug, name, tagline, description, address, city, phone, hours, hero_image, initials, wifi_name, wifi_ssid, wifi_password, enable_call_waiter, enable_request_bill, enable_wifi, enable_menu, enable_ordering, enable_feedback, enable_google_reviews, secondary_color, instagram_url, google_review_url, logo_url, primary_color, loyalty_enabled, loyalty_type, loyalty_reward_goal, loyalty_reward_description, loyalty_points_per_amount, loyalty_points_goal",
    )
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();

  if (restaurantError) {
    console.warn(`Could not load restaurant from DB (${restaurantError.message}). Falling back to demo data.`);
    const fallback = demoRestaurants[slug];
    return fallback ? { restaurant: fallback.restaurant, categories: fallback.categories } : null;
  }

  if (!restaurantRow) {
    const fallback = demoRestaurants[slug];
    return fallback ? { restaurant: fallback.restaurant, categories: fallback.categories } : null;
  }

  // Resilient category query: try menu_categories, fall back to categories
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let { data: categoryRows, error: categoriesError } = await (supabase as any)
    .from("menu_categories")
    .select("id, name, icon, image_url, sort_order")
    .eq("restaurant_id", restaurantRow.id)
    .order("sort_order", { ascending: true });

  if (categoriesError) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fallbackCat = await (supabase as any)
      .from("categories")
      .select("id, name, sort_order")
      .eq("restaurant_id", restaurantRow.id)
      .order("sort_order", { ascending: true });

    if (!fallbackCat.error) {
      categoryRows = fallbackCat.data;
      categoriesError = null;
    }
  }

  if (categoriesError) {
    console.warn(`Could not load categories (${categoriesError.message}). Using empty categories.`);
    categoryRows = [];
  }

  const { data: itemRows, error: itemsError } = await supabase
    .from("menu_items")
    .select(
      "id, category_id, name, description, price, pricing_variants, image_url, dietary_tags, is_available, sort_order",
    )
    .eq("restaurant_id", restaurantRow.id)
    .order("sort_order", { ascending: true });

  if (itemsError) {
    throw new Error(`Could not load menu items: ${itemsError.message}`);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const categories = (categoryRows ?? []).map((category: any) => ({
    id: category.id,
    name: category.name,
    icon: category.icon ?? undefined,
    imageUrl: category.image_url ?? undefined,
    items: (itemRows ?? [])
      .filter((item) => item.category_id === category.id)
      .map((item) => ({
        id: item.id,
        name: item.name,
        description: item.description,
        price: Number(item.price),
        pricingVariants: (item.pricing_variants as { name: string; price: number }[]) ?? undefined,
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
      city: restaurantRow.city || "Raipur, Chhattisgarh",
      phone: restaurantRow.phone,
      hours: restaurantRow.hours,
      heroImage: restaurantRow.hero_image,
      initials: restaurantRow.initials,
      wifiName: restaurantRow.wifi_name ?? restaurantRow.wifi_ssid ?? "",
      wifiSsid: restaurantRow.wifi_name ?? restaurantRow.wifi_ssid ?? "",
      wifiPassword: restaurantRow.wifi_password ?? "",
      enableWifi: restaurantRow.enable_wifi ?? true,
      enableCallWaiter: restaurantRow.enable_call_waiter ?? true,
      enableRequestBill: restaurantRow.enable_request_bill ?? true,
      enableMenu: restaurantRow.enable_menu ?? true,
      enableOrdering: restaurantRow.enable_ordering ?? true,
      enableFeedback: restaurantRow.enable_feedback ?? true,
      enableGoogleReviews: restaurantRow.enable_google_reviews ?? true,
      googleReviewUrl:
        restaurantRow.google_review_url ||
        `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${restaurantRow.name} ${restaurantRow.address} ${restaurantRow.city}`)}`,
      logoUrl: restaurantRow.logo_url ?? "",
      primaryColor: restaurantRow.primary_color ?? "#722F37",
      secondaryColor: restaurantRow.secondary_color ?? "#B7A89A",
      instagramUrl: restaurantRow.instagram_url ?? "",
      loyaltyEnabled: restaurantRow.loyalty_enabled ?? true,
      loyaltyType: (restaurantRow.loyalty_type as "stamps" | "points") || "stamps",
      loyaltyRewardGoal: restaurantRow.loyalty_reward_goal ?? 5,
      loyaltyRewardDescription: restaurantRow.loyalty_reward_description ?? "Complimentary treat",
      loyaltyPointsPerAmount: restaurantRow.loyalty_points_per_amount ?? 10,
      loyaltyPointsGoal: restaurantRow.loyalty_points_goal ?? 100,
      enableReservations: (restaurantRow as Record<string, unknown>).enable_reservations !== false,
    },
    categories,
  };
}

export async function getTableGuestPageData(
  code: string,
): Promise<GuestPageData | null> {
  const normalizedCode = code.trim();
  const demoMatch = demoTables.find((table) => table.code === normalizedCode);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    if (demoMatch) {
      const pageData = await getGuestPageData(demoMatch.restaurantSlug);
      if (!pageData) return null;
      return {
        ...pageData,
        tableId: `00000000-0000-4000-8000-${normalizedCode.replace(/[^0-9]/g, "").padStart(12, "0").slice(-12) || "000000000004"}`,
        tableCode: normalizedCode,
        tableLabel: demoMatch.tableLabel,
      };
    }
    // Fallback if random code
    const pageData = await getGuestPageData("juniper-and-rye");
    if (!pageData) return null;
    return {
      ...pageData,
      tableId: "00000000-0000-4000-8000-000000000004",
      tableCode: normalizedCode,
      tableLabel: "Table 4",
    };
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: table, error } = await supabase
    .from("tables")
    .select("id, table_number, restaurant_id")
    .eq("unique_code", normalizedCode)
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    console.warn(`Could not load table from database: ${error.message}`);
  }

  if (!table) {
    if (demoMatch) {
      const pageData = await getGuestPageData(demoMatch.restaurantSlug);
      if (!pageData) return null;
      return {
        ...pageData,
        tableId: `00000000-0000-4000-8000-${normalizedCode.replace(/[^0-9]/g, "").padStart(12, "0").slice(-12) || "000000000004"}`,
        tableCode: normalizedCode,
        tableLabel: demoMatch.tableLabel,
      };
    }
    return null;
  }

  const { data: restaurant, error: restaurantError } = await supabase
    .from("restaurants")
    .select("slug")
    .eq("id", table.restaurant_id)
    .eq("is_published", true)
    .maybeSingle();

  if (restaurantError || !restaurant) {
    return null;
  }

  const page = await getGuestPageData(restaurant.slug);
  if (!page) return null;
  return {
    ...page,
    tableId: table.id,
    tableCode: normalizedCode,
    tableLabel: table.table_number,
  };
}
