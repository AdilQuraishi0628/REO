"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import type { AdminRestaurant } from "@/lib/admin-auth";
import { useRealtimeChannel, type ChannelTableConfig } from "@/hooks/use-realtime-table";
import AdminReservationsSection from "@/components/admin-reservations-section";
import {
  AnalyticsSection,
  FeedbackAdminSection,
  LoyaltyAdminSection,
} from "@/components/admin-insights";
import {
  Icon,
  IconSettings,
  IconFilter,
  IconPlates,
  IconTable,
  IconStar,
  IconOrder,
  IconServed,
  IconStaff,
  IconEdit,
  IconDelete,
  IconClock,
  CategoryIcon,
} from "@/components/icons";

export type AdminDashboardData = {
  restaurant: {
    id: string;
    slug: string;
    name: string;
    description: string;
    tagline?: string;
    address: string;
    city: string;
    phone?: string | null;
    hero_image: string;
    logo_url: string | null;
    wifi_name?: string | null;
    wifi_ssid: string;
    wifi_password: string;
    enable_wifi?: boolean;
    enable_call_waiter?: boolean;
    enable_request_bill?: boolean;
    enable_menu?: boolean;
    enable_ordering?: boolean;
    enable_feedback?: boolean;
    enable_google_reviews?: boolean;
    google_review_url: string | null;
    instagram_url?: string | null;
    primary_color: string;
    secondary_color?: string | null;
    loyalty_enabled: boolean;
    loyalty_type?: "stamps" | "points";
    loyalty_reward_goal: number;
    loyalty_reward_description?: string | null;
    loyalty_points_per_amount?: number;
    loyalty_points_goal?: number;
    kitchen_pin?: string;
    enable_reservations?: boolean;
    reservation_opening_time?: string | null;
    reservation_closing_time?: string | null;
    reservation_slot_duration?: number | null;
    reservation_max_party_size?: number | null;
    reservation_max_days_advance?: number | null;
    reservation_auto_confirm?: boolean | null;
  };
  categories: {
    id: string;
    name: string;
    sort_order: number;
    icon?: string | null;
    image_url?: string | null;
  }[];
  items: {
    id: string;
    category_id: string;
    name: string;
    description: string;
    price: number;
    image_url: string | null;
    dietary_tags: string[];
    is_available: boolean;
    sort_order: number;
    pricing_variants?: { name: string; price: number }[];
  }[];
  feedback: {
    id: string;
    rating: number;
    comment: string | null;
    guest_name: string | null;
    table_label: string | null;
    review_prompted: boolean;
    resolved_at: string | null;
    created_at: string;
  }[];
  loyaltyMemberCount: number;
  links: {
    id: string;
    kind: "qr" | "nfc";
    token: string;
    table_label: string | null;
    created_at: string;
  }[];
  totalScans: number;
};

type AdminDashboardProps = {
  restaurants: AdminRestaurant[];
  userEmail: string;
};

type Section =
  | "profile"
  | "features"
  | "menu"
  | "tables"
  | "reservations"
  | "loyalty"
  | "reviews"
  | "overview"
  | "account";

const navItems: { id: Section; label: string; badge?: string }[] = [
  { id: "profile", label: "Restaurant Profile" },
  { id: "features", label: "Feature Toggles" },
  { id: "menu", label: "Menu Management" },
  { id: "tables", label: "Tables & QR" },
  { id: "reservations", label: "Table Reservations" },
  { id: "loyalty", label: "Loyalty Settings" },
  { id: "reviews", label: "Reviews & Feedback" },
  { id: "overview", label: "Analytics Overview" },
  { id: "account", label: "Account Settings" },
];

function getSectionIcon(id: Section) {
  switch (id) {
    case "profile":
      return <IconSettings size={17} />;
    case "features":
      return <IconFilter size={17} />;
    case "menu":
      return <IconPlates size={17} />;
    case "tables":
      return <IconTable size={17} />;
    case "reservations":
      return <IconClock size={17} />;
    case "loyalty":
      return <IconStar size={17} />;
    case "reviews":
      return <IconOrder size={17} />;
    case "overview":
      return <IconServed size={17} />;
    case "account":
      return <IconStaff size={17} />;
  }
}

const RAIPUR_AREAS = [
  "Civil Lines",
  "Shankar Nagar",
  "Telibandha (Marine Drive)",
  "VIP Road",
  "Devendra Nagar",
  "Pandri",
  "Samta Colony",
  "Tatibandh",
  "Katora Talab",
  "Pachpedi Naka",
];

const BRAND_COLOR_PALETTES = [
  { name: "Forest Green", hex: "#2E5A44" },
  { name: "Warm Terracotta", hex: "#C84B16" },
  { name: "Royal Maroon", hex: "#7B113A" },
  { name: "Ocean Teal", hex: "#0F4C5C" },
  { name: "Luxe Charcoal", hex: "#2B2D42" },
  { name: "Amber Saffron", hex: "#D97706" },
  { name: "Coffee Bronze", hex: "#6F4E37" },
  { name: "Midnight Navy", hex: "#1E293B" },
];

const SECONDARY_COLOR_PALETTES = [
  { name: "Warm Gold", hex: "#D4AF37" },
  { name: "Sage Cream", hex: "#C2D3C4" },
  { name: "Soft Coral", hex: "#F28482" },
  { name: "Sky Mist", hex: "#84A59D" },
  { name: "Sandy Beige", hex: "#F5F0E8" },
  { name: "Muted Lavender", hex: "#9D8189" },
];

const HERO_PRESETS = [
  {
    label: "Cafe / Bistro",
    url: "https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=1200&q=80",
  },
  {
    label: "Fine Dining",
    url: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80",
  },
  {
    label: "Lounge / Bar",
    url: "https://images.unsplash.com/photo-1578474846511-04ba529f0b88?auto=format&fit=crop&w=1200&q=80",
  },
  {
    label: "Rooftop / Patio",
    url: "https://images.unsplash.com/photo-1533777857889-4be7c70b33f7?auto=format&fit=crop&w=1200&q=80",
  },
];

const CATEGORY_ICON_PRESETS = [
  { label: "Coffee", icon: "coffee" },
  { label: "Tea", icon: "tea" },
  { label: "Bakery", icon: "bakery" },
  { label: "Cakes", icon: "cakes" },
  { label: "Bites & Burgers", icon: "bites" },
  { label: "Plates & Mains", icon: "plates" },
  { label: "Cold Drinks", icon: "cold" },
  { label: "Bowls & Soups", icon: "bowls" },
];

const MENU_TAG_PRESETS = [
  { label: "Veg", color: "#4A7C59" },
  { label: "Non-Veg", color: "#722F37" },
  { label: "Egg", color: "#C4A35A" },
  { label: "Spicy", color: "#8C4B52" },
  { label: "Bestseller", color: "#722F37" },
  { label: "Chef Special", color: "#5A252C" },
  { label: "Jain", color: "#4A7C59" },
];

async function parseResponse(response: Response) {
  const result: unknown = await response.json();
  if (response.ok) return result;
  const error =
    typeof result === "object" &&
    result !== null &&
    "error" in result &&
    typeof result.error === "string"
      ? result.error
      : "Something went wrong. Please try again.";
  throw new Error(error);
}

export default function AdminDashboard({
  restaurants,
  userEmail,
}: AdminDashboardProps) {
  const [section, setSection] = useState<Section>("profile");
  const [restaurantId, setRestaurantId] = useState(restaurants[0]?.id ?? "");
  const [data, setData] = useState<AdminDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  // Category and Item states
  const [categoryName, setCategoryName] = useState("");
  const [categoryIcon, setCategoryIcon] = useState("coffee");
  const [editingCategoryId, setEditingCategoryId] = useState("");
  const [itemId, setItemId] = useState("");
  const [itemForm, setItemForm] = useState({
    categoryId: "",
    name: "",
    description: "",
    price: "",
    imageUrl: "",
    dietaryTags: [] as string[],
    isAvailable: true,
    pricingVariants: [] as { name: string; price: number }[],
  });

  const loadData = useCallback(async () => {
    if (!restaurantId) return;
    setIsLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/${restaurantId}`, {
        cache: "no-store",
      });
      const nextData = (await parseResponse(response)) as AdminDashboardData;
      setData(nextData);
      setItemForm((current) => {
        const currentCategoryExists = nextData.categories.some(
          (category) => category.id === current.categoryId,
        );
        return {
          ...current,
          categoryId: currentCategoryExists
            ? current.categoryId
            : nextData.categories[0]?.id ?? "",
        };
      });
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load dashboard.");
    } finally {
      setIsLoading(false);
    }
  }, [restaurantId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // Multi-device live sync via Realtime channel
  const adminChannelConfigs = useMemo<ChannelTableConfig[]>(() => [
    {
      table: "menu_items",
      filter: `restaurant_id=eq.${restaurantId}`,
      onInsert: (payload) => {
        const item = payload as Record<string, unknown>;
        setData((prev) => {
          if (!prev) return prev;
          if (prev.items.some((i) => i.id === item.id)) return prev;
          return {
            ...prev,
            items: [
              ...prev.items,
              {
                id: String(item.id),
                category_id: String(item.category_id || ""),
                name: String(item.name || ""),
                description: String(item.description || ""),
                price: Number(item.price || 0),
                image_url: typeof item.image_url === "string" ? item.image_url : null,
                dietary_tags: Array.isArray(item.dietary_tags) ? (item.dietary_tags as string[]) : [],
                is_available: Boolean(item.is_available),
                sort_order: Number(item.sort_order || 0),
                pricing_variants: Array.isArray(item.pricing_variants)
                  ? (item.pricing_variants as { name: string; price: number }[])
                  : undefined,
              },
            ],
          };
        });
      },
      onUpdate: (payload) => {
        const item = payload as Record<string, unknown>;
        setData((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            items: prev.items.map((i) =>
              i.id === item.id
                ? {
                    ...i,
                    category_id: item.category_id !== undefined ? String(item.category_id) : i.category_id,
                    name: item.name !== undefined ? String(item.name) : i.name,
                    description: item.description !== undefined ? String(item.description || "") : i.description,
                    price: item.price !== undefined ? Number(item.price) : i.price,
                    image_url: item.image_url !== undefined ? (item.image_url as string | null) : i.image_url,
                    dietary_tags: Array.isArray(item.dietary_tags) ? (item.dietary_tags as string[]) : i.dietary_tags,
                    is_available: item.is_available !== undefined ? Boolean(item.is_available) : i.is_available,
                    sort_order: item.sort_order !== undefined ? Number(item.sort_order) : i.sort_order,
                    pricing_variants: Array.isArray(item.pricing_variants)
                      ? (item.pricing_variants as { name: string; price: number }[])
                      : i.pricing_variants,
                  }
                : i,
            ),
          };
        });
      },
      onDelete: (payload) => {
        const item = payload as Record<string, unknown>;
        setData((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            items: prev.items.filter((i) => i.id !== item.id),
          };
        });
      },
    },
    {
      table: "menu_categories",
      filter: `restaurant_id=eq.${restaurantId}`,
      onInsert: (payload) => {
        const cat = payload as Record<string, unknown>;
        setData((prev) => {
          if (!prev) return prev;
          if (prev.categories.some((c) => c.id === cat.id)) return prev;
          return {
            ...prev,
            categories: [
              ...prev.categories,
              {
                id: String(cat.id),
                name: String(cat.name || ""),
                sort_order: Number(cat.sort_order || 0),
                icon: typeof cat.icon === "string" ? cat.icon : null,
                image_url: typeof cat.image_url === "string" ? cat.image_url : null,
              },
            ],
          };
        });
      },
      onUpdate: (payload) => {
        const cat = payload as Record<string, unknown>;
        setData((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            categories: prev.categories.map((c) =>
              c.id === cat.id
                ? {
                    ...c,
                    name: cat.name !== undefined ? String(cat.name) : c.name,
                    sort_order: cat.sort_order !== undefined ? Number(cat.sort_order) : c.sort_order,
                    icon: cat.icon !== undefined ? (cat.icon as string | null) : c.icon,
                    image_url: cat.image_url !== undefined ? (cat.image_url as string | null) : c.image_url,
                  }
                : c,
            ),
          };
        });
      },
      onDelete: (payload) => {
        const cat = payload as Record<string, unknown>;
        setData((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            categories: prev.categories.filter((c) => c.id !== cat.id),
          };
        });
      },
    },
    {
      table: "restaurants",
      filter: `id=eq.${restaurantId}`,
      onUpdate: (payload) => {
        const r = payload as Record<string, unknown>;
        setData((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            restaurant: {
              ...prev.restaurant,
              name: typeof r.name === "string" ? r.name : prev.restaurant.name,
              tagline: typeof r.tagline === "string" ? r.tagline : prev.restaurant.tagline,
              description: typeof r.description === "string" ? r.description : prev.restaurant.description,
              hero_image: typeof r.hero_image === "string" ? r.hero_image : prev.restaurant.hero_image,
              logo_url: typeof r.logo_url === "string" ? r.logo_url : prev.restaurant.logo_url,
              wifi_name: typeof r.wifi_name === "string" ? r.wifi_name : prev.restaurant.wifi_name,
              wifi_ssid: typeof r.wifi_ssid === "string" ? r.wifi_ssid : prev.restaurant.wifi_ssid,
              wifi_password: typeof r.wifi_password === "string" ? r.wifi_password : prev.restaurant.wifi_password,
              enable_wifi: r.enable_wifi !== undefined ? Boolean(r.enable_wifi) : prev.restaurant.enable_wifi,
              enable_call_waiter: r.enable_call_waiter !== undefined ? Boolean(r.enable_call_waiter) : prev.restaurant.enable_call_waiter,
              enable_request_bill: r.enable_request_bill !== undefined ? Boolean(r.enable_request_bill) : prev.restaurant.enable_request_bill,
              enable_menu: r.enable_menu !== undefined ? Boolean(r.enable_menu) : prev.restaurant.enable_menu,
              enable_ordering: r.enable_ordering !== undefined ? Boolean(r.enable_ordering) : prev.restaurant.enable_ordering,
              enable_feedback: r.enable_feedback !== undefined ? Boolean(r.enable_feedback) : prev.restaurant.enable_feedback,
              enable_google_reviews: r.enable_google_reviews !== undefined ? Boolean(r.enable_google_reviews) : prev.restaurant.enable_google_reviews,
              google_review_url: typeof r.google_review_url === "string" ? r.google_review_url : prev.restaurant.google_review_url,
              instagram_url: typeof r.instagram_url === "string" ? r.instagram_url : prev.restaurant.instagram_url,
              primary_color: typeof r.primary_color === "string" ? r.primary_color : prev.restaurant.primary_color,
              enable_reservations: r.enable_reservations !== undefined ? Boolean(r.enable_reservations) : prev.restaurant.enable_reservations,
              reservation_opening_time: typeof r.reservation_opening_time === "string" ? r.reservation_opening_time : prev.restaurant.reservation_opening_time,
              reservation_closing_time: typeof r.reservation_closing_time === "string" ? r.reservation_closing_time : prev.restaurant.reservation_closing_time,
              reservation_slot_duration: typeof r.reservation_slot_duration === "number" ? r.reservation_slot_duration : prev.restaurant.reservation_slot_duration,
              reservation_max_party_size: typeof r.reservation_max_party_size === "number" ? r.reservation_max_party_size : prev.restaurant.reservation_max_party_size,
              reservation_max_days_advance: typeof r.reservation_max_days_advance === "number" ? r.reservation_max_days_advance : prev.restaurant.reservation_max_days_advance,
              reservation_auto_confirm: typeof r.reservation_auto_confirm === "boolean" ? r.reservation_auto_confirm : prev.restaurant.reservation_auto_confirm,
            },
          };
        });
      },
    },
  ], [restaurantId]);

  useRealtimeChannel({
    channelName: `admin-dashboard-${restaurantId}`,
    configs: adminChannelConfigs,
    onRefetchNeeded: loadData,
  });

  async function performRequest(url: string, body: unknown, method = "POST") {
    setIsBusy(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = await parseResponse(response);
      setMessage("Changes saved successfully.");
      setTimeout(() => setMessage(""), 4000);
      return result;
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Could not save changes.");
      setTimeout(() => setError(""), 6000);
      throw actionError;
    } finally {
      setIsBusy(false);
    }
  }

  // Update restaurant settings (optimistic update with rollback)
  async function updateRestaurantSettings(partialPayload: Record<string, unknown>) {
    const prevRestaurant = data?.restaurant;
    if (prevRestaurant) {
      setData((prev) =>
        prev
          ? {
              ...prev,
              restaurant: {
                ...prev.restaurant,
                ...partialPayload,
              },
            }
          : prev,
      );
    }
    try {
      return await performRequest(`/api/admin/${restaurantId}`, partialPayload, "PATCH");
    } catch {
      if (prevRestaurant) {
        setData((prev) => (prev ? { ...prev, restaurant: prevRestaurant } : prev));
      }
      return null;
    }
  }

  // Categories
  async function saveCategory(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!categoryName.trim()) return;
    try {
      const result = await performRequest(`/api/admin/${restaurantId}/menu`, {
        operation: editingCategoryId ? "update-category" : "create-category",
        id: editingCategoryId || undefined,
        name: categoryName.trim(),
        icon: categoryIcon || undefined,
      });
      if (result) {
        setCategoryName("");
        setCategoryIcon("coffee");
        setEditingCategoryId("");
        await loadData();
      }
    } catch {
      // Error handled by performRequest
    }
  }

  async function deleteCategory(id: string) {
    if (!window.confirm("Delete this category and all its items?")) return;
    const prevCategories = data?.categories;
    const prevItems = data?.items;
    setData((prev) =>
      prev
        ? {
            ...prev,
            categories: prev.categories.filter((c) => c.id !== id),
            items: prev.items.filter((i) => i.category_id !== id),
          }
        : prev,
    );
    try {
      await performRequest(`/api/admin/${restaurantId}/menu`, {
        operation: "delete-category",
        id,
      });
      if (editingCategoryId === id) {
        setEditingCategoryId("");
        setCategoryName("");
        setCategoryIcon("coffee");
      }
    } catch {
      if (prevCategories && prevItems) {
        setData((prev) => (prev ? { ...prev, categories: prevCategories, items: prevItems } : prev));
      }
    }
  }

  async function moveCategory(categoryIdToMove: string, direction: -1 | 1) {
    if (!data) return;
    const catIndex = data.categories.findIndex((entry) => entry.id === categoryIdToMove);
    const targetIndex = catIndex + direction;
    if (catIndex < 0 || targetIndex < 0 || targetIndex >= data.categories.length) return;
    const orderedIds = data.categories.map((entry) => entry.id);
    [orderedIds[catIndex], orderedIds[targetIndex]] = [orderedIds[targetIndex], orderedIds[catIndex]];

    const prevCategories = data.categories;
    setData((prev) => {
      if (!prev) return prev;
      const reordered = orderedIds
        .map((id, idx) => {
          const found = prev.categories.find((c) => c.id === id);
          return found ? { ...found, sort_order: idx } : null;
        })
        .filter(Boolean) as AdminDashboardData["categories"];
      return { ...prev, categories: reordered };
    });

    try {
      await performRequest(`/api/admin/${restaurantId}/menu`, {
        operation: "reorder-categories",
        orderedIds,
      });
    } catch {
      setData((prev) => (prev ? { ...prev, categories: prevCategories } : prev));
    }
  }

  // Items
  function startEditItem(item: AdminDashboardData["items"][number]) {
    setItemId(item.id);
    setItemForm({
      categoryId: item.category_id,
      name: item.name,
      description: item.description ?? "",
      price: String(item.price),
      imageUrl: item.image_url ?? "",
      dietaryTags: item.dietary_tags ?? [],
      isAvailable: item.is_available,
      pricingVariants: item.pricing_variants ?? [],
    });
    // Scroll smoothly to item editor
    document.getElementById("item-editor-card")?.scrollIntoView({ behavior: "smooth" });
  }

  function resetItemForm() {
    setItemId("");
    setItemForm({
      categoryId: data?.categories[0]?.id ?? "",
      name: "",
      description: "",
      price: "",
      imageUrl: "",
      dietaryTags: ["Veg"],
      isAvailable: true,
      pricingVariants: [],
    });
  }

  async function saveItem(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      const result = await performRequest(`/api/admin/${restaurantId}/menu`, {
        operation: itemId ? "update-item" : "create-item",
        id: itemId || undefined,
        ...itemForm,
        dietaryTags: itemForm.dietaryTags,
        price: Number(itemForm.price),
        pricingVariants: itemForm.pricingVariants,
      });
      if (result) {
        resetItemForm();
        await loadData();
      }
    } catch {
      // Error handled by performRequest
    }
  }

  async function deleteItem(id: string) {
    if (!window.confirm("Are you sure you want to delete this menu item?")) return;
    const prevItems = data?.items;
    setData((prev) => (prev ? { ...prev, items: prev.items.filter((i) => i.id !== id) } : prev));
    try {
      await performRequest(`/api/admin/${restaurantId}/menu`, {
        operation: "delete-item",
        id,
      });
      if (itemId === id) resetItemForm();
    } catch {
      if (prevItems) setData((prev) => (prev ? { ...prev, items: prevItems } : prev));
    }
  }

  // Optimistic availability toggle with rollback
  async function toggleItemAvailability(item: AdminDashboardData["items"][number]) {
    const prevItems = data?.items;
    setData((prev) =>
      prev
        ? {
            ...prev,
            items: prev.items.map((i) =>
              i.id === item.id ? { ...i, is_available: !i.is_available } : i,
            ),
          }
        : prev,
    );
    try {
      await performRequest(`/api/admin/${restaurantId}/menu`, {
        operation: "toggle-availability",
        id: item.id,
        isAvailable: !item.is_available,
      });
    } catch {
      if (prevItems) {
        setData((prev) => (prev ? { ...prev, items: prevItems } : prev));
      }
    }
  }

  // Optimistic bulk category availability toggle with rollback
  async function bulkCategoryAvailability(categoryId: string, isAvailable: boolean) {
    const prevItems = data?.items;
    setData((prev) =>
      prev
        ? {
            ...prev,
            items: prev.items.map((i) =>
              i.category_id === categoryId ? { ...i, is_available: isAvailable } : i,
            ),
          }
        : prev,
    );
    try {
      await performRequest(`/api/admin/${restaurantId}/menu`, {
        operation: "bulk-availability",
        categoryId,
        isAvailable,
      });
    } catch {
      if (prevItems) {
        setData((prev) => (prev ? { ...prev, items: prevItems } : prev));
      }
    }
  }

  // Optimistic reorder menu item with rollback
  async function moveMenuItem(itemIdToMove: string, direction: -1 | 1) {
    if (!data) return;
    const item = data.items.find((entry) => entry.id === itemIdToMove);
    if (!item) return;
    const categoryItems = data.items.filter((entry) => entry.category_id === item.category_id);
    const itemIndex = categoryItems.findIndex((entry) => entry.id === itemIdToMove);
    const targetIndex = itemIndex + direction;
    if (itemIndex < 0 || targetIndex < 0 || targetIndex >= categoryItems.length) return;
    const orderedIds = categoryItems.map((entry) => entry.id);
    [orderedIds[itemIndex], orderedIds[targetIndex]] = [orderedIds[targetIndex], orderedIds[itemIndex]];

    const prevItems = data.items;
    setData((prev) => {
      if (!prev) return prev;
      const otherItems = prev.items.filter((i) => i.category_id !== item.category_id);
      const reordered = orderedIds
        .map((id, idx) => {
          const found = prev.items.find((i) => i.id === id);
          return found ? { ...found, sort_order: idx } : null;
        })
        .filter(Boolean) as AdminDashboardData["items"];
      return {
        ...prev,
        items: [...otherItems, ...reordered],
      };
    });

    try {
      await performRequest(`/api/admin/${restaurantId}/menu`, {
        operation: "reorder-items",
        categoryId: item.category_id,
        orderedIds,
      });
    } catch {
      setData((prev) => (prev ? { ...prev, items: prevItems } : prev));
    }
  }

  async function signOut() {
    setIsSigningOut(true);
    try {
      const supabase = createSupabaseBrowserClient();
      if (supabase) {
        await supabase.auth.signOut();
      }
      window.location.assign("/admin/login");
    } catch {
      window.location.assign("/admin/login");
    } finally {
      setIsSigningOut(false);
    }
  }

  const activeRestaurant = restaurants.find((r) => r.id === restaurantId);

  return (
    <main
      className="tabletap-admin-app admin-dashboard-layout"
      style={{ "--restaurant-primary": data?.restaurant?.primary_color || "#722F37" } as React.CSSProperties}
    >
      {/* Sidebar Navigation */}
      <aside className="admin-sidebar">
        <div className="sidebar-top">
          <Link className="admin-brand-lockup" href="/">
            <div className="admin-brand-icon-box">
              <span className="brand-monogram-t">
                <Icon name="monogram-t" size={20} />
              </span>
            </div>
            <div className="admin-brand-titles">
              <strong className="admin-brand-name">TableTap</strong>
              <span className="admin-brand-sub">Raipur admin</span>
            </div>
          </Link>

          {/* Restaurant Branch Switcher */}
          <div className="sidebar-branch-selector">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <label htmlFor="branch-select" style={{ fontSize: 11, fontWeight: 600, color: "var(--theme-text-light, #8C7B70)" }}>
                Active venue:
              </label>
              <Link
                href="/onboarding?new=true"
                style={{ fontSize: 11, fontWeight: 600, color: "var(--theme-primary, #722F37)", textDecoration: "underline" }}
                title="Create a new restaurant or branch in Raipur"
              >
                + Add Branch
              </Link>
            </div>
            {restaurants.length > 1 ? (
              <select
                id="branch-select"
                onChange={(e) => setRestaurantId(e.target.value)}
                value={restaurantId}
              >
                {restaurants.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            ) : (
              <div style={{ padding: "8px 12px", background: "#F5EFE6", borderRadius: 8, fontSize: 13, fontWeight: 500, color: "var(--theme-text-primary, #722F37)" }}>
                {restaurants[0]?.name || "My Restaurant"}
              </div>
            )}
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="admin-nav-menu" aria-label="Admin Navigation">
          {navItems.map((item) => (
            <button
              aria-current={section === item.id ? "page" : undefined}
              className={`nav-menu-btn admin-nav-item ${section === item.id ? "active" : ""}`}
              key={item.id}
              onClick={() => setSection(item.id)}
              type="button"
            >
              <span className="nav-item-icon">{getSectionIcon(item.id)}</span>
              <span className="nav-item-label">{item.label}</span>
              {item.badge && <span className="nav-item-badge">{item.badge}</span>}
            </button>
          ))}
        </nav>

        {/* Quick Links & Sign Out */}
        <div className="sidebar-footer">
          <div className="sidebar-quick-tools">
            <Link className="sidebar-tool-link" href="/kitchen">
              <IconClock size={15} />
              <span>Open Kitchen KDS ↗</span>
            </Link>
            {data?.restaurant?.slug && (
              <Link
                className="sidebar-tool-link"
                href={`/${data.restaurant.slug}`}
                rel="noreferrer"
                target="_blank"
              >
                <IconPlates size={15} />
                <span>Live Guest Menu ↗</span>
              </Link>
            )}
          </div>

          <div className="sidebar-user-block">
            <div className="user-email-wrap">
              <span className="user-email">{userEmail}</span>
            </div>
            <button
              className="admin-signout-btn"
              disabled={isSigningOut}
              onClick={() => void signOut()}
              type="button"
            >
              {isSigningOut ? "Signing out..." : "Sign Out"}
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="admin-main-stage">
        {/* Top Navbar */}
        <header className="admin-topbar">
          <div className="topbar-left">
            <span className="topbar-sub">Raipur restaurant manager</span>
            <h1 className="topbar-title">{activeRestaurant?.name ?? "Restaurant Dashboard"}</h1>
          </div>

          <div className="topbar-right">
            {restaurants.length > 1 && (
              <div className="topbar-mobile-switcher">
                <select onChange={(e) => setRestaurantId(e.target.value)} value={restaurantId}>
                  {restaurants.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <Link className="topbar-action-btn primary" href="/kitchen">
              <IconClock size={15} />
              <span>Kitchen KDS</span>
            </Link>
            {data?.restaurant?.slug && (
              <Link
                className="topbar-action-btn secondary"
                href={`/${data.restaurant.slug}`}
                target="_blank"
              >
                <IconPlates size={15} />
                <span>Guest Menu</span>
              </Link>
            )}
          </div>
        </header>

        {/* Mobile horizontal tabs */}
        <nav className="admin-mobile-tabs" aria-label="Mobile Navigation">
          {navItems.map((item) => (
            <button
              className={`mobile-tab-btn admin-nav-item ${section === item.id ? "active" : ""}`}
              key={item.id}
              onClick={() => setSection(item.id)}
              type="button"
            >
              <span className="mobile-tab-icon">{getSectionIcon(item.id)}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        {/* Content Pane */}
        <div className="admin-content-pane">
          {error && (
            <div className="admin-alert-banner error">
              <Icon name="alert" size={15} style={{ display: "inline-block", verticalAlign: "middle", marginRight: 6 }} />
              <span>{error}</span>
            </div>
          )}
          {message && !error && (
            <div className="admin-alert-banner success">
              <Icon name="check" size={15} style={{ display: "inline-block", verticalAlign: "middle", marginRight: 6 }} />
              <span>{message}</span>
            </div>
          )}
          {isLoading && <p className="admin-loading-indicator">Loading restaurant workspace...</p>}

          {/* SECTION A: RESTAURANT PROFILE & BRANDING */}
          {!isLoading && data && section === "profile" && (
            <ProfileSection
              isBusy={isBusy}
              onSave={updateRestaurantSettings}
              restaurant={data.restaurant}
              restaurantId={restaurantId}
            />
          )}

          {/* SECTION B: FEATURE TOGGLES */}
          {!isLoading && data && section === "features" && (
            <FeaturesSection
              isBusy={isBusy}
              onSave={updateRestaurantSettings}
              restaurant={data.restaurant}
            />
          )}

          {/* SECTION C: MENU MANAGEMENT */}
          {!isLoading && data && section === "menu" && (
            <MenuSection
              categories={data.categories}
              categoryIcon={categoryIcon}
              categoryName={categoryName}
              editingCategoryId={editingCategoryId}
              isBusy={isBusy}
              itemForm={itemForm}
              itemId={itemId}
              items={data.items}
              onBulkAvailability={(catId, avail) => void bulkCategoryAvailability(catId, avail)}
              onCancelCategory={() => {
                setEditingCategoryId("");
                setCategoryName("");
                setCategoryIcon("coffee");
              }}
              onCancelItem={resetItemForm}
              onCategoryIconChange={setCategoryIcon}
              onCategoryNameChange={setCategoryName}
              onDeleteCategory={(id) => void deleteCategory(id)}
              onDeleteItem={(id) => void deleteItem(id)}
              onEditCategory={(category) => {
                setEditingCategoryId(category.id);
                setCategoryName(category.name);
                setCategoryIcon(category.icon || "coffee");
              }}
              onEditItem={startEditItem}
              onItemFormChange={setItemForm}
              onMoveCategory={(id, dir) => void moveCategory(id, dir)}
              onMoveItem={(id, dir) => void moveMenuItem(id, dir)}
              onSaveCategory={(e) => void saveCategory(e)}
              onSaveItem={(e) => void saveItem(e)}
              onToggleAvailability={(item) => void toggleItemAvailability(item)}
            />
          )}

          {/* SECTION D: TABLES & QR */}
          {section === "tables" && (
            <TablesAdminSection key={restaurantId} restaurantId={restaurantId} />
          )}

          {/* SECTION: TABLE RESERVATIONS */}
          {!isLoading && data && section === "reservations" && (
            <AdminReservationsSection
              key={restaurantId}
              restaurantId={restaurantId}
              restaurantName={data.restaurant.name}
              settings={data.restaurant}
              onUpdateSettings={updateRestaurantSettings}
            />
          )}

          {/* SECTION E: LOYALTY SETTINGS */}
          {!isLoading && data && section === "loyalty" && (
            <LoyaltySettingsSection
              isBusy={isBusy}
              onSave={updateRestaurantSettings}
              restaurant={data.restaurant}
              restaurantId={restaurantId}
            />
          )}

          {/* SECTION F: REVIEWS & FEEDBACK */}
          {!isLoading && data && section === "reviews" && (
            <ReviewsSection
              isBusy={isBusy}
              onSave={updateRestaurantSettings}
              restaurant={data.restaurant}
              restaurantId={restaurantId}
            />
          )}

          {/* OVERVIEW & ANALYTICS */}
          {!isLoading && data && section === "overview" && (
            <div className="overview-container">
              <AnalyticsSection key={restaurantId} restaurantId={restaurantId} />
            </div>
          )}

          {/* ACCOUNT SETTINGS */}
          {section === "account" && <AccountSection userEmail={userEmail} />}
        </div>
      </div>
    </main>
  );
}

/* =========================================================================
   A. RESTAURANT PROFILE & BRANDING COMPONENT
   ========================================================================= */
function ProfileSection({
  restaurant,
  restaurantId,
  isBusy,
  onSave,
}: {
  restaurant: AdminDashboardData["restaurant"];
  restaurantId: string;
  isBusy: boolean;
  onSave: (payload: Record<string, unknown>) => Promise<unknown>;
}) {
  const [name, setName] = useState(restaurant.name);
  const [tagline, setTagline] = useState(restaurant.tagline || "");
  const [address, setAddress] = useState(restaurant.address ?? "");
  const [city, setCity] = useState(restaurant.city || "Raipur, Chhattisgarh");
  const [phone, setPhone] = useState(restaurant.phone ?? "");
  const [logoUrl, setLogoUrl] = useState(restaurant.logo_url ?? "");
  const [primaryColor, setPrimaryColor] = useState(restaurant.primary_color ?? "#2E5A44");
  const [secondaryColor, setSecondaryColor] = useState(restaurant.secondary_color ?? "");
  const [heroImage, setHeroImage] = useState(restaurant.hero_image ?? "");
  const [googleReviewUrl, setGoogleReviewUrl] = useState(restaurant.google_review_url ?? "");
  const [instagramUrl, setInstagramUrl] = useState(restaurant.instagram_url ?? "");
  const [wifiName, setWifiName] = useState(restaurant.wifi_name || restaurant.wifi_ssid || "");
  const [wifiPassword, setWifiPassword] = useState(restaurant.wifi_password ?? "");
  const [hasStaffPin, setHasStaffPin] = useState(Boolean((restaurant as Record<string, unknown>).has_staff_pin || restaurant.kitchen_pin));
  const [customPinInput, setCustomPinInput] = useState("");
  const [newGeneratedPin, setNewGeneratedPin] = useState<string | null>(null);
  const [pinStatusMsg, setPinStatusMsg] = useState("");
  const [isPinBusy, setIsPinBusy] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  async function handleUpdateStaffPin(pinToSet?: string) {
    setIsPinBusy(true);
    setPinStatusMsg("");
    setNewGeneratedPin(null);
    try {
      const res = await fetch(`/api/admin/${restaurantId}/staff-pin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pinToSet ? { pin: pinToSet } : {}),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Could not set staff PIN");
      }
      setHasStaffPin(true);
      setNewGeneratedPin(data.pin);
      setCustomPinInput("");
      setPinStatusMsg("Staff PIN successfully updated! It is shown once below.");
    } catch (err) {
      setPinStatusMsg(err instanceof Error ? err.message : "Failed to update staff PIN");
    } finally {
      setIsPinBusy(false);
    }
  }

  async function handleLogoUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    setUploadError("");
    try {
      const formData = new FormData();
      formData.set("logo", file);
      const response = await fetch(`/api/admin/${restaurantId}/logo`, {
        method: "POST",
        body: formData,
      });
      const result = (await parseResponse(response)) as { logoUrl: string };
      setLogoUrl(result.logoUrl);
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : "Could not upload image.");
    } finally {
      setIsUploading(false);
      event.target.value = "";
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await onSave({
      name: name.trim(),
      tagline: tagline.trim(),
      description: tagline.trim() || undefined,
      address: address.trim(),
      city: city.trim(),
      phone: phone.trim(),
      logoUrl: logoUrl.trim() || null,
      primaryColor,
      secondaryColor: secondaryColor.trim() || null,
      heroImage: heroImage.trim() || undefined,
      googleReviewUrl: googleReviewUrl.trim() || null,
      instagramUrl: instagramUrl.trim() || null,
      wifiName: wifiName.trim() || undefined,
      wifiSsid: wifiName.trim() || undefined,
      wifiPassword: wifiPassword.trim() || undefined,
    });
  }

  return (
    <div className="admin-panel-card">
      <div className="panel-header">
        <div>
          <span className="panel-eyebrow">Raipur Customization</span>
          <h2>Restaurant Profile &amp; Branding</h2>
        </div>
        <p className="panel-desc">
          Customize your venue&apos;s identity, Raipur area, brand theme color palette, Google Review link, and guest Wi-Fi.
        </p>
      </div>

      <form className="admin-form-flow" onSubmit={handleSubmit}>
        {/* 1. Basic Name & Tagline */}
        <div className="form-row-two">
          <label className="admin-label">
            Restaurant Name
            <input
              className="admin-input"
              maxLength={120}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Mocha Cafe & Bar"
              required
              value={name}
            />
            <span className="field-hint">Displayed prominently on your guest menus and table headers.</span>
          </label>

          <label className="admin-label">
            Tagline / Short Description
            <input
              className="admin-input"
              maxLength={160}
              onChange={(e) => setTagline(e.target.value)}
              placeholder="e.g. Specialty Coffee & Artisan Wood-Fired Kitchen"
              value={tagline}
            />
            <span className="field-hint">Catchy one-liner displayed under your restaurant title.</span>
          </label>
        </div>

        {/* 2. Raipur Location & Area suggestions */}
        <div className="form-group-block">
          <div className="form-row-two">
            <label className="admin-label">
              Address / Area in Raipur
              <input
                className="admin-input"
                maxLength={250}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="e.g. Civil Lines, Near Raj Bhavan"
                value={address}
              />
            </label>

            <label className="admin-label">
              City &amp; State
              <input
                className="admin-input"
                maxLength={100}
                onChange={(e) => setCity(e.target.value)}
                required
                value={city}
              />
            </label>
          </div>

          <div className="area-suggestion-pills">
            <span className="pills-hint">Quick-fill Raipur locality:</span>
            {RAIPUR_AREAS.map((area) => (
              <button
                className="area-pill-btn"
                key={area}
                onClick={() => setAddress(area)}
                type="button"
              >
                + {area}
              </button>
            ))}
          </div>
        </div>

        {/* 3. Contact Phone & Social Links */}
        <div className="form-row-two">
          <label className="admin-label">
            Restaurant Phone Number
            <input
              className="admin-input"
              inputMode="tel"
              maxLength={25}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. +91 98765 43210 or 0771-4001234"
              value={phone}
            />
            <span className="field-hint">For guest inquiries and support on digital receipts.</span>
          </label>

          <label className="admin-label">
            Instagram / Social Profile URL
            <div className="input-with-btn">
              <input
                className="admin-input"
                onChange={(e) => setInstagramUrl(e.target.value)}
                placeholder="https://instagram.com/your_cafe"
                type="url"
                value={instagramUrl}
              />
              {instagramUrl && (
                <a
                  className="admin-btn secondary"
                  href={instagramUrl}
                  rel="noreferrer"
                  target="_blank"
                >
                  Test Link ↗
                </a>
              )}
            </div>
            <span className="field-hint">Optional link for guests to follow your social channels.</span>
          </label>
        </div>

        {/* 4. Logo Upload & URL with Preview */}
        <div className="form-group-block">
          <label className="admin-label">Restaurant Logo</label>
          <div className="logo-upload-cluster">
            {logoUrl ? (
              <div className="logo-preview-box">
                <Image
                  alt="Logo preview"
                  className="logo-preview-img"
                  height={72}
                  src={logoUrl}
                  unoptimized
                  width={72}
                />
              </div>
            ) : (
              <div
                className="logo-preview-placeholder"
                style={{ backgroundColor: primaryColor }}
              >
                {name.slice(0, 2).toUpperCase() || "TT"}
              </div>
            )}

            <div className="logo-upload-controls">
              <div className="upload-buttons-row">
                <label className="upload-file-btn">
                  <span>{isUploading ? "Uploading..." : "Upload Logo (PNG / JPG / WebP)"}</span>
                  <input
                    accept="image/png,image/jpeg,image/webp"
                    disabled={isUploading}
                    onChange={(e) => void handleLogoUpload(e)}
                    type="file"
                  />
                </label>
                {logoUrl && (
                  <button
                    className="admin-btn secondary small"
                    onClick={() => setLogoUrl("")}
                    type="button"
                  >
                    Clear Logo
                  </button>
                )}
              </div>
              <input
                className="admin-input logo-url-input"
                onChange={(e) => setLogoUrl(e.target.value)}
                placeholder="Or paste direct logo HTTPS URL"
                type="url"
                value={logoUrl}
              />
            </div>
          </div>
          {uploadError && <p className="admin-field-error">{uploadError}</p>}
        </div>

        {/* 5. Color Palette: Primary & Secondary Colors */}
        <div className="form-group-block">
          <div className="form-row-two">
            {/* Primary Color */}
            <div className="color-section-col">
              <label className="admin-label">
                Primary Brand Color
                <span className="field-hint">Used for headers, action buttons, table badges &amp; checkout bar.</span>
              </label>
              <div className="color-input-pair">
                <input
                  aria-label="Color hex"
                  className="admin-input color-text"
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  pattern="#[0-9a-fA-F]{6}"
                  value={primaryColor}
                />
                <input
                  aria-label="Pick color"
                  className="native-color-picker"
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  type="color"
                  value={primaryColor}
                />
              </div>

              <div className="color-swatches-row">
                <span className="swatches-label">Raipur Presets:</span>
                {BRAND_COLOR_PALETTES.map((palette) => (
                  <button
                    className={`color-swatch-btn ${primaryColor.toLowerCase() === palette.hex.toLowerCase() ? "active" : ""}`}
                    key={palette.hex}
                    onClick={() => setPrimaryColor(palette.hex)}
                    style={{ backgroundColor: palette.hex }}
                    title={palette.name}
                    type="button"
                  />
                ))}
              </div>
            </div>

            {/* Secondary Color */}
            <div className="color-section-col">
              <label className="admin-label">
                Secondary Accent Color <span>(Optional)</span>
                <span className="field-hint">Subtle secondary tint used for highlights, tags, and borders.</span>
              </label>
              <div className="color-input-pair">
                <input
                  aria-label="Secondary color hex"
                  className="admin-input color-text"
                  onChange={(e) => setSecondaryColor(e.target.value)}
                  placeholder="e.g. #D4AF37"
                  value={secondaryColor}
                />
                <input
                  aria-label="Pick secondary color"
                  className="native-color-picker"
                  onChange={(e) => setSecondaryColor(e.target.value)}
                  type="color"
                  value={secondaryColor || "#D4AF37"}
                />
                {secondaryColor && (
                  <button
                    className="admin-btn secondary small"
                    onClick={() => setSecondaryColor("")}
                    type="button"
                  >
                    Clear
                  </button>
                )}
              </div>

              <div className="color-swatches-row">
                <span className="swatches-label">Accents:</span>
                {SECONDARY_COLOR_PALETTES.map((palette) => (
                  <button
                    className={`color-swatch-btn ${secondaryColor.toLowerCase() === palette.hex.toLowerCase() ? "active" : ""}`}
                    key={palette.hex}
                    onClick={() => setSecondaryColor(palette.hex)}
                    style={{ backgroundColor: palette.hex }}
                    title={palette.name}
                    type="button"
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 6. Cover / Banner Image with Preview */}
        <div className="form-group-block">
          <label className="admin-label">
            Cover / Banner Image <span>(Optional)</span>
            <span className="field-hint">Appears at the top of your restaurant overview and share cards.</span>
          </label>
          <div className="banner-input-row">
            <input
              className="admin-input"
              onChange={(e) => setHeroImage(e.target.value)}
              placeholder="https://images.unsplash.com/..."
              type="url"
              value={heroImage}
            />
            {heroImage && (
              <button
                className="admin-btn secondary small"
                onClick={() => setHeroImage("")}
                type="button"
              >
                Clear
              </button>
            )}
          </div>

          <div className="hero-presets-row">
            <span className="pills-hint">Or choose a preset style:</span>
            {HERO_PRESETS.map((preset) => (
              <button
                className="area-pill-btn"
                key={preset.label}
                onClick={() => setHeroImage(preset.url)}
                type="button"
              >
                + {preset.label}
              </button>
            ))}
          </div>

          {heroImage && (
            <div className="hero-banner-preview">
              <Image
                alt="Banner preview"
                className="hero-banner-img"
                height={160}
                src={heroImage}
                unoptimized
                width={700}
              />
            </div>
          )}
        </div>

        {/* 7. Google Review Link (Very Important) */}
        <div className="form-group-block google-highlight-box">
          <div className="google-box-header">
            <span className="google-icon"><Icon name="star" size={20} /></span>
            <div>
              <h3>Google Review Link (Very Important)</h3>
              <p>
                When guests tap &apos;Review&apos; on their table, TableTap directs them directly to your Google Maps review dialog to boost your rating in Raipur.
              </p>
            </div>
          </div>

          <div className="google-input-row">
            <input
              className="admin-input"
              onChange={(e) => setGoogleReviewUrl(e.target.value)}
              placeholder="https://g.page/r/... or https://maps.google.com/..."
              type="url"
              value={googleReviewUrl}
            />
            {googleReviewUrl && (
              <a
                className="admin-btn secondary"
                href={googleReviewUrl}
                rel="noreferrer"
                target="_blank"
              >
                Test Link ↗
              </a>
            )}
          </div>
        </div>

        {/* 8. Guest Wi-Fi Settings */}
        <div className="form-group-block wifi-admin-box">
          <div className="section-subheading">
            <span className="subhead-icon"><Icon name="wifi" size={18} /></span>
            <div>
              <h3>Guest Wi-Fi Details</h3>
              <p>Network name and password displayed on guest table menus with 1-tap copy.</p>
            </div>
          </div>

          <div className="form-row-two" style={{ marginTop: 12 }}>
            <label className="admin-label">
              Wi-Fi Name (SSID)
              <input
                className="admin-input"
                maxLength={128}
                onChange={(e) => setWifiName(e.target.value)}
                placeholder="e.g. Mocha_Guest_5G"
                value={wifiName}
              />
            </label>

            <label className="admin-label">
              Wi-Fi Password
              <input
                className="admin-input"
                maxLength={256}
                onChange={(e) => setWifiPassword(e.target.value)}
                placeholder="e.g. bestcoffee2026"
                value={wifiPassword}
              />
            </label>
          </div>
        </div>

        {/* 9. Kitchen & Staff Access */}
        <div className="form-group-block staff-admin-box" style={{ background: "#FDFBF7", border: "1px solid var(--theme-border, #D9CBB8)", borderRadius: 14, padding: 20 }}>
          <div className="section-subheading">
            <span className="subhead-icon"><Icon name="clock" size={18} /></span>
            <div>
              <h3>Kitchen Display &amp; Staff Access</h3>
              <p>Configure a secure staff PIN for your kitchen display tablets and floor staff to log in at <code>/admin/login</code> without sharing your owner password.</p>
            </div>
          </div>

          {newGeneratedPin && (
            <div
              style={{
                marginTop: 16,
                padding: "16px 20px",
                background: "#FAF4EC",
                border: "2px solid #722F37",
                borderRadius: 12,
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <strong style={{ color: "#722F37", fontSize: 15 }}>
                  New Staff PIN (shown once):
                </strong>
                <button
                  type="button"
                  className="admin-btn secondary"
                  style={{ padding: "4px 10px", fontSize: 12 }}
                  onClick={() => setNewGeneratedPin(null)}
                >
                  Dismiss
                </button>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span
                  style={{
                    fontFamily: "monospace",
                    fontSize: 28,
                    fontWeight: 700,
                    letterSpacing: 6,
                    color: "#2A1A1D",
                    background: "#FFFFFF",
                    padding: "6px 16px",
                    borderRadius: 8,
                    border: "1px solid #D9CBB8",
                  }}
                >
                  {newGeneratedPin}
                </span>
                <button
                  type="button"
                  className="admin-btn secondary"
                  onClick={() => {
                    void navigator.clipboard.writeText(newGeneratedPin);
                    alert("Staff PIN copied to clipboard!");
                  }}
                >
                  Copy PIN
                </button>
              </div>
              <p style={{ fontSize: 13, color: "#665C54", margin: 0 }}>
                Make a note of this PIN now. For security, staff PINs are stored as cryptographically salted hashes and will not be displayed again.
              </p>
            </div>
          )}

          {pinStatusMsg && !newGeneratedPin && (
            <p style={{ marginTop: 12, fontSize: 13, color: "#722F37" }}>{pinStatusMsg}</p>
          )}

          <div className="form-row-two" style={{ marginTop: 16 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                <label className="admin-label" style={{ margin: 0 }}>
                  Staff Security PIN
                </label>
                <span
                  style={{
                    fontSize: 11,
                    padding: "2px 8px",
                    borderRadius: 999,
                    background: hasStaffPin ? "#E8F5E9" : "#FFEBEE",
                    color: hasStaffPin ? "#2E7D32" : "#C62828",
                    fontWeight: 600,
                  }}
                >
                  {hasStaffPin ? "PIN Active" : "No PIN Set"}
                </span>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  className="admin-input"
                  maxLength={8}
                  pattern="[0-9]*"
                  inputMode="numeric"
                  placeholder="4–8 digit PIN"
                  value={customPinInput}
                  onChange={(e) => setCustomPinInput(e.target.value.replace(/\D/g, ""))}
                  disabled={isPinBusy}
                />
                <button
                  type="button"
                  className="admin-btn secondary"
                  style={{ whiteSpace: "nowrap" }}
                  disabled={isPinBusy || customPinInput.length < 4}
                  onClick={() => void handleUpdateStaffPin(customPinInput)}
                >
                  Set Custom
                </button>
                <button
                  type="button"
                  className="admin-btn primary"
                  style={{ whiteSpace: "nowrap" }}
                  disabled={isPinBusy}
                  onClick={() => void handleUpdateStaffPin()}
                >
                  {hasStaffPin ? "Reset Random PIN" : "Generate PIN"}
                </button>
              </div>
              <span className="field-hint">
                4 to 8 numeric digits. When reset, the new PIN is shown once to record.
              </span>
            </div>

            <div className="admin-label">
              <span>Direct Kitchen Tablet URL</span>
              <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                <input
                  className="admin-input"
                  readOnly
                  style={{ background: "#F5EFE6", fontSize: 13 }}
                  value={typeof window !== "undefined" ? `${window.location.origin}/kitchen?restaurant=${restaurantId}` : `/kitchen?restaurant=${restaurantId}`}
                />
                <button
                  type="button"
                  className="admin-btn secondary"
                  style={{ whiteSpace: "nowrap" }}
                  onClick={() => {
                    const url = typeof window !== "undefined" ? `${window.location.origin}/kitchen?restaurant=${restaurantId}` : `/kitchen?restaurant=${restaurantId}`;
                    void navigator.clipboard.writeText(url);
                    alert("Kitchen KDS URL copied to clipboard!");
                  }}
                >
                  Copy URL
                </button>
              </div>
              <span className="field-hint">Bookmark this on your kitchen iPad or Android terminal.</span>
            </div>
          </div>
        </div>

        <div className="form-submit-row">
          <button className="admin-btn primary large" disabled={isBusy} type="submit">
            {isBusy ? "Saving Settings..." : "Save Restaurant Profile"}
          </button>
        </div>
      </form>
    </div>
  );
}

/* =========================================================================
   B. FEATURE TOGGLES COMPONENT
   ========================================================================= */
function FeaturesSection({
  restaurant,
  isBusy,
  onSave,
}: {
  restaurant: AdminDashboardData["restaurant"];
  isBusy: boolean;
  onSave: (payload: Record<string, unknown>) => Promise<unknown>;
}) {
  const [features, setFeatures] = useState({
    enableMenu: restaurant.enable_menu !== false,
    enableOrdering: restaurant.enable_ordering !== false,
    loyaltyEnabled: restaurant.loyalty_enabled !== false,
    enableCallWaiter: restaurant.enable_call_waiter !== false,
    enableRequestBill: restaurant.enable_request_bill !== false,
    enableWifi: restaurant.enable_wifi !== false,
    enableFeedback: restaurant.enable_feedback !== false,
    enableGoogleReviews: restaurant.enable_google_reviews !== false,
    enableReservations: restaurant.enable_reservations !== false,
  });

  const featureList = [
    {
      key: "enableMenu" as const,
      label: "Digital Menu",
      iconName: "plates" as const,
      desc: "Display your interactive food & drink menu when diners scan table QR codes.",
      tip: "When disabled, guests see an offline maintenance notice instead.",
    },
    {
      key: "enableOrdering" as const,
      label: "Online Table Ordering",
      iconName: "bag" as const,
      desc: "Allow seated guests to add items to their cart and send orders directly to KDS.",
      tip: "When disabled, TableTap operates in pure view-only digital menu mode.",
    },
    {
      key: "enableReservations" as const,
      label: "Table Reservations",
      iconName: "clock" as const,
      desc: "Allow guests to reserve dining tables in advance with live capacity checks.",
      tip: "Manage reservations from the dedicated Table Reservations tab.",
    },
    {
      key: "loyaltyEnabled" as const,
      label: "Loyalty Program",
      iconName: "loyalty" as const,
      desc: "Enable mobile number rewards and stamp/point collection to retain regular diners.",
      tip: "Diners can check their stamps & reward progress right at their table.",
    },
    {
      key: "enableCallWaiter" as const,
      label: "Call Waiter Button",
      iconName: "bell-service" as const,
      desc: "Give diners an instant assistance button that rings the kitchen & staff panel.",
      tip: "Includes a 90-second anti-spam cooldown.",
    },
    {
      key: "enableRequestBill" as const,
      label: "Request Bill Button",
      iconName: "bill" as const,
      desc: "Guests can request their invoice / UPI QR / card terminal directly from their seat.",
      tip: "Alerts staff with the table number.",
    },
    {
      key: "enableWifi" as const,
      label: "Guest Wi-Fi Sharing",
      iconName: "wifi" as const,
      desc: "Display your complimentary guest Wi-Fi details with 1-tap password copy on table menus.",
      tip: "Configure network name & password in Restaurant Profile.",
    },
    {
      key: "enableFeedback" as const,
      label: "Internal Reviews & Feedback",
      iconName: "chat" as const,
      desc: "Private guest ratings (1-5 stars) and comments sent directly to manager inbox.",
      tip: "Keeps critical feedback private so you can fix issues quickly.",
    },
    {
      key: "enableGoogleReviews" as const,
      label: "Google Review Button",
      iconName: "star" as const,
      desc: "Direct happy guests straight to your Google Maps review dialog to boost ranking in Raipur.",
      tip: "Configure your Google Maps review link in Restaurant Profile.",
    },
  ];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await onSave(features);
  }

  return (
    <div className="admin-panel-card">
      <div className="panel-header">
        <div>
          <span className="panel-eyebrow">Restaurant Control Center</span>
          <h2>Feature Toggles</h2>
        </div>
        <p className="panel-desc">
          Turn features on or off with one tap. Changes take effect immediately across all dining table QR codes.
        </p>
      </div>

      <form className="admin-form-flow" onSubmit={handleSubmit}>
        <div className="features-admin-grid">
          {featureList.map((f) => {
            const isChecked = features[f.key];
            return (
              <div
                className={`feature-toggle-card ${isChecked ? "enabled" : "disabled"}`}
                key={f.key}
              >
                <div className="feature-card-header">
                  <span className="feature-card-icon"><Icon name={f.iconName} size={22} /></span>
                  <label className="feature-switch-control">
                    <input
                      checked={isChecked}
                      onChange={(e) =>
                        setFeatures((prev) => ({ ...prev, [f.key]: e.target.checked }))
                      }
                      type="checkbox"
                    />
                    <span className="feature-slider" />
                  </label>
                </div>
                <div className="feature-card-body">
                  <div className="feature-title-row">
                    <strong>{f.label}</strong>
                    <span className={`feature-status-badge ${isChecked ? "active" : "off"}`}>
                      {isChecked ? "Active" : "Disabled"}
                    </span>
                  </div>
                  <p className="feature-card-desc">{f.desc}</p>
                  <span className="feature-card-tip">
                    <Icon name="bulb" size={13} style={{ display: "inline-block", verticalAlign: "middle", marginRight: 4 }} />
                    {f.tip}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="form-submit-row">
          <button className="admin-btn primary large" disabled={isBusy} type="submit">
            {isBusy ? "Saving Features..." : "Save Feature Toggles"}
          </button>
        </div>
      </form>
    </div>
  );
}

/* =========================================================================
   C. MENU MANAGEMENT COMPONENT
   ========================================================================= */
function MenuSection(props: {
  categories: AdminDashboardData["categories"];
  categoryName: string;
  categoryIcon: string;
  editingCategoryId: string;
  items: AdminDashboardData["items"];
  itemId: string;
  itemForm: {
    categoryId: string;
    name: string;
    description: string;
    price: string;
    imageUrl: string;
    dietaryTags: string[];
    isAvailable: boolean;
    pricingVariants: { name: string; price: number }[];
  };
  isBusy: boolean;
  onCategoryNameChange: (value: string) => void;
  onCategoryIconChange: (value: string) => void;
  onEditCategory: (category: AdminDashboardData["categories"][number]) => void;
  onDeleteCategory: (id: string) => void;
  onMoveCategory: (id: string, direction: -1 | 1) => void;
  onCancelCategory: () => void;
  onSaveCategory: (event: React.FormEvent<HTMLFormElement>) => void;
  onEditItem: (item: AdminDashboardData["items"][number]) => void;
  onDeleteItem: (id: string) => void;
  onToggleAvailability: (item: AdminDashboardData["items"][number]) => void;
  onBulkAvailability: (categoryId: string, isAvailable: boolean) => void;
  onMoveItem: (id: string, direction: -1 | 1) => void;
  onItemFormChange: (form: typeof props.itemForm) => void;
  onCancelItem: () => void;
  onSaveItem: (event: React.FormEvent<HTMLFormElement>) => void;
}) {
  const [selectedFilterCategory, setSelectedFilterCategory] = useState("all");
  const [itemSearchQuery, setItemSearchQuery] = useState("");

  const visibleItems = props.items.filter((item) => {
    if (selectedFilterCategory !== "all" && item.category_id !== selectedFilterCategory) {
      return false;
    }
    if (itemSearchQuery.trim()) {
      const q = itemSearchQuery.toLowerCase().trim();
      return (
        item.name.toLowerCase().includes(q) ||
        (item.description && item.description.toLowerCase().includes(q))
      );
    }
    return true;
  });

  function toggleTag(tagLabel: string) {
    const current = props.itemForm.dietaryTags;
    if (current.includes(tagLabel)) {
      props.onItemFormChange({
        ...props.itemForm,
        dietaryTags: current.filter((t) => t !== tagLabel),
      });
    } else {
      props.onItemFormChange({
        ...props.itemForm,
        dietaryTags: [...current, tagLabel],
      });
    }
  }

  function addPricingVariant() {
    props.onItemFormChange({
      ...props.itemForm,
      pricingVariants: [
        ...props.itemForm.pricingVariants,
        { name: "Large", price: Number(props.itemForm.price) || 0 },
      ],
    });
  }

  function updatePricingVariant(index: number, name: string, price: number) {
    const next = [...props.itemForm.pricingVariants];
    next[index] = { name, price };
    props.onItemFormChange({
      ...props.itemForm,
      pricingVariants: next,
    });
  }

  function removePricingVariant(index: number) {
    const next = props.itemForm.pricingVariants.filter((_, i) => i !== index);
    props.onItemFormChange({
      ...props.itemForm,
      pricingVariants: next,
    });
  }

  return (
    <div className="admin-menu-management">
      {props.items.length === 0 && (
        <aside aria-label="Menu onboarding banner" className="admin-alert-banner info menu-empty-venue-banner" role="status" style={{ background: "#E8DCC6", border: "1.5px solid #D9CBB8", color: "#3C322C", fontSize: "14px", fontWeight: 600, display: "flex", alignItems: "center", gap: 10, padding: "14px 18px", borderRadius: "12px", marginBottom: "20px" }}>
          <Icon name="info" size={18} />
          <span>Add your first category and item to publish your menu</span>
        </aside>
      )}
      {/* 1. Category Manager */}
      <section className="admin-panel-card">
        <div className="panel-header">
          <div>
            <span className="panel-eyebrow">Step 1: Organize</span>
            <h2>Menu Categories &amp; Ordering</h2>
          </div>
          <p className="panel-desc">
            Organize dishes into sections with icons. Use the ▲ / ▼ arrows to reorder how categories appear on table menus.
          </p>
        </div>

        <div className="category-manager-grid">
          <div className="category-chips-list">
            {props.categories.map((cat, index) => {
              const count = props.items.filter((i) => i.category_id === cat.id).length;
              return (
                <div className="cat-admin-pill" key={cat.id}>
                  <div className="cat-reorder-arrows">
                    <button
                      aria-label="Move category up"
                      className="cat-arrow-btn"
                      disabled={index === 0}
                      onClick={() => props.onMoveCategory(cat.id, -1)}
                      title="Move Category Up"
                      type="button"
                    >
                      <Icon name="chevron-up" size={11} />
                    </button>
                    <button
                      aria-label="Move category down"
                      className="cat-arrow-btn"
                      disabled={index === props.categories.length - 1}
                      onClick={() => props.onMoveCategory(cat.id, 1)}
                      title="Move Category Down"
                      type="button"
                    >
                      <Icon name="chevron-down" size={11} />
                    </button>
                  </div>

                  <span className="cat-pill-icon"><CategoryIcon name={cat.name || cat.icon || "plates"} size={16} /></span>

                  <div className="cat-pill-label">
                    <strong>{cat.name}</strong>
                    <span className="cat-pill-count">({count} {count === 1 ? "item" : "items"})</span>
                  </div>

                  <div className="cat-pill-actions">
                    <button
                      className="cat-action-btn availability in-stock"
                      onClick={() => props.onBulkAvailability(cat.id, true)}
                      title="Mark all items in this category In Stock"
                      type="button"
                    >
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
                        <Icon name="check" size={12} />
                        <span>All In</span>
                      </span>
                    </button>
                    <button
                      className="cat-action-btn availability sold-out"
                      onClick={() => props.onBulkAvailability(cat.id, false)}
                      title="Mark all items in this category Sold Out"
                      type="button"
                    >
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
                        <Icon name="close" size={12} />
                        <span>All Out</span>
                      </span>
                    </button>
                    <button
                      className="cat-action-btn"
                      onClick={() => props.onEditCategory(cat)}
                      title="Rename Category"
                      type="button"
                    >
                      <IconEdit size={13} />
                    </button>
                    <button
                      className="cat-action-btn danger"
                      onClick={() => props.onDeleteCategory(cat.id)}
                      title="Delete Category"
                      type="button"
                    >
                      <IconDelete size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <form className="category-add-form" onSubmit={props.onSaveCategory}>
            <div className="category-form-inputs">
              {/* Category Icon Selector */}
              <div className="category-icon-picker">
                <span className="icon-picker-label">Icon:</span>
                <div className="category-icon-preview-box">
                  <CategoryIcon name={props.categoryIcon || "coffee"} size={20} />
                </div>
              </div>

              <input
                aria-label="Category Name"
                className="admin-input"
                maxLength={80}
                onChange={(e) => props.onCategoryNameChange(e.target.value)}
                placeholder={props.editingCategoryId ? "Rename category..." : "New category name..."}
                required
                value={props.categoryName}
              />
            </div>

            {/* Quick Icon Presets */}
            <div className="category-icon-presets">
              {CATEGORY_ICON_PRESETS.map((p) => (
                <button
                  className={`icon-preset-btn ${props.categoryIcon === p.icon ? "active" : ""}`}
                  key={p.label}
                  onClick={() => props.onCategoryIconChange(p.icon)}
                  title={p.label}
                  type="button"
                >
                  <CategoryIcon name={p.icon} size={17} />
                </button>
              ))}
            </div>

            <div className="category-form-actions">
              <button className="admin-btn primary" disabled={props.isBusy} type="submit">
                {props.editingCategoryId ? "Save Category" : "+ Add Category"}
              </button>
              {props.editingCategoryId && (
                <button
                  className="admin-btn secondary"
                  onClick={props.onCancelCategory}
                  type="button"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>
      </section>

      {/* 2. Add / Edit Menu Item Card */}
      <section className="admin-panel-card" id="item-editor-card">
        <div className="panel-header">
          <div>
            <span className="panel-eyebrow">Step 2: Create &amp; Edit</span>
            <h2>{props.itemId ? "Edit Menu Dish" : "Add New Dish"}</h2>
          </div>
          <p className="panel-desc">
            Set dish name, price in ₹, image, dietary tags (Veg/Non-Veg, Egg, Jain, Spicy, Bestseller), and optional size pricing variants (e.g. Regular / Large).
          </p>
        </div>

        <form className="admin-form-flow" onSubmit={props.onSaveItem}>
          <div className="form-row-two">
            <label className="admin-label">
              Category
              <select
                className="admin-input"
                onChange={(e) =>
                  props.onItemFormChange({ ...props.itemForm, categoryId: e.target.value })
                }
                required
                value={props.itemForm.categoryId}
              >
                <option value="">Select Category</option>
                {props.categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.icon ? `${c.icon} ` : ""}{c.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="admin-label">
              Dish Name
              <input
                className="admin-input"
                maxLength={120}
                onChange={(e) =>
                  props.onItemFormChange({ ...props.itemForm, name: e.target.value })
                }
                placeholder="e.g. Truffle Parmesan Fries"
                required
                value={props.itemForm.name}
              />
            </label>
          </div>

          <div className="form-row-two">
            <label className="admin-label">
              Base Price (₹ INR)
              <input
                className="admin-input"
                min="0"
                onChange={(e) =>
                  props.onItemFormChange({ ...props.itemForm, price: e.target.value })
                }
                placeholder="249"
                required
                step="1"
                type="number"
                value={props.itemForm.price}
              />
            </label>

            <label className="admin-label">
              Photo URL <span>(HTTPS Image)</span>
              <input
                className="admin-input"
                onChange={(e) =>
                  props.onItemFormChange({ ...props.itemForm, imageUrl: e.target.value })
                }
                placeholder="https://images.unsplash.com/..."
                type="url"
                value={props.itemForm.imageUrl}
              />
            </label>
          </div>

          {props.itemForm.imageUrl && (
            <div className="item-photo-preview-box">
              <span className="preview-label">Live Photo Preview:</span>
              <Image
                alt="Dish preview"
                className="item-photo-preview-img"
                height={80}
                src={props.itemForm.imageUrl}
                unoptimized
                width={80}
              />
            </div>
          )}

          <label className="admin-label">
            Description
            <textarea
              className="admin-textarea"
              maxLength={800}
              onChange={(e) =>
                props.onItemFormChange({ ...props.itemForm, description: e.target.value })
              }
              placeholder="Freshly prepared with artisan sourdough, whipped ricotta, and aromatic herbs..."
              rows={2}
              value={props.itemForm.description}
            />
          </label>

          {/* Quick Dietary Tags */}
          <div className="form-group-block">
            <label className="admin-label">Dietary &amp; Special Tags (1-Click Selection)</label>
            <div className="menu-tag-selector-row">
              {MENU_TAG_PRESETS.map((tag) => {
                const isSelected = props.itemForm.dietaryTags.includes(tag.label);
                return (
                  <button
                    className={`tag-toggle-btn ${isSelected ? "selected" : ""}`}
                    key={tag.label}
                    onClick={() => toggleTag(tag.label)}
                    type="button"
                  >
                    <span className="tag-color-indicator" style={{ width: 8, height: 8, borderRadius: "50%", background: tag.color, display: "inline-block", marginRight: 6 }} />
                    <span>{tag.label}</span>
                    {isSelected && <span className="tag-check" style={{ marginLeft: 6, display: "inline-flex", alignItems: "center" }}><Icon name="check" size={12} /></span>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Optional Pricing Variants (Regular / Large, Half / Full) */}
          <div className="form-group-block pricing-variants-block">
            <div className="variants-header-row">
              <div>
                <label className="admin-label">Pricing Variants <span>(Optional)</span></label>
                <p className="field-hint">
                  Specify different portion sizes or options (e.g. Regular: ₹199, Large: ₹299, or Half: ₹120, Full: ₹220).
                </p>
              </div>
              <button
                className="admin-btn secondary small"
                onClick={addPricingVariant}
                type="button"
              >
                + Add Portion / Size
              </button>
            </div>

            {props.itemForm.pricingVariants.length > 0 && (
              <div className="pricing-variants-builder">
                {props.itemForm.pricingVariants.map((variant, index) => (
                  <div className="variant-row" key={index}>
                    <input
                      aria-label="Variant Name"
                      className="admin-input variant-name"
                      onChange={(e) =>
                        updatePricingVariant(index, e.target.value, variant.price)
                      }
                      placeholder="e.g. Regular, Large, Half, Full"
                      value={variant.name}
                    />
                    <div className="variant-price-wrap">
                      <span className="price-prefix">₹</span>
                      <input
                        aria-label="Variant Price"
                        className="admin-input variant-price"
                        min="0"
                        onChange={(e) =>
                          updatePricingVariant(index, variant.name, Number(e.target.value))
                        }
                        placeholder="Price"
                        type="number"
                        value={variant.price || ""}
                      />
                    </div>
                    <button
                      className="variant-delete-btn"
                      onClick={() => removePricingVariant(index)}
                      title="Remove Variant"
                      type="button"
                    >
                      <Icon name="close" size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="form-row-two align-center">
            <label className="admin-checkbox-label">
              <input
                checked={props.itemForm.isAvailable}
                onChange={(e) =>
                  props.onItemFormChange({ ...props.itemForm, isAvailable: e.target.checked })
                }
                type="checkbox"
              />
              <span>Available to order (Uncheck if sold out for the day)</span>
            </label>

            <div className="editor-form-actions">
              {props.itemId && (
                <button
                  className="admin-btn secondary"
                  onClick={props.onCancelItem}
                  type="button"
                >
                  Cancel Edit
                </button>
              )}
              <button className="admin-btn primary" disabled={props.isBusy} type="submit">
                {props.itemId ? "Save Dish Changes" : "+ Add Dish to Menu"}
              </button>
            </div>
          </div>
        </form>
      </section>

      {/* 3. Items List with Search, Filter & Easy Reordering */}
      <section className="admin-panel-card">
        <div className="panel-header-split">
          <div>
            <span className="panel-eyebrow">All Items ({props.items.length})</span>
            <h2>Menu Dishes &amp; Instant Stock Control</h2>
          </div>

          <div className="list-filters-cluster">
            <select
              className="admin-input filter-cat-select"
              onChange={(e) => setSelectedFilterCategory(e.target.value)}
              value={selectedFilterCategory}
            >
              <option value="all">All Categories</option>
              {props.categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.icon ? `${c.icon} ` : ""}{c.name}
                </option>
              ))}
            </select>

            <input
              className="admin-input search-items-input"
              onChange={(e) => setItemSearchQuery(e.target.value)}
              placeholder="Search dishes..."
              type="search"
              value={itemSearchQuery}
            />
          </div>
        </div>

        {/* Category Bulk Controls when a category is selected */}
        {selectedFilterCategory !== "all" && (
          <div className="filter-bulk-banner">
            <span>
              Quick actions for <strong>{props.categories.find((c) => c.id === selectedFilterCategory)?.name}</strong>:
            </span>
            <div className="bulk-btn-group">
              <button
                className="admin-btn secondary small"
                onClick={() => props.onBulkAvailability(selectedFilterCategory, true)}
                type="button"
              >
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                  <Icon name="check" size={13} />
                  <span>Mark All In Stock</span>
                </span>
              </button>
              <button
                className="admin-btn secondary small danger"
                onClick={() => props.onBulkAvailability(selectedFilterCategory, false)}
                type="button"
              >
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                  <Icon name="close" size={13} />
                  <span>Mark All Sold Out</span>
                </span>
              </button>
            </div>
          </div>
        )}

        <div className="admin-items-table-wrap">
          {visibleItems.length === 0 ? (
            <p className="admin-empty-text">No items found matching this filter.</p>
          ) : (
            <div className="admin-items-list">
              {visibleItems.map((item, index) => {
                const categoryObj = props.categories.find((c) => c.id === item.category_id);
                return (
                  <div className="admin-item-card-row" key={item.id}>
                    {/* Reorder Buttons */}
                    <div className="item-reorder-buttons">
                      <button
                        aria-label="Move dish up"
                        className="reorder-arrow"
                        disabled={index === 0}
                        onClick={() => props.onMoveItem(item.id, -1)}
                        title="Move Up"
                        type="button"
                      >
                        <Icon name="chevron-up" size={11} />
                      </button>
                      <button
                        aria-label="Move dish down"
                        className="reorder-arrow"
                        disabled={index === visibleItems.length - 1}
                        onClick={() => props.onMoveItem(item.id, 1)}
                        title="Move Down"
                        type="button"
                      >
                        <Icon name="chevron-down" size={11} />
                      </button>
                    </div>

                    {item.image_url ? (
                      <Image
                        alt=""
                        className="item-thumbnail"
                        height={52}
                        src={item.image_url}
                        unoptimized
                        width={52}
                      />
                    ) : (
                      <div className="item-thumbnail placeholder">
                        <CategoryIcon name={categoryObj?.name || "plates"} size={22} />
                      </div>
                    )}

                    <div className="item-main-details">
                      <div className="item-title-line">
                        <strong>{item.name}</strong>
                        <span className="item-category-tag">
                          {categoryObj?.icon ? `${categoryObj.icon} ` : ""}{categoryObj?.name || "Category"}
                        </span>
                        {item.pricing_variants && item.pricing_variants.length > 0 && (
                          <span className="item-variant-badge">
                            {item.pricing_variants.length} sizes
                          </span>
                        )}
                      </div>

                      <div className="item-dietary-pills-row">
                        {item.dietary_tags.map((t) => (
                          <span className="item-mini-tag" key={t}>
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="item-price-col">
                      <strong>₹{item.price}</strong>
                    </div>

                    {/* 1-Click Availability Toggle */}
                    <div className="item-stock-toggle-col">
                      <button
                        className={`item-availability-pill ${item.is_available ? "in-stock" : "sold-out"}`}
                        onClick={() => props.onToggleAvailability(item)}
                        title="Click to toggle Available / Sold Out"
                        type="button"
                      >
                        {item.is_available ? "● In Stock" : "○ Sold Out"}
                      </button>
                    </div>

                    <div className="item-row-actions">
                      <button
                        className="item-btn edit"
                        onClick={() => props.onEditItem(item)}
                        type="button"
                      >
                        <IconEdit size={13} />
                        <span>Edit</span>
                      </button>
                      <button
                        className="item-btn delete"
                        onClick={() => props.onDeleteItem(item.id)}
                        type="button"
                      >
                        <IconDelete size={13} />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

/* =========================================================================
   D. TABLES & QR COMPONENT
   ========================================================================= */
type ManagedTable = {
  id: string;
  table_number: string;
  unique_code: string;
  is_active: boolean;
  created_at: string;
};

function TablesAdminSection({ restaurantId }: { restaurantId: string }) {
  const [tables, setTables] = useState<ManagedTable[]>([]);
  const [tableNumber, setTableNumber] = useState("");
  const [tablePrefix, setTablePrefix] = useState("Table ");
  const [bulkStart, setBulkStart] = useState("1");
  const [bulkEnd, setBulkEnd] = useState("10");
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [siteOrigin, setSiteOrigin] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [message, setMessage] = useState("");
  const [downloadingTableId, setDownloadingTableId] = useState<string | null>(null);
  const [qrTestResults, setQrTestResults] = useState<
    Record<string, { status: "testing" | "pass" | "fail"; message: string }>
  >({});

  function handleDownloadQr(id: string) {
    setDownloadingTableId(id);
    setTimeout(() => setDownloadingTableId(null), 2000);
  }

  async function testTableQr(table: ManagedTable) {
    const guestUrl = `${siteOrigin}/t/${table.unique_code}`;
    setQrTestResults((prev) => ({
      ...prev,
      [table.id]: { status: "testing", message: "Testing..." },
    }));

    try {
      window.open(guestUrl, "_blank", "noopener,noreferrer");
    } catch {
      // Browser popup might be blocked
    }

    try {
      const res = await fetch(guestUrl, { method: "HEAD", cache: "no-store" });
      if (res.ok || res.status === 200 || res.status === 304) {
        setQrTestResults((prev) => ({
          ...prev,
          [table.id]: { status: "pass", message: "Pass (200 OK)" },
        }));
        return;
      }
    } catch {
      // Fallback to GET
    }

    try {
      const getRes = await fetch(guestUrl, { method: "GET", cache: "no-store" });
      if (getRes.ok || getRes.status === 200) {
        setQrTestResults((prev) => ({
          ...prev,
          [table.id]: { status: "pass", message: "Pass (200 OK)" },
        }));
      } else {
        setQrTestResults((prev) => ({
          ...prev,
          [table.id]: { status: "fail", message: `Failed (${getRes.status})` },
        }));
      }
    } catch {
      setQrTestResults((prev) => ({
        ...prev,
        [table.id]: { status: "fail", message: "Check failed" },
      }));
    }
  }

  const loadTables = useCallback(async () => {
    if (!restaurantId) {
      setTables([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/${restaurantId}/tables`, {
        cache: "no-store",
      });
      const result = (await parseResponse(response)) as {
        tables: ManagedTable[];
        siteOrigin: string;
      };
      setTables(result.tables || []);
      setSiteOrigin(result.siteOrigin || window.location.origin);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load tables.");
    } finally {
      setIsLoading(false);
    }
  }, [restaurantId]);

  useEffect(() => {
    setSiteOrigin(window.location.origin);
    void loadTables();
  }, [loadTables]);

  async function createSingleTable(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!tableNumber.trim()) {
      setFormError("Table name is required.");
      return;
    }
    setIsBusy(true);
    setFormError("");
    setMessage("");
    try {
      const response = await fetch(`/api/admin/${restaurantId}/tables`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tableNumber: tableNumber.trim() }),
      });
      await parseResponse(response);
      setMessage(`Table "${tableNumber.trim()}" created successfully.`);
      setTableNumber("");
      await loadTables();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Could not create table.");
    } finally {
      setIsBusy(false);
    }
  }

  async function createBulkTables(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const start = Number(bulkStart);
    const end = Number(bulkEnd);
    if (!Number.isInteger(start) || !Number.isInteger(end)) {
      setFormError("Please enter valid start and end numbers.");
      return;
    }
    if (start > end) {
      setFormError("Start number cannot be greater than end number.");
      return;
    }
    if (end - start + 1 > 100) {
      setFormError("Cannot generate more than 100 tables at once.");
      return;
    }
    setIsBusy(true);
    setFormError("");
    setMessage("");
    try {
      const response = await fetch(`/api/admin/${restaurantId}/tables`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "bulk", start, end, prefix: tablePrefix }),
      });
      const result = (await parseResponse(response)) as { created: number };
      setMessage(`${result.created} table(s) generated.`);
      await loadTables();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Could not generate tables.");
    } finally {
      setIsBusy(false);
    }
  }

  async function toggleTableActive(table: ManagedTable) {
    setIsBusy(true);
    try {
      const response = await fetch(`/api/admin/${restaurantId}/tables`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: table.id, isActive: !table.is_active }),
      });
      await parseResponse(response);
      await loadTables();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not update table.");
    } finally {
      setIsBusy(false);
    }
  }

  async function deleteTable(id: string) {
    if (!window.confirm("Delete this table? Its QR code and NFC tag will stop working.")) return;
    setIsBusy(true);
    try {
      const response = await fetch(`/api/admin/${restaurantId}/tables?tableId=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      await parseResponse(response);
      await loadTables();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not delete table.");
    } finally {
      setIsBusy(false);
    }
  }

  async function copyNfcUrl(url: string, code: string) {
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      } else if (typeof document !== "undefined") {
        const textArea = document.createElement("textarea");
        textArea.value = url;
        textArea.style.position = "fixed";
        textArea.style.left = "-9999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
      }
    } catch {
      // headless or permission denied fallback
    }
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2500);
  }

  return (
    <div className="admin-tables-section">
      {formError && (
        <div className="admin-alert-banner error" role="alert" style={{ marginBottom: "16px" }}>
          <span>{formError}</span>
        </div>
      )}
      {message && <div className="admin-alert-banner success" style={{ marginBottom: "16px" }}>{message}</div>}

      <div className="admin-panel-card">
        <div className="panel-header">
          <div>
            <span className="panel-eyebrow">Smart Dining Space</span>
            <h2>Dining Tables, QR Codes &amp; NFC URLs</h2>
          </div>
          <p className="panel-desc">
            Each table gets its own unique digital menu link and QR code. Download table stand QR codes or copy links for NFC tag programming.
          </p>
        </div>

        {/* Add Tables row */}
        <div className="table-create-forms-grid">
          {/* Add single table with custom naming */}
          <form className="single-table-form" noValidate onSubmit={createSingleTable}>
            <h4>Add Single Table (Custom Name)</h4>
            <div className="input-with-btn">
              <input
                aria-label="Table name"
                className="admin-input"
                id="single-table-name-input"
                maxLength={40}
                onChange={(e) => setTableNumber(e.target.value)}
                placeholder="e.g. Table 1, Rooftop 4"
                value={tableNumber}
              />
              <button
                className="admin-btn primary"
                disabled={isBusy}
                style={{ whiteSpace: "nowrap", flexShrink: 0 }}
                type="submit"
              >
                + Add Table
              </button>
            </div>
            <span className="field-hint">Supports any naming style (Patio, Booth, Balcony, Terrace).</span>
          </form>

          {/* Bulk add with custom prefix */}
          <form className="bulk-table-form" onSubmit={createBulkTables}>
            <h4>Generate Range of Tables</h4>
            <div className="bulk-inputs-cluster">
              <div className="prefix-field-wrap">
                <label className="admin-field-label" htmlFor="range-prefix-input" style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "var(--theme-text-primary, #722F37)", marginBottom: "4px" }}>
                  Name prefix
                </label>
                <input
                  id="range-prefix-input"
                  aria-label="Name prefix"
                  className="admin-input small prefix-input"
                  maxLength={20}
                  onChange={(e) => setTablePrefix(e.target.value)}
                  placeholder="Prefix (e.g. Patio )"
                  style={{ minWidth: "160px", width: "160px" }}
                  value={tablePrefix}
                />
              </div>
              <div className="range-inputs-row">
                <input
                  id="range-start-input"
                  aria-label="Start table"
                  className="admin-input small"
                  min="1"
                  onChange={(e) => setBulkStart(e.target.value)}
                  type="number"
                  value={bulkStart}
                />
                <span>to</span>
                <input
                  id="range-end-input"
                  aria-label="End table"
                  className="admin-input small"
                  min="1"
                  onChange={(e) => setBulkEnd(e.target.value)}
                  type="number"
                  value={bulkEnd}
                />
                <button className="admin-btn secondary" disabled={isBusy} style={{ whiteSpace: "nowrap", flexShrink: 0 }} type="submit">
                  Generate Range
                </button>
              </div>
            </div>
            <span className="field-hint">e.g. &ldquo;Patio &rdquo; from 1 to 10 generates Patio 1, Patio 2...</span>
          </form>
        </div>

        {/* Table Cards Grid or State */}
        <div className="tables-grid-display">
          {isLoading ? (
            <div className="admin-loading-indicator" role="status" style={{ padding: "36px 0", textAlign: "center" }}>
              <p>Loading tables...</p>
            </div>
          ) : error ? (
            <div
              className="admin-error-retry-card full-width"
              role="alert"
              style={{
                width: "100%",
                padding: "28px 24px",
                background: "#fbf0f0",
                border: "1px solid #f2c6c6",
                borderRadius: "14px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "12px",
                textAlign: "center",
              }}
            >
              <div style={{ color: "#722F37" }}>
                <Icon name="alert" size={26} />
              </div>
              <div style={{ maxWidth: "480px" }}>
                <h3 style={{ margin: "0 0 6px", fontSize: "16px", color: "#722F37", fontWeight: 700 }}>
                  Could not load restaurant tables
                </h3>
                <p style={{ margin: 0, fontSize: "14px", color: "#5A252C", lineHeight: 1.5 }}>
                  {error}
                </p>
              </div>
              <button
                className="admin-btn primary"
                disabled={isLoading}
                onClick={() => void loadTables()}
                type="button"
                style={{ marginTop: "4px" }}
              >
                Retry
              </button>
            </div>
          ) : tables.length === 0 ? (
            <div
              className="admin-empty-tables-card admin-empty-state full-width"
              style={{
                width: "100%",
                padding: "44px 24px",
                textAlign: "center",
                background: "#FAF6F0",
                border: "1.5px dashed #D9CBB8",
                borderRadius: "16px",
                margin: "12px 0",
              }}
            >
              <div
                style={{
                  display: "inline-flex",
                  padding: 14,
                  borderRadius: "50%",
                  background: "#E8DCC6",
                  color: "#722F37",
                  marginBottom: 14,
                }}
              >
                <Icon name="table" size={30} />
              </div>
              <h3 style={{ margin: "0 0 8px", fontSize: "18px", fontWeight: 700, color: "#3C322C" }}>
                No tables created yet
              </h3>
              <p style={{ margin: "0 auto 16px", maxWidth: "480px", fontSize: "14px", color: "#4A3E38", lineHeight: 1.6 }}>
                Generate individual table links or a range of QR codes and tap-to-order NFC links above.
              </p>
              <button
                className="admin-btn primary"
                onClick={() => {
                  const input = document.getElementById("single-table-name-input");
                  if (input) {
                    input.focus();
                    if (!tableNumber) setTableNumber("Table 1");
                  }
                }}
                style={{ margin: "0 auto" }}
                type="button"
              >
                + Add your first table
              </button>
            </div>
          ) : (
            tables.map((table, tIdx) => {
              const guestUrl = `${siteOrigin}/t/${table.unique_code}`;
              const isCopied = copiedCode === table.unique_code;
              const isDownloading = downloadingTableId === table.id;
              const staggerClass = `motion-stagger-${Math.min(tIdx + 1, 8)}`;

              return (
                <div
                  className={`table-admin-card motion-fade-rise ${staggerClass} ${table.is_active ? "active" : "disabled"}`}
                  key={table.id}
                >
                  <div className="table-card-top">
                    <span className="table-card-number">{table.table_number}</span>
                    <button
                      className={`table-status-pill ${table.is_active ? "active" : "inactive"}`}
                      onClick={() => void toggleTableActive(table)}
                      title="Toggle active status"
                      type="button"
                    >
                      {table.is_active ? "● Active" : "○ Inactive"}
                    </button>
                  </div>

                  <div className="table-qr-link-preview">
                    <span className="nfc-label">NFC / QR Link:</span>
                    <code className="nfc-url-text">{guestUrl}</code>
                  </div>

                  <div className="table-card-actions">
                    <Link
                      className="table-link-btn"
                      href={guestUrl}
                      rel="noreferrer"
                      target="_blank"
                    >
                      Open Menu ↗
                    </Link>

                    <button
                      aria-label={`Test QR code for ${table.table_number}`}
                      className="table-link-btn test-qr-btn"
                      onClick={() => void testTableQr(table)}
                      title="Open and test live table URL"
                      type="button"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                        fontWeight: 600,
                        background:
                          qrTestResults[table.id]?.status === "pass"
                            ? "#EAF7EE"
                            : qrTestResults[table.id]?.status === "fail"
                              ? "#FDECEC"
                              : undefined,
                        borderColor:
                          qrTestResults[table.id]?.status === "pass"
                            ? "#2E7D32"
                            : qrTestResults[table.id]?.status === "fail"
                              ? "#D32F2F"
                              : undefined,
                        color:
                          qrTestResults[table.id]?.status === "pass"
                            ? "#1B5E20"
                            : qrTestResults[table.id]?.status === "fail"
                              ? "#C62828"
                              : undefined,
                      }}
                    >
                      {qrTestResults[table.id]?.status === "testing" ? (
                        <span>Testing...</span>
                      ) : qrTestResults[table.id]?.status === "pass" ? (
                        <>
                          <Icon name="check" size={13} />
                          <span>{qrTestResults[table.id].message}</span>
                        </>
                      ) : qrTestResults[table.id]?.status === "fail" ? (
                        <>
                          <Icon name="close" size={12} />
                          <span>{qrTestResults[table.id].message}</span>
                        </>
                      ) : (
                        <>
                          <Icon name="qr" size={13} />
                          <span>Test this QR</span>
                        </>
                      )}
                    </button>

                    {/* Multi-format QR Download buttons */}
                    <div className="table-qr-download-cluster" style={{ display: "inline-flex", gap: 4 }}>
                      <a
                        aria-label={`Download PNG QR code for ${table.table_number}`}
                        className="table-link-btn secondary"
                        download={`${table.table_number.replace(/\s+/g, "-")}-QR.png`}
                        href={`/api/admin/tables/${table.id}/qr?format=png`}
                        onClick={() => handleDownloadQr(table.id)}
                        title="Download PNG QR code"
                      >
                        {isDownloading ? (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
                            <Icon name="check" size={13} animate="draw" />
                            <span>Saved</span>
                          </span>
                        ) : (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
                            <Icon name="download" size={13} />
                            <span>PNG</span>
                          </span>
                        )}
                      </a>
                      <a
                        aria-label={`Download SVG QR code for ${table.table_number}`}
                        className="table-link-btn secondary"
                        download={`${table.table_number.replace(/\s+/g, "-")}-QR.svg`}
                        href={`/api/admin/tables/${table.id}/qr?format=svg`}
                        title="Download vector SVG"
                      >
                        <span>SVG</span>
                      </a>
                      <a
                        aria-label={`Download PDF table stand for ${table.table_number}`}
                        className="table-link-btn secondary"
                        download={`${table.table_number.replace(/\s+/g, "-")}-Stand.pdf`}
                        href={`/api/admin/tables/${table.id}/qr?format=pdf`}
                        title="Download print-ready PDF table stand"
                      >
                        <span>PDF</span>
                      </a>
                    </div>

                    <button
                      aria-label={`Copy link for ${table.table_number}`}
                      className={`table-link-btn nfc-copy ${isCopied ? "copied" : ""}`}
                      onClick={() => void copyNfcUrl(guestUrl, table.unique_code)}
                      title="Copy URL for NFC tag programming"
                      type="button"
                    >
                      {isCopied ? (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                          <Icon name="check" size={13} />
                          <span>Copied!</span>
                        </span>
                      ) : (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                          <Icon name="copy" size={13} />
                          <span>Copy Link</span>
                        </span>
                      )}
                    </button>
                    <button
                      aria-label={`Delete ${table.table_number}`}
                      className="table-delete-icon"
                      onClick={() => void deleteTable(table.id)}
                      title="Delete Table"
                      type="button"
                    >
                      <Icon name="close" size={12} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

/* =========================================================================
   E. LOYALTY SETTINGS COMPONENT
   ========================================================================= */
function LoyaltySettingsSection({
  restaurant,
  restaurantId,
  isBusy,
  onSave,
}: {
  restaurant: AdminDashboardData["restaurant"];
  restaurantId: string;
  isBusy: boolean;
  onSave: (payload: Record<string, unknown>) => Promise<unknown>;
}) {
  const [loyaltyEnabled, setLoyaltyEnabled] = useState(restaurant.loyalty_enabled);
  const [loyaltyType, setLoyaltyType] = useState<"stamps" | "points">(
    restaurant.loyalty_type || "stamps",
  );
  const [rewardGoal, setRewardGoal] = useState(restaurant.loyalty_reward_goal || 5);
  const [rewardDescription, setRewardDescription] = useState(
    restaurant.loyalty_reward_description || "Free Dessert or Chai",
  );
  const [pointsPerAmount, setPointsPerAmount] = useState(
    restaurant.loyalty_points_per_amount || 10,
  );
  const [pointsGoal, setPointsGoal] = useState(
    restaurant.loyalty_points_goal || 200,
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await onSave({
      loyaltyEnabled,
      loyaltyType,
      loyaltyRewardGoal: rewardGoal,
      loyaltyRewardDescription: rewardDescription.trim(),
      loyaltyPointsPerAmount: pointsPerAmount,
      loyaltyPointsGoal: pointsGoal,
    });
  }

  return (
    <div className="admin-loyalty-layout">
      <div className="admin-panel-card">
        <div className="panel-header">
          <div>
            <span className="panel-eyebrow">Customer Retention</span>
            <h2>Loyalty Program Rules &amp; Rewards</h2>
          </div>
          <p className="panel-desc">
            Turn one-time diners into regular customers using an instant phone-number reward card. Choose between a Stamp Card or Points System.
          </p>
        </div>

        <form className="admin-form-flow" onSubmit={handleSubmit}>
          {/* Main Enable Switch */}
          <div className="loyalty-toggle-block">
            <label className="loyalty-switch-label">
              <input
                checked={loyaltyEnabled}
                onChange={(e) => setLoyaltyEnabled(e.target.checked)}
                type="checkbox"
              />
              <span className="switch-text">
                <strong>Enable Customer Loyalty Program</strong>
                <small>Guests enter their 10-digit mobile number at the table to earn rewards.</small>
              </span>
            </label>
          </div>

          {/* Loyalty Type Selector */}
          <div className="form-group-block">
            <label className="admin-label">Loyalty Program Type</label>
            <div className="loyalty-type-cards-row">
              <label
                className={`loyalty-type-card ${loyaltyType === "stamps" ? "selected" : ""}`}
              >
                <input
                  checked={loyaltyType === "stamps"}
                  name="loyaltyType"
                  onChange={() => setLoyaltyType("stamps")}
                  type="radio"
                  value="stamps"
                />
                <div className="type-card-content">
                  <span className="type-card-icon"><Icon name="tag" size={20} /></span>
                  <strong>Stamp Card</strong>
                  <p>1 stamp per visit. Simple and best for cafes, bakeries, and quick bites.</p>
                </div>
              </label>

              <label
                className={`loyalty-type-card ${loyaltyType === "points" ? "selected" : ""}`}
              >
                <input
                  checked={loyaltyType === "points"}
                  name="loyaltyType"
                  onChange={() => setLoyaltyType("points")}
                  type="radio"
                  value="points"
                />
                <div className="type-card-content">
                  <span className="type-card-icon"><Icon name="loyalty" size={20} /></span>
                  <strong>Points System</strong>
                  <p>Earn points based on bill amount. Best for fine dining and family restaurants.</p>
                </div>
              </label>
            </div>
          </div>

          {/* Conditional Rules */}
          {loyaltyType === "stamps" ? (
            <div className="form-row-two">
              <label className="admin-label">
                Reward Goal (Visits / Stamps)
                <input
                  className="admin-input"
                  max={20}
                  min={2}
                  onChange={(e) => setRewardGoal(Number(e.target.value))}
                  required
                  type="number"
                  value={rewardGoal}
                />
                <span className="field-hint">Diners unlock their reward after this many visits (typically 5).</span>
              </label>

              <div className="stamp-preview-box">
                <span className="preview-label">Visual Stamp Card Preview:</span>
                <div className="preview-stamps-grid">
                  {Array.from({ length: Math.min(rewardGoal, 10) }).map((_, i) => (
                    <div className={`mini-stamp-slot ${i === 0 ? "filled" : ""}`} key={i}>
                      {i === 0 ? <Icon name="star" size={12} /> : i + 1}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="form-row-two">
              <label className="admin-label">
                Points Earned per ₹100 Spent
                <input
                  className="admin-input"
                  max={100}
                  min={1}
                  onChange={(e) => setPointsPerAmount(Number(e.target.value))}
                  required
                  type="number"
                  value={pointsPerAmount}
                />
                <span className="field-hint">e.g. 10 points for every ₹100 spent.</span>
              </label>

              <label className="admin-label">
                Points Required to Redeem Reward
                <input
                  className="admin-input"
                  max={10000}
                  min={10}
                  onChange={(e) => setPointsGoal(Number(e.target.value))}
                  required
                  type="number"
                  value={pointsGoal}
                />
                <span className="field-hint">e.g. 200 points to unlock reward.</span>
              </label>
            </div>
          )}

          {/* Reward Description */}
          <div className="form-group-block">
            <label className="admin-label">
              Reward Description (What the Diner Gets)
              <input
                className="admin-input"
                maxLength={120}
                onChange={(e) => setRewardDescription(e.target.value)}
                placeholder="e.g. Free Dessert or Coffee, ₹150 off next order"
                required
                value={rewardDescription}
              />
              <span className="field-hint">
                This exact text is displayed to guests on their digital loyalty card when they reach the goal.
              </span>
            </label>
          </div>

          <div className="form-submit-row">
            <button className="admin-btn primary large" disabled={isBusy} type="submit">
              {isBusy ? "Saving..." : "Save Loyalty Settings"}
            </button>
          </div>
        </form>
      </div>

      {/* Member Management Insights */}
      <LoyaltyAdminSection key={restaurantId} restaurantId={restaurantId} />
    </div>
  );
}

/* =========================================================================
   F. REVIEWS & FEEDBACK COMPONENT
   ========================================================================= */
function ReviewsSection({
  restaurant,
  restaurantId,
  isBusy,
  onSave,
}: {
  restaurant: AdminDashboardData["restaurant"];
  restaurantId: string;
  isBusy: boolean;
  onSave: (payload: Record<string, unknown>) => Promise<unknown>;
}) {
  const [googleReviewUrl, setGoogleReviewUrl] = useState(
    restaurant.google_review_url ?? "",
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await onSave({
      googleReviewUrl: googleReviewUrl.trim() || null,
    });
  }

  return (
    <div className="admin-reviews-layout">
      {/* 1. Google Review Setup Card */}
      <div className="admin-panel-card">
        <div className="panel-header">
          <div>
            <span className="panel-eyebrow">Raipur Reputation</span>
            <h2>Google Review Link &amp; Rating Booster</h2>
          </div>
          <p className="panel-desc">
            Direct your happy diners straight to your Google Maps listing to leave 5-star ratings.
          </p>
        </div>

        <form className="admin-form-flow" onSubmit={handleSubmit}>
          <label className="admin-label">
            Your Google Maps Review Shortlink
            <div className="input-with-btn">
              <input
                className="admin-input"
                onChange={(e) => setGoogleReviewUrl(e.target.value)}
                placeholder="https://g.page/r/... or https://maps.google.com/..."
                type="url"
                value={googleReviewUrl}
              />
              {googleReviewUrl && (
                <a
                  className="admin-btn secondary"
                  href={googleReviewUrl}
                  rel="noreferrer"
                  target="_blank"
                >
                  Test Link ↗
                </a>
              )}
            </div>
            <span className="field-hint">
              Find this in your Google Business Profile under &apos;Ask for reviews&apos;.
            </span>
          </label>

          <div className="form-submit-row">
            <button className="admin-btn primary" disabled={isBusy} type="submit">
              {isBusy ? "Saving..." : "Update Google Review Link"}
            </button>
          </div>
        </form>
      </div>

      {/* 2. Internal Feedback Log */}
      <FeedbackAdminSection key={restaurantId} restaurantId={restaurantId} />
    </div>
  );
}

/* =========================================================================
   G. ACCOUNT SETTINGS COMPONENT
   ========================================================================= */
function AccountSection({ userEmail }: { userEmail: string }) {
  return (
    <div className="admin-panel-card">
      <div className="panel-header">
        <div>
          <span className="panel-eyebrow">Signed In</span>
          <h2>Account Details</h2>
        </div>
      </div>
      <div className="account-info-box">
        <p>
          Logged in as: <strong>{userEmail}</strong>
        </p>
        <p>Your account is configured with administrator privileges for connected Raipur restaurant workspaces.</p>
        <div className="account-actions-row">
          <Link className="admin-btn secondary" href="/admin/forgot-password">
            Send Password Reset Link
          </Link>
          <Link className="admin-btn secondary" href="/privacy">
            Privacy Policy
          </Link>
          <Link className="admin-btn secondary" href="/terms">
            Terms of Service
          </Link>
        </div>
      </div>
    </div>
  );
}
