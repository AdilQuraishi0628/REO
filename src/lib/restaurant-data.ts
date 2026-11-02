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
  tableToken?: string | null;
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
      heroImage: "/images/venues/juniper-and-rye.svg",
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
      loyaltyRewardDescription: "Complimentary Flat White or Basque Cheesecake",
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
            name: "Flat White",
            description: "Double shot Chikmagalur espresso with silky steamed microfoam in a classic ceramic cup",
            price: 190,
            imageUrl: "/images/dishes/flat-white.svg",
            dietaryTags: ["Veg", "Dairy", "Bestseller"],
            isAvailable: true,
          },
          {
            id: "jr-c2",
            name: "Iced Vanilla Latte",
            description: "Double shot espresso, cold milk, and Madagascar vanilla bean syrup over hand-cut ice",
            price: 190,
            imageUrl: "/images/dishes/iced-vanilla-latte.svg",
            dietaryTags: ["Veg", "Dairy"],
            isAvailable: true,
          },
          {
            id: "jr-c3",
            name: "Classic Cold Brew",
            description: "16-hour slow steeped single-origin roast served chilled with orange peel essence",
            price: 189,
            imageUrl: "/images/dishes/classic-cold-brew.svg",
            dietaryTags: ["Veg"],
            isAvailable: true,
          },
        ],
      },
      {
        id: "jr-bakery",
        name: "Artisan Bakery & Pastries",
        items: [
          {
            id: "jr-b1",
            name: "Almond Butter Croissant",
            description: "Flaky twice-baked French butter croissant filled with velvety almond frangipane and toasted flakes",
            price: 180,
            imageUrl: "/images/dishes/almond-croissant.svg",
            dietaryTags: ["Veg", "Gluten", "Nuts", "Dairy", "Bestseller"],
            isAvailable: true,
          },
          {
            id: "jr-b2",
            name: "San Sebastian Cheesecake",
            description: "Burnt basque style creamy cheesecake with caramelized exterior and melted center",
            price: 249,
            imageUrl: "/images/dishes/basque-cheesecake.svg",
            dietaryTags: ["Veg", "Dairy", "Gluten"],
            isAvailable: true,
          },
          {
            id: "jr-b3",
            name: "Dark Chocolate Tart",
            description: "70% single origin cocoa ganache with flaky Maldon sea salt and vanilla bean cream",
            price: 199,
            imageUrl: "/images/dishes/chocolate-tart.svg",
            dietaryTags: ["Veg", "Dairy", "Gluten"],
            isAvailable: true,
          },
        ],
      },
      {
        id: "jr-savory",
        name: "Breakfast & Savory Plates",
        items: [
          {
            id: "jr-s1",
            name: "Sourdough Tartine",
            description: "House-baked artisan sourdough, smashed Haas avocado, blistered cherry tomatoes, feta and microgreens",
            price: 240,
            imageUrl: "/images/dishes/sourdough-tartine.svg",
            dietaryTags: ["Veg", "Gluten", "Dairy"],
            isAvailable: true,
          },
          {
            id: "jr-s2",
            name: "Truffle Parmesan Fries",
            description: "Hand-cut potato fries tossed in white truffle oil, grated aged parmesan, and roasted garlic dip",
            price: 220,
            imageUrl: "/images/dishes/truffle-fries.svg",
            dietaryTags: ["Veg", "Dairy", "Bestseller"],
            isAvailable: true,
          },
          {
            id: "jr-s3",
            name: "Wild Mushroom Gnocchi",
            description: "Pan-seared potato gnocchi, roasted forest mushrooms, sage brown butter and toasted hazelnuts",
            price: 349,
            imageUrl: "/images/dishes/mushroom-gnocchi.svg",
            dietaryTags: ["Veg", "Gluten", "Dairy", "Nuts", "Chef's Special"],
            isAvailable: true,
          },
          {
            id: "jr-s4",
            name: "Classic Burrata & Pesto Pizza",
            description: "Wood-fired fermented crust, San Marzano tomato sauce, fresh burrata sphere, and basil pesto swirl",
            price: 449,
            imageUrl: "/images/dishes/burrata-pizza.svg",
            dietaryTags: ["Veg", "Gluten", "Dairy", "Bestseller"],
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
      heroImage: "/images/venues/chai-and-chutney.svg",
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
      loyaltyRewardDescription: "Complimentary Chai & Bun Maska or Kulfi",
    },
    categories: [
      {
        id: "cc-chai",
        name: "Artisanal Chais & Coolers",
        items: [
          {
            id: "cc-c1",
            name: "Special Kulhad Adrak Elaichi Chai",
            description: "Slow-brewed Assam tea with freshly crushed ginger, green cardamom and buffalo milk in clay pot",
            price: 69,
            imageUrl: "/images/dishes/kulhad-chai.svg",
            dietaryTags: ["Veg", "Dairy", "Bestseller"],
            isAvailable: true,
          },
          {
            id: "cc-c2",
            name: "Kesar Pista Badam Milk",
            description: "Rich chilled milk infused with Kashmiri saffron strands, chopped pistachios and crushed almonds",
            price: 129,
            imageUrl: "/images/dishes/kesar-milk.svg",
            dietaryTags: ["Veg", "Dairy", "Nuts"],
            isAvailable: true,
          },
          {
            id: "cc-c3",
            name: "Raipur Masala Shikanji",
            description: "Fizzy lime cooler with roasted cumin, rock salt, fresh mint and crushed ginger",
            price: 89,
            imageUrl: "/images/dishes/masala-shikanji.svg",
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
            imageUrl: "/images/dishes/dahi-puri.svg",
            dietaryTags: ["Veg", "Gluten", "Dairy", "Bestseller"],
            isAvailable: true,
          },
          {
            id: "cc-s2",
            name: "Kurkure Cheese Momos",
            description: "6 pieces of crunchy cornflake-crusted steamed dumplings filled with melting mozzarella & veggies",
            price: 189,
            imageUrl: "/images/dishes/cheese-momos.svg",
            dietaryTags: ["Veg", "Gluten", "Dairy", "Spicy"],
            isAvailable: true,
          },
        ],
      },
      {
        id: "cc-rolls",
        name: "Kathi Rolls & Street Eats",
        items: [
          {
            id: "cc-r1",
            name: "Tandoori Chicken Tikka Roll",
            description: "Charcoal roasted smoky chicken tikka rolled in flaky butter paratha with mint yoghurt dip and sliced onions",
            price: 219,
            imageUrl: "/images/dishes/chicken-tikka-roll.svg",
            dietaryTags: ["Non-Veg", "Gluten", "Dairy", "Spicy", "Bestseller"],
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
            imageUrl: "/images/dishes/paneer-kulcha.svg",
            dietaryTags: ["Veg", "Gluten", "Dairy", "Bestseller"],
            isAvailable: true,
          },
        ],
      },
      {
        id: "cc-combos",
        name: "Meals & Combos",
        items: [
          {
            id: "cc-m1",
            name: "Dal Makhani & Butter Naan Combo",
            description: "18-hour slow cooked creamy black lentils served with hot butter garlic naan, pickle and laccha onions",
            price: 249,
            imageUrl: "/images/dishes/dal-makhani.svg",
            dietaryTags: ["Veg", "Gluten", "Dairy", "Bestseller"],
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
            imageUrl: "/images/dishes/gulab-jamun.svg",
            dietaryTags: ["Veg", "Dairy", "Gluten", "Bestseller"],
            isAvailable: true,
          },
          {
            id: "cc-d2",
            name: "Kesar Malai Matka Kulfi",
            description: "Slow-churned rich creamy kulfi infused with saffron and crushed pistachios, served in an earthen clay pot",
            price: 149,
            imageUrl: "/images/dishes/malai-kulfi.svg",
            dietaryTags: ["Veg", "Dairy", "Nuts"],
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
      heroImage: "/images/venues/the-royal-feast.svg",
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
      loyaltyRewardDescription: "Complimentary Royal Shahi Tukda or Zafrani Phirni",
    },
    categories: [
      {
        id: "rf-drinks",
        name: "Royal Refreshers & Drinks",
        items: [
          {
            id: "rf-d1",
            name: "Shahi Gulab Sharbat",
            description: "Chilled organic rose petal syrup infused with basil seeds, fresh lemon juice and chilled spring water",
            price: 149,
            imageUrl: "/images/dishes/gulab-sharbat.svg",
            dietaryTags: ["Veg"],
            isAvailable: true,
          },
          {
            id: "rf-d2",
            name: "Kesaria Malai Lassi",
            description: "Thick hand-churned sweet yogurt flavored with Kashmiri saffron, green cardamom, topped with thick clotted malai",
            price: 169,
            imageUrl: "/images/dishes/kesar-lassi.svg",
            dietaryTags: ["Veg", "Dairy", "Nuts", "Bestseller"],
            isAvailable: true,
          },
        ],
      },
      {
        id: "rf-tandoor",
        name: "Royal Tandoori Starters",
        items: [
          {
            id: "rf-t1",
            name: "Paneer Tikka Angara",
            description: "Charcoal smoked cottage cheese cubes marinated in fiery Mathania chili paste, yoghurt and mustard oil",
            price: 319,
            imageUrl: "/images/dishes/paneer-tikka.svg",
            dietaryTags: ["Veg", "Dairy", "Spicy", "Bestseller"],
            isAvailable: true,
          },
          {
            id: "rf-t2",
            name: "Dahi Ke Kebab",
            description: "Golden fried hung yogurt patties infused with roasted cumin, green chilies and fresh coriander",
            price: 289,
            imageUrl: "/images/dishes/dahi-kebab.svg",
            dietaryTags: ["Veg", "Dairy", "Gluten"],
            isAvailable: true,
          },
          {
            id: "rf-t3",
            name: "Bhatti Da Murgh Tikka",
            description: "Boneless chicken thigh chunks char-grilled with rustic whole spices, lemon juice and butter",
            price: 369,
            imageUrl: "/images/dishes/murgh-tikka.svg",
            dietaryTags: ["Non-Veg", "Dairy", "Spicy", "Chef's Special"],
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
            imageUrl: "/images/dishes/mutton-biryani.svg",
            dietaryTags: ["Non-Veg", "Dairy", "Bestseller"],
            isAvailable: true,
          },
          {
            id: "rf-b2",
            name: "Subz Shahi Paneer Biryani",
            description: "Fragrant basmati cooked with spiced vegetables, marinated paneer cubes, fried onions and fresh mint",
            price: 349,
            imageUrl: "/images/dishes/subz-biryani.svg",
            dietaryTags: ["Veg", "Dairy"],
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
            imageUrl: "/images/dishes/butter-chicken.svg",
            dietaryTags: ["Non-Veg", "Dairy", "Bestseller"],
            isAvailable: true,
          },
          {
            id: "rf-c2",
            name: "Paneer Khas Khas Malai",
            description: "Fresh cottage cheese in smooth white cashew and poppy seed gravy, finished with cardamom aroma",
            price: 359,
            imageUrl: "/images/dishes/paneer-malai.svg",
            dietaryTags: ["Veg", "Dairy", "Nuts", "Chef's Special"],
            isAvailable: true,
          },
        ],
      },
      {
        id: "rf-breads",
        name: "Royal Tandoori Breads",
        items: [
          {
            id: "rf-br1",
            name: "Butter Garlic Naan",
            description: "Clay tandoor leavened bread brushed with garlic butter and fresh coriander",
            price: 89,
            imageUrl: "/images/dishes/garlic-naan.svg",
            dietaryTags: ["Veg", "Gluten", "Dairy", "Bestseller"],
            isAvailable: true,
          },
          {
            id: "rf-br2",
            name: "Mughlai Khamiri Roti",
            description: "Traditional yeast-fermented Awadhi bread baked to pillowy perfection",
            price: 79,
            imageUrl: "/images/dishes/khamiri-roti.svg",
            dietaryTags: ["Veg", "Gluten"],
            isAvailable: true,
          },
        ],
      },
      {
        id: "rf-desserts",
        name: "Royal Desserts",
        items: [
          {
            id: "rf-ds1",
            name: "Royal Shahi Tukda",
            description: "Ghee-crisped bread soaked in fragrant saffron syrup and coated with condensed rabri",
            price: 199,
            imageUrl: "/images/dishes/shahi-tukda.svg",
            dietaryTags: ["Veg", "Gluten", "Dairy", "Nuts", "Bestseller"],
            isAvailable: true,
          },
          {
            id: "rf-ds2",
            name: "Zafrani Matka Phirni",
            description: "Slow-cooked ground rice pudding flavored with pure saffron and almonds in an earthen pot",
            price: 179,
            imageUrl: "/images/dishes/zafrani-phirni.svg",
            dietaryTags: ["Veg", "Dairy", "Nuts"],
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
  { code: "demo-juniper-t12", tableLabel: "Table 12", restaurantSlug: "juniper-and-rye" },
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
