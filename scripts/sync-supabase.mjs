import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function sync() {
  console.log("Syncing Juniper & Rye in Supabase...");

  // 1. Update Juniper & Rye restaurant
  const { data: rest, error: restErr } = await supabase
    .from("restaurants")
    .update({
      tagline: "Specialty coffee & sourdough kitchen in Civil Lines",
      description: "Specialty coffee, slow sourdough tartines, artisanal pastries, and evening dining in Civil Lines, Raipur.",
      address: "Civil Lines, Near Raj Bhavan",
      city: "Raipur, Chhattisgarh 492001",
      phone: "+91 771 490 1234",
      hours: "Open today · 8:00 am – 11:00 pm",
      hero_image: "/images/venues/juniper-and-rye.svg",
      initials: "J&R",
      wifi_name: "Juniper_Guest_5G",
      wifi_ssid: "Juniper_Guest_5G",
      wifi_password: "civil-lines-coffee",
      enable_wifi: true,
      enable_call_waiter: true,
      enable_request_bill: true,
      enable_menu: true,
      enable_ordering: true,
      enable_feedback: true,
      enable_google_reviews: true,
      google_review_url: "https://www.google.com/maps/search/?api=1&query=Civil+Lines+Raipur+Cafe",
      primary_color: "#722F37",
      loyalty_enabled: true,
      loyalty_type: "stamps",
      loyalty_reward_goal: 5,
      loyalty_reward_description: "Free Flat White or Basque Cheesecake",
      loyalty_points_per_amount: 10,
      loyalty_points_goal: 100,
    })
    .eq("slug", "juniper-and-rye")
    .select();

  if (restErr) {
    console.error("Error updating restaurant:", restErr);
    return;
  }
  console.log("Updated restaurant:", rest[0]?.name, rest[0]?.city);

  const restaurantId = rest[0].id;

  // 2. Ensure tables exist
  const demoTablesToEnsure = [
    { code: "demo-juniper-t1", num: "Table 1" },
    { code: "demo-juniper-t2", num: "Table 2" },
    { code: "demo-juniper-t4", num: "Table 4" },
    { code: "demo-juniper-t5", num: "Table 5" },
    { code: "demo-juniper-t12", num: "Table 12" },
  ];

  for (const t of demoTablesToEnsure) {
    const { data: existing } = await supabase
      .from("tables")
      .select("id")
      .eq("unique_code", t.code)
      .maybeSingle();

    if (!existing) {
      const { error: insErr } = await supabase.from("tables").insert({
        restaurant_id: restaurantId,
        table_number: t.num,
        unique_code: t.code,
        is_active: true,
      });
      if (insErr) console.warn(`Could not insert table ${t.code}:`, insErr.message);
      else console.log(`Inserted table ${t.code}`);
    }
  }

  // 3. Sync Categories and Items
  // Delete existing old items and categories for a clean sync
  await supabase.from("menu_items").delete().eq("restaurant_id", restaurantId);
  await supabase.from("menu_categories").delete().eq("restaurant_id", restaurantId);

  const newCategories = [
    {
      id: "00000000-0000-4000-8000-000000000011",
      name: "Specialty Coffee & Teas",
      sort_order: 1,
      items: [
        {
          name: "Flat White",
          description: "Double ristretto, velvety steamed milk, poured microfoam.",
          price: 190,
          imageUrl: "/images/dishes/flat-white.svg",
          dietaryTags: ["Veg", "Dairy"],
        },
        {
          name: "Iced Vanilla Latte",
          description: "Slow-drip espresso over ice, Madagascar vanilla, cold whole milk.",
          price: 190,
          imageUrl: "/images/dishes/iced-latte.svg",
          dietaryTags: ["Veg", "Dairy"],
        },
        {
          name: "Pour Over (Chikmagalur Single Origin)",
          description: "Light roast with floral notes of jasmine and raw honey.",
          price: 210,
          imageUrl: "/images/dishes/pour-over.svg",
          dietaryTags: ["Veg"],
        },
        {
          name: "Kashmiri Kahwa",
          description: "Green tea steeped with saffron strands, whole cardamom, and shaved almonds.",
          price: 160,
          imageUrl: "/images/dishes/kashmiri-kahwa.svg",
          dietaryTags: ["Veg", "Nuts"],
        },
      ],
    },
    {
      id: "00000000-0000-4000-8000-000000000012",
      name: "Sourdough Tartines & Plates",
      sort_order: 2,
      items: [
        {
          name: "Sourdough Tartine",
          description: "Whipped herb ricotta, slow-roasted heritage tomatoes, basil oil.",
          price: 240,
          imageUrl: "/images/dishes/sourdough-tartine.svg",
          dietaryTags: ["Veg", "Dairy", "Gluten"],
        },
        {
          name: "Truffled Mushroom Brioche",
          description: "Pan-seared button mushrooms, garlic butter, and shaved parmesan.",
          price: 260,
          imageUrl: "/images/dishes/mushroom-brioche.svg",
          dietaryTags: ["Veg", "Dairy", "Gluten"],
        },
        {
          name: "Burrata & Heirloom Salad",
          description: "Locally sourced burrata, baby rocket, balsamic reduction, toasted pine nuts.",
          price: 280,
          imageUrl: "/images/dishes/burrata-salad.svg",
          dietaryTags: ["Veg", "Dairy", "Nuts"],
        },
        {
          name: "Wild Mushroom Risotto",
          description: "Arborio rice slowly cooked with porcini broth, butter, and thyme.",
          price: 320,
          imageUrl: "/images/dishes/mushroom-risotto.svg",
          dietaryTags: ["Veg", "Dairy"],
        },
      ],
    },
    {
      id: "00000000-0000-4000-8000-000000000013",
      name: "Bakes & Sweet Endings",
      sort_order: 3,
      items: [
        {
          name: "Almond Butter Croissant",
          description: "Twice-baked butter croissant filled with frangipane and flaked almonds.",
          price: 180,
          imageUrl: "/images/dishes/almond-croissant.svg",
          dietaryTags: ["Veg", "Dairy", "Gluten", "Nuts"],
        },
        {
          name: "Basque Cheesecake",
          description: "Caramelized crust with a silky, molten cream cheese center.",
          price: 210,
          imageUrl: "/images/dishes/basque-cheesecake.svg",
          dietaryTags: ["Veg", "Dairy", "Eggs"],
        },
        {
          name: "Dark Chocolate Tart",
          description: "70% Single origin bean ganache, sea salt flakes, cocoa crust.",
          price: 190,
          imageUrl: "/images/dishes/dark-chocolate-tart.svg",
          dietaryTags: ["Veg", "Dairy", "Gluten"],
        },
      ],
    },
  ];

  for (const cat of newCategories) {
    const { error: catErr } = await supabase.from("menu_categories").insert({
      id: cat.id,
      restaurant_id: restaurantId,
      name: cat.name,
      sort_order: cat.sort_order,
    });
    if (catErr) {
      console.error(`Cat error (${cat.name}):`, catErr.message);
      continue;
    }

    for (const item of cat.items) {
      const { error: itemErr } = await supabase.from("menu_items").insert({
        restaurant_id: restaurantId,
        category_id: cat.id,
        name: item.name,
        description: item.description,
        price: item.price,
        image_url: item.imageUrl,
        dietary_tags: item.dietaryTags,
        is_available: true,
      });
      if (itemErr) {
        console.error(`Item error (${item.name}):`, itemErr.message);
      }
    }
  }

  console.log("Successfully synced Juniper & Rye in Supabase!");
}

sync().catch(console.error);
