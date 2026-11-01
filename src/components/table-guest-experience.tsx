"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { GuestPageData, MenuItem, MenuCategory } from "@/lib/restaurant-data";
import { useRealtimeChannel, type ChannelTableConfig } from "@/hooks/use-realtime-table";
import LiveOrderTracker, {
  getPersistedOrder,
  persistOrder,
  clearPersistedOrder,
} from "@/components/live-order-tracker";
import GuestReservationModal from "@/components/guest-reservation-modal";
import {
  Icon,
  IconBag,
  IconAdd,
  IconRemove,
  IconOrder,
  IconBell,
  IconSearch,
  IconClose,
  IconWifi,
  IconMonogramT,
  IconBotanicalSprig,
  IconStar,
  IconVeg,
  IconPlates,
  IconClock,
  IconAlert,
  CategoryIcon,
} from "@/components/icons";

type CartLine = {
  item: MenuItem;
  quantity: number;
  instructions: string;
};

type GuestAction = "cart" | "loyalty" | "review" | "wifi" | "service" | null;

function formatPrice(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function TableGuestExperience({
  restaurant: initialRestaurant,
  categories: initialCategories,
  tableId,
  tableCode,
  tableLabel = "Table 1",
}: GuestPageData) {
  const [restaurant, setRestaurant] = useState(initialRestaurant);
  const [categories, setCategories] = useState<MenuCategory[]>(initialCategories);
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
  const [isReservationOpen, setIsReservationOpen] = useState(false);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [activeCategory, setActiveCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [vegOnly, setVegOnly] = useState(false);
  const [action, setAction] = useState<GuestAction>(null);
  const [orderPhone, setOrderPhone] = useState("");
  const [orderNotes, setOrderNotes] = useState("");
  const [orderError, setOrderError] = useState("");
  const [orderSuccess, setOrderSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serviceMessage, setServiceMessage] = useState("");

  // Service requests cooldown and state (anti-spam)
  const [waiterCooldown, setWaiterCooldown] = useState(0);
  const [billCooldown, setBillCooldown] = useState(0);
  const [isCallingWaiter, setIsCallingWaiter] = useState(false);
  const [isRequestingBill, setIsRequestingBill] = useState(false);
  const [copiedWifi, setCopiedWifi] = useState(false);

  // 1-second interval for service request cooldown timers
  useEffect(() => {
    if (waiterCooldown <= 0 && billCooldown <= 0) return;
    const timer = setInterval(() => {
      setWaiterCooldown((w) => (w > 0 ? w - 1 : 0));
      setBillCooldown((b) => (b > 0 ? b - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [waiterCooldown, billCooldown]);

  // Wi-Fi, service, ordering, reservation, and review availability flags
  const wifiDisplayName = restaurant.wifiName || restaurant.wifiSsid || "";
  const showWifi = restaurant.enableWifi !== false && Boolean(wifiDisplayName);
  const showCallWaiter = restaurant.enableCallWaiter !== false;
  const showRequestBill = restaurant.enableRequestBill !== false;
  const showMenu = restaurant.enableMenu !== false;
  const showOrdering = restaurant.enableOrdering !== false;
  const showReservations = restaurant.enableReservations !== false;
  const showGoogleReview = restaurant.enableGoogleReviews !== false && Boolean(restaurant.googleReviewUrl);
  const showFeedback = restaurant.enableFeedback !== false;
  const showReviewBtn = showGoogleReview || showFeedback;

  // Sync props if changed
  useEffect(() => {
    setRestaurant(initialRestaurant);
  }, [initialRestaurant]);

  useEffect(() => {
    setCategories(initialCategories);
  }, [initialCategories]);

  // Restore persisted active order from localStorage (valid for ~8 hours)
  useEffect(() => {
    const persisted = getPersistedOrder(restaurant.id);
    if (persisted?.orderId) {
      setActiveOrderId(persisted.orderId);
    }
  }, [restaurant.id]);

  // Silent refetch on reconnect or tab focus
  const silentRefetch = useCallback(async () => {
    try {
      const res = await fetch(`/api/guest/${restaurant.id}/menu`);
      if (res.ok) {
        const json = await res.json();
        if (json.restaurant) {
          setRestaurant((prev) => ({ ...prev, ...json.restaurant }));
        }
        if (json.categories && Array.isArray(json.categories)) {
          setCategories(json.categories);
        }
      }
    } catch {
      // Ignore background refetch failure
    }
  }, [restaurant.id]);

  const guestChannelConfigs = useMemo<ChannelTableConfig[]>(() => [
    {
      table: "menu_items",
      filter: `restaurant_id=eq.${restaurant.id}`,
      onInsert: (payload) => {
        const item = payload as Record<string, unknown>;
        setCategories((prev) =>
          prev.map((cat) => {
            if (cat.id === item.category_id) {
              const exists = cat.items.some((i) => i.id === item.id);
              if (exists) return cat;
              return {
                ...cat,
                items: [
                  ...cat.items,
                  {
                    id: String(item.id),
                    name: String(item.name || ""),
                    description: String(item.description || ""),
                    price: Number(item.price || 0),
                    imageUrl: String(item.image_url || ""),
                    dietaryTags: Array.isArray(item.dietary_tags) ? (item.dietary_tags as string[]) : [],
                    isAvailable: Boolean(item.is_available),
                  },
                ],
              };
            }
            return cat;
          }),
        );
      },
      onUpdate: (payload) => {
        const item = payload as Record<string, unknown>;
        setCategories((prev) =>
          prev.map((cat) => ({
            ...cat,
            items: cat.items.map((i) =>
              i.id === item.id
                ? {
                    ...i,
                    name: item.name !== undefined ? String(item.name) : i.name,
                    description: item.description !== undefined ? String(item.description || "") : i.description,
                    price: item.price !== undefined ? Number(item.price) : i.price,
                    imageUrl: item.image_url !== undefined ? String(item.image_url || "") : i.imageUrl,
                    dietaryTags: Array.isArray(item.dietary_tags) ? (item.dietary_tags as string[]) : i.dietaryTags,
                    isAvailable: item.is_available !== undefined ? Boolean(item.is_available) : i.isAvailable,
                  }
                : i,
            ),
          })),
        );
      },
      onDelete: (payload) => {
        const item = payload as Record<string, unknown>;
        setCategories((prev) =>
          prev.map((cat) => ({
            ...cat,
            items: cat.items.filter((i) => i.id !== item.id),
          })),
        );
      },
    },
    {
      table: "menu_categories",
      filter: `restaurant_id=eq.${restaurant.id}`,
      onInsert: (payload) => {
        const cat = payload as Record<string, unknown>;
        setCategories((prev) => {
          if (prev.some((c) => c.id === cat.id)) return prev;
          return [
            ...prev,
            {
              id: String(cat.id),
              name: String(cat.name || ""),
              icon: typeof cat.icon === "string" ? cat.icon : undefined,
              imageUrl: typeof cat.image_url === "string" ? cat.image_url : undefined,
              items: [],
            },
          ];
        });
      },
      onUpdate: (payload) => {
        const cat = payload as Record<string, unknown>;
        setCategories((prev) =>
          prev.map((c) =>
            c.id === cat.id
              ? {
                  ...c,
                  name: cat.name !== undefined ? String(cat.name) : c.name,
                  icon: typeof cat.icon === "string" ? cat.icon : c.icon,
                  imageUrl: typeof cat.image_url === "string" ? cat.image_url : c.imageUrl,
                }
              : c,
          ),
        );
      },
      onDelete: (payload) => {
        const cat = payload as Record<string, unknown>;
        setCategories((prev) => prev.filter((c) => c.id !== cat.id));
      },
    },
    {
      table: "restaurants",
      filter: `id=eq.${restaurant.id}`,
      onUpdate: (payload) => {
        const r = payload as Record<string, unknown>;
        setRestaurant((prev) => ({
          ...prev,
          name: typeof r.name === "string" ? r.name : prev.name,
          wifiName: typeof r.wifi_name === "string" ? r.wifi_name : prev.wifiName,
          wifiSsid: typeof r.wifi_ssid === "string" ? r.wifi_ssid : prev.wifiSsid,
          wifiPassword: typeof r.wifi_password === "string" ? r.wifi_password : prev.wifiPassword,
          enableWifi: r.enable_wifi !== undefined ? Boolean(r.enable_wifi) : prev.enableWifi,
          enableCallWaiter: r.enable_call_waiter !== undefined ? Boolean(r.enable_call_waiter) : prev.enableCallWaiter,
          enableRequestBill: r.enable_request_bill !== undefined ? Boolean(r.enable_request_bill) : prev.enableRequestBill,
          enableMenu: r.enable_menu !== undefined ? Boolean(r.enable_menu) : prev.enableMenu,
          enableOrdering: r.enable_ordering !== undefined ? Boolean(r.enable_ordering) : prev.enableOrdering,
          enableFeedback: r.enable_feedback !== undefined ? Boolean(r.enable_feedback) : prev.enableFeedback,
          enableGoogleReviews: r.enable_google_reviews !== undefined ? Boolean(r.enable_google_reviews) : prev.enableGoogleReviews,
          googleReviewUrl: typeof r.google_review_url === "string" ? r.google_review_url : prev.googleReviewUrl,
          logoUrl: typeof r.logo_url === "string" ? r.logo_url : prev.logoUrl,
          primaryColor: typeof r.primary_color === "string" ? r.primary_color : prev.primaryColor,
          enableReservations: r.enable_reservations !== undefined ? Boolean(r.enable_reservations) : prev.enableReservations,
        }));
      },
    },
  ], [restaurant.id]);

  const { status: guestRealtimeStatus } = useRealtimeChannel({
    channelName: `guest-menu-${restaurant.id}`,
    configs: guestChannelConfigs,
    onRefetchNeeded: silentRefetch,
  });

  const [brokenImages, setBrokenImages] = useState<Record<string, boolean>>({});

  // Feedback form state
  const [rating, setRating] = useState(5);
  const [feedbackComment, setFeedbackComment] = useState("");
  const [feedbackName, setFeedbackName] = useState("");
  const [feedbackPhone, setFeedbackPhone] = useState("");
  const [feedbackStatus, setFeedbackStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [feedbackMsg, setFeedbackMsg] = useState("");

  // Loyalty lookup / join state
  const [loyaltyPhone, setLoyaltyPhone] = useState("");
  const [loyaltyName, setLoyaltyName] = useState("");
  const [loyaltyMember, setLoyaltyMember] = useState<{
    fullName: string;
    stamps: number;
    rewardGoal: number;
  } | null>(null);
  const [loyaltyStatus, setLoyaltyStatus] = useState<"idle" | "busy" | "enrolled" | "error">("idle");
  const [loyaltyMsg, setLoyaltyMsg] = useState("");

  const trackedView = useRef("");

  const effectiveTableLabel = tableLabel || "Table 1";

  useEffect(() => {
    const viewKey = `${restaurant.id}:${tableId ?? ""}:${effectiveTableLabel}`;
    if (trackedView.current === viewKey) return;
    trackedView.current = viewKey;
    void fetch("/api/scans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ restaurantId: restaurant.id, tableId, tableLabel: effectiveTableLabel }),
      keepalive: true,
    }).catch(() => {
      // Ignore background tracking failure in demo
    });
  }, [restaurant.id, tableId, effectiveTableLabel]);

  // Cart calculations
  const itemCount = useMemo(
    () => cart.reduce((total, line) => total + line.quantity, 0),
    [cart],
  );
  const total = useMemo(
    () => cart.reduce((sum, line) => sum + line.item.price * line.quantity, 0),
    [cart],
  );

  // Check availability of items currently in cart against live categories
  const cartAvailabilityMap = useMemo(() => {
    const map = new Map<string, boolean>();
    for (const line of cart) {
      let isAvailable = false;
      for (const cat of categories) {
        const found = cat.items.find((i) => i.id === line.item.id);
        if (found) {
          isAvailable = found.isAvailable;
          break;
        }
      }
      map.set(line.item.id, isAvailable);
    }
    return map;
  }, [cart, categories]);

  const hasUnavailableCartItems = useMemo(
    () => Array.from(cartAvailabilityMap.values()).some((avail) => !avail),
    [cartAvailabilityMap],
  );

  // Motion state: bag icon gentle pulse on item add & live order status timeline
  const [orderTimelineStep, setOrderTimelineStep] = useState<number>(0);
  const [bagPulse, setBagPulse] = useState(false);
  const prevItemCountRef = useRef(itemCount);

  useEffect(() => {
    if (itemCount > prevItemCountRef.current) {
      setBagPulse(true);
      const timer = setTimeout(() => setBagPulse(false), 300);
      return () => clearTimeout(timer);
    }
    prevItemCountRef.current = itemCount;
  }, [itemCount]);

  useEffect(() => {
    if (orderTimelineStep === 1) {
      const t1 = setTimeout(() => setOrderTimelineStep(2), 5000);
      return () => clearTimeout(t1);
    } else if (orderTimelineStep === 2) {
      const t2 = setTimeout(() => setOrderTimelineStep(3), 10000);
      return () => clearTimeout(t2);
    }
  }, [orderTimelineStep]);

  // Cart operations
  function addItem(item: MenuItem) {
    setOrderSuccess("");
    setCart((current) => {
      const existing = current.find((line) => line.item.id === item.id);
      if (existing) {
        return current.map((line) =>
          line.item.id === item.id && line.quantity < 20
            ? { ...line, quantity: line.quantity + 1 }
            : line,
        );
      }
      return [...current, { item, quantity: 1, instructions: "" }];
    });
  }

  function decreaseItem(itemId: string) {
    setCart((current) => {
      const line = current.find((entry) => entry.item.id === itemId);
      if (!line) return current;
      if (line.quantity <= 1) {
        return current.filter((entry) => entry.item.id !== itemId);
      }
      return current.map((entry) =>
        entry.item.id === itemId ? { ...entry, quantity: entry.quantity - 1 } : entry,
      );
    });
  }

  function updateItemInstructions(itemId: string, instructions: string) {
    setCart((current) =>
      current.map((line) => (line.item.id === itemId ? { ...line, instructions } : line)),
    );
  }

  function getCartItemQuantity(itemId: string): number {
    return cart.find((line) => line.item.id === itemId)?.quantity ?? 0;
  }

  // Filter items
  const filteredCategories = useMemo(() => {
    return categories
      .map((cat) => {
        let items = cat.items;
        if (vegOnly) {
          items = items.filter((item) =>
            item.dietaryTags.some((tag) => tag.toLowerCase().includes("veg") && !tag.toLowerCase().includes("non")),
          );
        }
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          items = items.filter(
            (item) =>
              item.name.toLowerCase().includes(q) ||
              item.description.toLowerCase().includes(q) ||
              item.dietaryTags.some((tag) => tag.toLowerCase().includes(q)),
          );
        }
        return { ...cat, items };
      })
      .filter((cat) => {
        if (activeCategory !== "all" && cat.id !== activeCategory) return false;
        return cat.items.length > 0;
      });
  }, [categories, activeCategory, vegOnly, searchQuery]);

  const totalFilteredItems = useMemo(
    () => filteredCategories.reduce((sum, cat) => sum + cat.items.length, 0),
    [filteredCategories],
  );

  async function submitOrder(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (cart.length === 0 || isSubmitting || hasUnavailableCartItems) return;

    setIsSubmitting(true);
    setOrderError("");
    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          restaurantId: restaurant.id,
          tableId: tableId || "00000000-0000-4000-8000-000000000004",
          tableLabel: effectiveTableLabel,
          uniqueCode: tableCode || "demo-juniper-t1",
          phone: orderPhone,
          notes: orderNotes,
          items: cart.map((line) => ({
            menuItemId: line.item.id,
            quantity: line.quantity,
            specialInstructions: line.instructions,
          })),
        }),
      });
      const result: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        const message =
          typeof result === "object" &&
          result !== null &&
          "error" in result &&
          typeof result.error === "string"
            ? result.error
            : "We couldn't send your order. Please try again.";
        throw new Error(message);
      }

      setCart([]);
      setOrderPhone("");
      setOrderNotes("");
      setAction(null);
      setOrderSuccess(`Order placed for ${effectiveTableLabel}! Sent straight to the kitchen.`);

      const resObj = result as { order?: { id?: string } } | null;
      if (resObj?.order?.id) {
        setActiveOrderId(resObj.order.id);
        persistOrder(restaurant.id, resObj.order.id);
      } else {
        setOrderTimelineStep(1);
      }
      setTimeout(() => setOrderSuccess(""), 7000);
    } catch (error) {
      console.error("Guest order submission failed:", error);
      setOrderError(error instanceof Error ? error.message : "We couldn't send your order.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleCallWaiter() {
    if (waiterCooldown > 0 || isCallingWaiter) return;
    setIsCallingWaiter(true);
    try {
      const response = await fetch("/api/service-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          restaurantId: restaurant.id,
          tableId: tableId ?? null,
          tableLabel: effectiveTableLabel,
          type: "call_waiter",
        }),
      });
      const data = (await response.json().catch(() => null)) as { message?: string; error?: string } | null;
      if (!response.ok) {
        throw new Error(data?.error || "Could not call waiter.");
      }
      setServiceMessage(data?.message || `Waiter has been called for ${effectiveTableLabel}`);
      setWaiterCooldown(90); // 90s anti-spam cooldown
      if (action === "service") setAction(null);
      setTimeout(() => setServiceMessage(""), 6000);
    } catch (err) {
      setServiceMessage(err instanceof Error ? err.message : `Waiter called for ${effectiveTableLabel}`);
      setWaiterCooldown(90);
      setTimeout(() => setServiceMessage(""), 6000);
    } finally {
      setIsCallingWaiter(false);
    }
  }

  async function handleRequestBill() {
    if (billCooldown > 0 || isRequestingBill) return;
    setIsRequestingBill(true);
    try {
      const response = await fetch("/api/service-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          restaurantId: restaurant.id,
          tableId: tableId ?? null,
          tableLabel: effectiveTableLabel,
          type: "request_bill",
        }),
      });
      const data = (await response.json().catch(() => null)) as { message?: string; error?: string } | null;
      if (!response.ok) {
        throw new Error(data?.error || "Could not request bill.");
      }
      setServiceMessage(data?.message || `Bill requested for ${effectiveTableLabel}`);
      setBillCooldown(90); // 90s anti-spam cooldown
      if (action === "service") setAction(null);
      setTimeout(() => setServiceMessage(""), 6000);
    } catch (err) {
      setServiceMessage(err instanceof Error ? err.message : `Bill requested for ${effectiveTableLabel}`);
      setBillCooldown(90);
      setTimeout(() => setServiceMessage(""), 6000);
    } finally {
      setIsRequestingBill(false);
    }
  }

  async function handleCopyWifiPassword() {
    if (!restaurant.wifiPassword) return;
    try {
      await navigator.clipboard.writeText(restaurant.wifiPassword);
      setCopiedWifi(true);
      setTimeout(() => setCopiedWifi(false), 2500);
    } catch {
      // Fallback for browsers with restricted clipboard permissions
      const textarea = document.createElement("textarea");
      textarea.value = restaurant.wifiPassword;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand("copy");
        setCopiedWifi(true);
        setTimeout(() => setCopiedWifi(false), 2500);
      } catch (e) {
        console.warn("Failed to copy wifi password", e);
      }
      document.body.removeChild(textarea);
    }
  }

  async function handleFeedbackSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedbackStatus("sending");
    setFeedbackMsg("");
    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          restaurantId: restaurant.id,
          tableId: tableId ?? null,
          tableLabel: effectiveTableLabel,
          rating,
          comment: feedbackComment,
          guestName: feedbackName,
          phone: feedbackPhone,
        }),
      });
      if (!response.ok) throw new Error("Could not send feedback");
      setFeedbackStatus("sent");
      setFeedbackMsg("Thank you! Your feedback has been shared privately with management.");
      setTimeout(() => {
        setAction(null);
        setFeedbackStatus("idle");
        setFeedbackComment("");
      }, 3000);
    } catch {
      setFeedbackStatus("error");
      setFeedbackMsg("Could not submit feedback. Please try again.");
    }
  }

  async function handleLoyaltySubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoyaltyStatus("busy");
    setLoyaltyMsg("");
    try {
      const response = await fetch("/api/loyalty/enroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          restaurantId: restaurant.id,
          tableId: tableId ?? null,
          fullName: loyaltyName || "Valued Guest",
          phone: loyaltyPhone,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not join loyalty program");
      setLoyaltyMember({
        fullName: data.member?.fullName || loyaltyName || "Valued Guest",
        stamps: data.member?.stamps ?? 1,
        rewardGoal: data.member?.rewardGoal ?? restaurant.loyaltyRewardGoal ?? 5,
      });
      setLoyaltyStatus("enrolled");
      setLoyaltyMsg("Welcome to our rewards program!");
    } catch (err: unknown) {
      setLoyaltyStatus("error");
      setLoyaltyMsg(err instanceof Error ? err.message : "Could not sign in or enroll.");
    }
  }

  return (
    <div
      className="tabletap-guest-app"
      style={{ "--restaurant-primary": restaurant.primaryColor || "#722F37" } as React.CSSProperties}
    >
      {guestRealtimeStatus === "offline" && (
        <div className="guest-offline-banner" role="status" aria-live="polite">
          <IconAlert size={14} />
          <span>You are currently offline. Changes will automatically sync when connection returns.</span>
        </div>
      )}

      {/* 1. Top Bar: Table Badge Pill on Left, Search & Service Bell on Right */}
      <header className="guest-header">
        <div className="guest-header-inner">
          <div className="guest-table-badge">
            <span className="table-badge-t">
              <IconMonogramT size={13} />
            </span>
            <span className="badge-text">{effectiveTableLabel}</span>
          </div>

          <div className="guest-header-actions">
            {showReservations && (
              <button
                aria-label="Reserve a Table"
                className="guest-header-reserve-btn"
                onClick={() => setIsReservationOpen(true)}
                type="button"
              >
                <IconClock size={14} />
                <span>Reserve</span>
              </button>
            )}
            <button
              aria-label="Search dishes"
              className={`guest-circle-btn ${isSearchOpen ? "active" : ""}`}
              onClick={() => setIsSearchOpen((prev) => !prev)}
              type="button"
            >
              <IconSearch size={18} />
            </button>
            <button
              aria-label="Table service and assistance"
              className="guest-circle-btn"
              onClick={() => setAction("service")}
              type="button"
            >
              <IconBell size={18} />
              {(waiterCooldown > 0 || billCooldown > 0) && <span className="header-alert-dot" />}
            </button>
          </div>
        </div>
      </header>

      {/* 2. Brand Hero: Eyebrow + Restaurant Name + Botanical Sprig */}
      <section className="guest-brand-hero">
        <p className="guest-brand-eyebrow">
          {restaurant.tagline || "Specialty coffee · Raipur"}
        </p>
        <div className="guest-brand-row">
          <h1 className="guest-brand-name">{restaurant.name}</h1>
          <IconBotanicalSprig className="guest-botanical-sprig" size={44} />
        </div>
      </section>

      {/* Quick Table Actions: Connect to WiFi, Call Waiter, Request Bill, Reserve Table */}
      {(showWifi || showCallWaiter || showRequestBill || showReservations) && (
        <section aria-label="Table quick actions" className="table-quick-strip">
          {showReservations && (
            <button
              className="table-action-pill reserve"
              onClick={() => setIsReservationOpen(true)}
              type="button"
            >
              <IconClock size={14} className="pill-icon-svg" />
              <span className="pill-text">Reserve</span>
            </button>
          )}

          {showWifi && (
            <button
              className="table-action-pill wifi"
              onClick={() => setAction("wifi")}
              type="button"
            >
              <IconWifi size={14} className="pill-icon-svg" />
              <span className="pill-text">WiFi</span>
            </button>
          )}

          {showCallWaiter && (
            <button
              className={`table-action-pill waiter ${waiterCooldown > 0 ? "disabled" : ""}`}
              disabled={isCallingWaiter || waiterCooldown > 0}
              onClick={() => void handleCallWaiter()}
              type="button"
            >
              <IconBell size={14} className="pill-icon-svg" />
              <span className="pill-text">
                {isCallingWaiter
                  ? "Calling..."
                  : waiterCooldown > 0
                  ? `Waiter (${waiterCooldown}s)`
                  : "Call Waiter"}
              </span>
            </button>
          )}

          {showRequestBill && (
            <button
              className={`table-action-pill bill ${billCooldown > 0 ? "disabled" : ""}`}
              disabled={isRequestingBill || billCooldown > 0}
              onClick={() => void handleRequestBill()}
              type="button"
            >
              <IconOrder size={14} className="pill-icon-svg" />
              <span className="pill-text">
                {isRequestingBill
                  ? "Requesting..."
                  : billCooldown > 0
                  ? `Bill (${billCooldown}s)`
                  : "Request Bill"}
              </span>
            </button>
          )}

          {showReviewBtn && (
            <button
              className="table-action-pill review"
              onClick={() => setAction("review")}
              type="button"
            >
              <IconStar size={14} className="pill-icon-svg" />
              <span className="pill-text">Review</span>
            </button>
          )}
        </section>
      )}

      {/* Floating service / order alert banner if triggered */}
      {orderSuccess && (
        <aside aria-live="polite" className="guest-toast-banner success">
          <span className="toast-icon"><Icon name="check" size={14} animate="draw" /></span>
          <span>{orderSuccess}</span>
          <div className="toast-progress-bar" />
        </aside>
      )}
      {serviceMessage && (
        <aside aria-live="polite" className="guest-toast-banner info">
          <span className="toast-icon"><Icon name="bell" size={14} animate="swap" /></span>
          <span>{serviceMessage}</span>
          <div className="toast-progress-bar" />
        </aside>
      )}

      {/* Live Order Tracker (Phase 4: Real-time Live Order Tracking) */}
      {activeOrderId ? (
        <div className="guest-tracker-wrapper">
          <LiveOrderTracker
            initialOrder={null}
            onCallWaiter={handleCallWaiter}
            onDismiss={() => {
              setActiveOrderId(null);
              clearPersistedOrder(restaurant.id);
            }}
            orderId={activeOrderId}
            restaurantId={restaurant.id}
            tableCode={tableCode || ""}
            tableLabel={effectiveTableLabel}
          />
        </div>
      ) : orderTimelineStep > 0 ? (
        <section aria-label="Order status timeline" className="guest-order-status-card motion-fade-rise">
          <div className="status-card-header">
            <div className="status-card-title">
              <span className="status-eyebrow">LIVE STATUS · {effectiveTableLabel}</span>
              <h3>
                {orderTimelineStep === 1 && "Order Placed & Confirmed"}
                {orderTimelineStep === 2 && "Kitchen is Preparing"}
                {orderTimelineStep === 3 && "Order Ready to Serve"}
                {orderTimelineStep >= 4 && "Order Served · Enjoy Your Meal"}
              </h3>
            </div>
            <span className="status-badge">
              {orderTimelineStep === 1 ? "Sent to Kitchen" : orderTimelineStep === 2 ? "In the Works" : orderTimelineStep === 3 ? "Plated" : "Served"}
            </span>
          </div>

          <div className="order-timeline-track-wrap">
            <div className="order-timeline-progress-track">
              <div
                className="order-timeline-progress-fill"
                style={{ width: `${((orderTimelineStep - 1) / 3) * 100}%` }}
              />
            </div>
            <div className="order-timeline-steps">
              <div className={`timeline-step ${orderTimelineStep >= 1 ? "active" : ""}`}>
                <div className="step-icon-circle">
                  <Icon name="check" size={13} animate={orderTimelineStep === 1 ? "draw" : undefined} />
                </div>
                <span>Placed</span>
              </div>
              <div className={`timeline-step ${orderTimelineStep >= 2 ? "active" : ""}`}>
                <div className="step-icon-circle">
                  <Icon name="clock" size={13} animate={orderTimelineStep === 2 ? "swap" : undefined} />
                </div>
                <span>Preparing</span>
              </div>
              <div className={`timeline-step ${orderTimelineStep >= 3 ? "active" : ""}`}>
                <div className="step-icon-circle">
                  <Icon name="check-circle" size={13} animate={orderTimelineStep === 3 ? "swap" : undefined} />
                </div>
                <span>Ready</span>
              </div>
              <div className={`timeline-step ${orderTimelineStep >= 4 ? "active" : ""}`}>
                <div className="step-icon-circle">
                  <Icon name="check" size={13} animate={orderTimelineStep >= 4 ? "draw" : undefined} />
                </div>
                <span>Served</span>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {/* 2. Menu Navigation & Filters (Search + Veg toggle + Horizontal category pills) */}
      {!showMenu ? (
        <section className="guest-menu-offline-banner">
          <span className="offline-icon"><Icon name="order" size={24} /></span>
          <h2>Digital Menu Offline</h2>
          <p>
            Our kitchen is currently updating the digital menu. Please consult our staff for
            today&apos;s specials or service.
          </p>
        </section>
      ) : (
        <>
          <section className="guest-controls-bar">
            {/* Search and Veg toggle */}
            <div className="guest-search-row">
              <div className="guest-search-input-wrap">
                <IconSearch className="search-box-icon" size={17} />
                <input
                  aria-label="Search dishes"
                  className="guest-search-input"
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search coffee, tea, bakery, plates..."
                  type="search"
                  value={searchQuery}
                />
                {searchQuery && (
                  <button
                    aria-label="Clear search"
                    className="search-clear-btn"
                    onClick={() => setSearchQuery("")}
                    type="button"
                  >
                    <IconClose size={15} />
                  </button>
                )}
              </div>

              {/* Veg Only toggle */}
              <button
                aria-pressed={vegOnly}
                className={`veg-filter-pill ${vegOnly ? "active" : ""}`}
                onClick={() => setVegOnly(!vegOnly)}
                type="button"
              >
                <IconVeg size={14} />
                <span>Veg Only</span>
              </button>
            </div>

            {/* Category Squircles Scroller matching Page 1 & 2 */}
            <nav aria-label="Menu categories" className="guest-category-tabs">
              <button
                className={`category-squircle-tab ${activeCategory === "all" ? "active" : ""}`}
                onClick={(e) => {
                  setActiveCategory("all");
                  e.currentTarget.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
                }}
                type="button"
              >
                <div className="tab-icon-wrap">
                  <IconPlates size={26} />
                </div>
                <span className="tab-name">All</span>
                {activeCategory === "all" && <span className="tab-active-dot" />}
              </button>
              {categories.map((category) => (
                <button
                  className={`category-squircle-tab ${activeCategory === category.id ? "active" : ""}`}
                  key={category.id}
                  onClick={(e) => {
                    setActiveCategory(category.id);
                    e.currentTarget.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
                  }}
                  type="button"
                >
                  <div className="tab-icon-wrap">
                    <CategoryIcon name={category.name} size={26} />
                  </div>
                  <span className="tab-name">{category.name}</span>
                  {activeCategory === category.id && <span className="tab-active-dot" />}
                </button>
              ))}
            </nav>
          </section>

          {/* 3. Clean Digital Menu Cards matching Page 1 */}
          <main className="guest-menu-container">
            {totalFilteredItems === 0 ? (
              <div className="guest-empty-state">
                <CategoryIcon name="plates" size={40} className="empty-icon-svg" />
                <h3>No dishes found</h3>
                <p>Try clearing your search or filter to see more items.</p>
                <button
                  className="guest-btn-outline"
                  onClick={() => {
                    setSearchQuery("");
                    setVegOnly(false);
                    setActiveCategory("all");
                  }}
                  type="button"
                >
                  Reset filters
                </button>
              </div>
            ) : (
              filteredCategories.map((category) => (
                <section className="guest-category-group" key={category.id}>
                  <div className="guest-category-heading-row">
                    <h2 className="guest-category-heading">{category.name}</h2>
                    <span className="category-item-count">{category.items.length} items</span>
                  </div>

                  <div className="guest-cards-grid">
                    {category.items.map((item, itemIdx) => {
                      const qtyInCart = getCartItemQuantity(item.id);
                      const isVeg = item.dietaryTags.some(
                        (t) => t.toLowerCase().includes("veg") && !t.toLowerCase().includes("non"),
                      );
                      const isNonVeg = item.dietaryTags.some((t) => t.toLowerCase().includes("non-veg"));
                      const isBestseller = item.dietaryTags.some((t) => t.toLowerCase().includes("bestseller"));
                      const staggerClass = `motion-stagger-${Math.min(itemIdx + 1, 8)}`;

                      return (
                        <article
                          className={`guest-dish-card motion-fade-rise ${staggerClass}`}
                          key={`${category.id}-${item.id}`}
                        >
                          <div className="dish-card-thumb">
                            {item.imageUrl && !brokenImages[item.id] ? (
                              <div className="dish-img-wrap">
                                <Image
                                  alt={item.name}
                                  className="dish-img"
                                  height={88}
                                  loading="lazy"
                                  onError={() => {
                                    setBrokenImages((prev) => ({ ...prev, [item.id]: true }));
                                  }}
                                  src={item.imageUrl}
                                  unoptimized
                                  width={88}
                                />
                              </div>
                            ) : (
                              <div className="dish-illustration-box">
                                <CategoryIcon name={category.name} size={30} />
                              </div>
                            )}
                          </div>

                          <div className="dish-details">
                            <div className="dish-info-top">
                              <div className="dish-title-row">
                                <h3 className="dish-name">{item.name}</h3>
                                {isBestseller && <span className="dish-badge-bestseller">Bestseller</span>}
                              </div>
                              {item.description && <p className="dish-desc">{item.description}</p>}
                            </div>

                            <div className="dish-card-bottom-row">
                              <div className="dish-diet-price">
                                {isVeg && <IconVeg size={15} />}
                                {isNonVeg && <span className="non-veg-badge" />}
                                <span className="dish-price">{formatPrice(item.price)}</span>
                              </div>

                              {/* Ordering / Availability Control */}
                              {showOrdering ? (
                                item.isAvailable ? (
                                  qtyInCart > 0 ? (
                                    <div className="dish-stepper">
                                      <button
                                        aria-label={`Decrease ${item.name}`}
                                        className="stepper-btn"
                                        onClick={() => decreaseItem(item.id)}
                                        type="button"
                                      >
                                        <IconRemove size={13} />
                                      </button>
                                      <span className="stepper-count" key={qtyInCart}>{qtyInCart}</span>
                                      <button
                                        aria-label={`Increase ${item.name}`}
                                        className="stepper-btn"
                                        onClick={() => addItem(item)}
                                        type="button"
                                      >
                                        <IconAdd size={13} />
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      className="dish-add-btn"
                                      onClick={() => addItem(item)}
                                      type="button"
                                    >
                                      <IconAdd size={13} style={{ marginRight: 3, verticalAlign: -1 }} />
                                      <span>Add</span>
                                    </button>
                                  )
                                ) : (
                                  <span className="dish-sold-out">Sold out</span>
                                )
                              ) : (
                                <span className={item.isAvailable ? "dish-tag-available" : "dish-sold-out"}>
                                  {item.isAvailable ? "Available" : "Sold out"}
                                </span>
                              )}
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </section>
              ))
            )}
            <footer className="guest-menu-footer">
              <p className="powered-by">
                Powered by <a href="/" target="_blank" rel="noopener noreferrer">TableTap</a> · Smart Dining for Raipur
              </p>
            </footer>
          </main>
        </>
      )}

      {/* 4. Sticky Bottom Action Bar matching Page 1 */}
      {showOrdering && itemCount > 0 && (
        <footer className="guest-sticky-bottom-bar">
          <div className="bottom-bar-inner">
            <button
              aria-label="View Order and Cart"
              className="guest-bottom-dock-btn has-items"
              onClick={() => setAction("cart")}
              type="button"
            >
              <div className="dock-left">
                <div className={`dock-bag-wrap ${bagPulse ? "dock-bag-pulse" : ""}`}>
                  <IconBag size={21} />
                  <span className="dock-bag-badge">{itemCount}</span>
                </div>
                <div className="dock-order-info">
                  <span className="dock-order-label">Your order · {effectiveTableLabel}</span>
                  <strong className="dock-order-price" key={total}>{formatPrice(total)}</strong>
                </div>
              </div>

              <div className="dock-right">
                <span className="dock-view-text">View order</span>
                <span className="dock-arrow"><Icon name="arrow-right" size={14} /></span>
              </div>
            </button>
          </div>
        </footer>
      )}

      {/* 5. Modals / Action Sheets */}
      {action && (
        <div className="guest-modal-backdrop" onClick={() => setAction(null)} role="presentation">
          <section
            aria-modal="true"
            className="guest-sheet-container"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
          >
            {/* Sheet Header */}
            <div className="sheet-header">
              <div className="sheet-header-title">
                {action === "cart" && (
                  <>
                    <span className="sheet-eyebrow">{effectiveTableLabel}</span>
                    <h2>Your Order Cart</h2>
                  </>
                )}
                {action === "wifi" && (
                  <>
                    <span className="sheet-eyebrow">{restaurant.name}</span>
                    <h2>Connect to Wi-Fi</h2>
                  </>
                )}
                {action === "service" && (
                  <>
                    <span className="sheet-eyebrow">{effectiveTableLabel}</span>
                    <h2>Table Assistance</h2>
                  </>
                )}
                {action === "loyalty" && (
                  <>
                    <span className="sheet-eyebrow">{restaurant.name}</span>
                    <h2>Diner Loyalty Rewards</h2>
                  </>
                )}
                {action === "review" && (
                  <>
                    <span className="sheet-eyebrow">{restaurant.name}</span>
                    <h2>Share Your Experience</h2>
                  </>
                )}
              </div>
              <button
                aria-label="Close dialog"
                className="sheet-close-btn"
                onClick={() => setAction(null)}
                type="button"
              >
                <Icon name="close" size={15} />
              </button>
            </div>

            {/* A. CART SHEET */}
            {action === "cart" && (
              <div className="sheet-content">
                {cart.length === 0 ? (
                  <div className="cart-empty-view">
                    <p>Your cart is empty.</p>
                    <button className="guest-btn-primary" onClick={() => setAction(null)} type="button">
                      Browse Menu
                    </button>
                  </div>
                ) : (
                  <form onSubmit={(e) => void submitOrder(e)}>
                    <div className="cart-items-list">
                      {cart.map((line) => {
                        const isLineAvailable = cartAvailabilityMap.get(line.item.id) ?? true;
                        return (
                          <div className={`cart-item-row ${!isLineAvailable ? "item-sold-out" : ""}`} key={line.item.id}>
                            <div className="cart-item-top">
                              <div className="cart-item-info">
                                <div className="cart-item-title-wrap">
                                  <h4>{line.item.name}</h4>
                                  {!isLineAvailable && (
                                    <span className="cart-sold-out-pill">No longer available</span>
                                  )}
                                </div>
                                <span className="cart-item-unit">{formatPrice(line.item.price)} each</span>
                              </div>
                              <span className="cart-item-subtotal">
                                {formatPrice(line.item.price * line.quantity)}
                              </span>
                            </div>

                            <div className="cart-item-controls">
                              <div className="cart-stepper">
                                <button
                                  aria-label="Decrease quantity"
                                  onClick={() => decreaseItem(line.item.id)}
                                  type="button"
                                >
                                  −
                                </button>
                                <span>{line.quantity}</span>
                                <button
                                  aria-label="Increase quantity"
                                  disabled={!isLineAvailable}
                                  onClick={() => addItem(line.item)}
                                  type="button"
                                >
                                  +
                                </button>
                              </div>

                              <input
                                aria-label="Item special request"
                                className="cart-inst-input"
                                maxLength={200}
                                onChange={(e) => updateItemInstructions(line.item.id, e.target.value)}
                                placeholder="Note: less spicy, jain, etc."
                                type="text"
                                value={line.instructions}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {hasUnavailableCartItems && (
                      <div className="cart-unavailable-warning" role="alert">
                        <Icon name="alert-triangle" size={15} />
                        <span>Some items in your cart are now sold out. Please remove them to proceed.</span>
                      </div>
                    )}

                    <div className="cart-notes-block">
                      <label className="sheet-label">
                        Special Cooking Instructions <span>(Optional)</span>
                        <textarea
                          className="sheet-textarea"
                          maxLength={500}
                          onChange={(e) => setOrderNotes(e.target.value)}
                          placeholder="e.g. Please bring drinks first, extra napkins"
                          rows={2}
                          value={orderNotes}
                        />
                      </label>

                      <label className="sheet-label">
                        Mobile Number <span>(For Order Status &amp; Loyalty)</span>
                        <input
                          autoComplete="tel"
                          className="sheet-input"
                          inputMode="tel"
                          maxLength={15}
                          onChange={(e) => setOrderPhone(e.target.value)}
                          placeholder="98765 43210"
                          type="tel"
                          value={orderPhone}
                        />
                      </label>
                    </div>

                    {orderError && <p className="sheet-error-msg">{orderError}</p>}

                    <div className="cart-checkout-footer">
                      <div className="checkout-summary-row">
                        <span>Total Payable at Table:</span>
                        <strong>{formatPrice(total)}</strong>
                      </div>
                      <button
                        className="guest-btn-primary full-width"
                        disabled={isSubmitting || hasUnavailableCartItems || cart.length === 0}
                        type="submit"
                      >
                        {isSubmitting ? "Placing Order..." : `Place Order · ${effectiveTableLabel}`}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}

            {/* B. WI-FI SHEET */}
            {action === "wifi" && (
              <div className="sheet-content wifi-sheet">
                <div className="wifi-hero-card">
                  <div className="wifi-hero-icon-wrap">
                    <IconWifi size={32} className="wifi-big-icon" />
                  </div>
                  <h3>{restaurant.name}</h3>
                  <p className="wifi-sub-text">Connect to our complimentary guest Wi-Fi</p>
                </div>

                <div className="wifi-details-card">
                  <div className="wifi-field">
                    <span className="wifi-field-label">Wi-Fi Network Name (SSID)</span>
                    <div className="wifi-field-value-row">
                      <strong className="wifi-ssid-value">{wifiDisplayName}</strong>
                    </div>
                  </div>

                  <div className="wifi-field">
                    <span className="wifi-field-label">Wi-Fi Password</span>
                    <div className="wifi-password-box">
                      <code className="wifi-password-value">
                        {restaurant.wifiPassword || "No password needed (Open Network)"}
                      </code>
                      {restaurant.wifiPassword && (
                        <button
                          aria-label="Copy Wi-Fi password"
                          className={`btn-copy-pwd ${copiedWifi ? "copied" : ""}`}
                          onClick={() => void handleCopyWifiPassword()}
                          type="button"
                        >
                          {copiedWifi ? (
                            <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                              <Icon name="check" size={13} />
                              <span>Copied!</span>
                            </span>
                          ) : (
                            "Copy"
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="wifi-instructions-box">
                  <div className="instruction-icon-wrap">
                    <IconMonogramT size={20} />
                  </div>
                  <div className="instruction-text">
                    <strong>Connect to this WiFi network:</strong>
                    <ol className="wifi-steps-list">
                      <li>Open your phone&apos;s <strong>Settings &gt; Wi-Fi</strong>.</li>
                      <li>Select <strong>{wifiDisplayName}</strong> from available networks.</li>
                      {restaurant.wifiPassword ? (
                        <li>Tap <strong>Copy</strong> above and paste the password when prompted.</li>
                      ) : (
                        <li>Tap connect to join directly.</li>
                      )}
                    </ol>
                  </div>
                </div>

                <button
                  className="guest-btn-primary full-width"
                  onClick={() => setAction(null)}
                  type="button"
                >
                  Done
                </button>
              </div>
            )}

            {/* C. SERVICE CALL SHEET (Call Waiter / Request Bill) */}
            {action === "service" && (
              <div className="sheet-content service-sheet">
                <p className="service-intro">
                  Need something at <strong>{effectiveTableLabel}</strong>? Tap below and our staff will be notified instantly.
                </p>

                <div className="service-options-grid">
                  {showCallWaiter && (
                    <button
                      className={`service-card-btn ${waiterCooldown > 0 ? "disabled" : ""}`}
                      disabled={isCallingWaiter || waiterCooldown > 0}
                      onClick={() => void handleCallWaiter()}
                      type="button"
                    >
                      <span className="service-card-icon">
                        {isCallingWaiter ? <Icon name="clock" size={24} /> : <Icon name="bell-service" size={24} />}
                      </span>
                      <div>
                        <strong>
                          {isCallingWaiter
                            ? "Calling waiter..."
                            : waiterCooldown > 0
                            ? `Waiter Called (${waiterCooldown}s)`
                            : "Call Waiter"}
                        </strong>
                        <span>
                          {waiterCooldown > 0
                            ? "Staff has been alerted, please wait a moment"
                            : "Ask for assistance or recommendations"}
                        </span>
                      </div>
                    </button>
                  )}

                  {showRequestBill && (
                    <button
                      className={`service-card-btn ${billCooldown > 0 ? "disabled" : ""}`}
                      disabled={isRequestingBill || billCooldown > 0}
                      onClick={() => void handleRequestBill()}
                      type="button"
                    >
                      <span className="service-card-icon">
                        {isRequestingBill ? <Icon name="clock" size={24} /> : <Icon name="bill" size={24} />}
                      </span>
                      <div>
                        <strong>
                          {isRequestingBill
                            ? "Requesting bill..."
                            : billCooldown > 0
                            ? `Bill Requested (${billCooldown}s)`
                            : "Request Bill"}
                        </strong>
                        <span>
                          {billCooldown > 0
                            ? "Staff is bringing your bill and payment option"
                            : "Get bill copy and payment terminal"}
                        </span>
                      </div>
                    </button>
                  )}

                  {showWifi && (
                    <button
                      className="service-card-btn"
                      onClick={() => setAction("wifi")}
                      type="button"
                    >
                      <span className="service-card-icon">
                        <IconWifi size={24} />
                      </span>
                      <div>
                        <strong>Connect to Wi-Fi</strong>
                        <span>View network SSID: {wifiDisplayName}</span>
                      </div>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* C. LOYALTY SHEET */}
            {action === "loyalty" && (
              <div className="sheet-content loyalty-sheet">
                <div className="loyalty-header-badge">
                  <span className="loyalty-badge-star"><Icon name="star" size={14} /></span>
                  <div>
                    <h3>{restaurant.name} Rewards</h3>
                    {restaurant.loyaltyType === "points" ? (
                      <p>
                        Earn {restaurant.loyaltyPointsPerAmount || 10} points per ₹100. Goal:{" "}
                        {restaurant.loyaltyPointsGoal || 200} points for{" "}
                        <strong>{restaurant.loyaltyRewardDescription || "your complimentary treat"}</strong>!
                      </p>
                    ) : (
                      <p>
                        Collect {restaurant.loyaltyRewardGoal || 5} stamps to unlock{" "}
                        <strong>{restaurant.loyaltyRewardDescription || "your complimentary treat"}</strong>!
                      </p>
                    )}
                  </div>
                </div>

                {loyaltyMember ? (
                  <div className="loyalty-card-visual">
                    <h4>Member: {loyaltyMember.fullName}</h4>
                    <div className="stamp-grid">
                      {Array.from({ length: loyaltyMember.rewardGoal }).map((_, index) => {
                        const isFilled = index < loyaltyMember.stamps;
                        return (
                          <div
                            className={`stamp-slot ${isFilled ? "filled" : ""}`}
                            key={index}
                          >
                            {isFilled ? <Icon name="check" size={13} /> : index + 1}
                          </div>
                        );
                      })}
                    </div>
                    <p className="stamp-status-text">
                      {loyaltyMember.stamps >= loyaltyMember.rewardGoal ? (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                          <Icon name="sparkle" size={15} />
                          <span>Congratulations! Show this to staff to redeem your reward.</span>
                        </span>
                      ) : (
                        `${loyaltyMember.stamps} of ${loyaltyMember.rewardGoal} stamps collected.`
                      )}
                    </p>
                  </div>
                ) : (
                  <form onSubmit={(e) => void handleLoyaltySubmit(e)}>
                    <label className="sheet-label">
                      Your Name
                      <input
                        className="sheet-input"
                        maxLength={100}
                        onChange={(e) => setLoyaltyName(e.target.value)}
                        placeholder="e.g. Rahul Sharma"
                        required
                        type="text"
                        value={loyaltyName}
                      />
                    </label>

                    <label className="sheet-label">
                      Mobile Number
                      <input
                        className="sheet-input"
                        inputMode="tel"
                        maxLength={15}
                        onChange={(e) => setLoyaltyPhone(e.target.value)}
                        placeholder="98765 43210"
                        required
                        type="tel"
                        value={loyaltyPhone}
                      />
                    </label>

                    {loyaltyMsg && (
                      <p className={`sheet-status-msg ${loyaltyStatus}`}>{loyaltyMsg}</p>
                    )}

                    <button
                      className="guest-btn-primary full-width"
                      disabled={loyaltyStatus === "busy"}
                      type="submit"
                    >
                      {loyaltyStatus === "busy" ? "Checking card..." : "View / Start Loyalty Card"}
                    </button>
                  </form>
                )}
              </div>
            )}

            {/* D. REVIEW SHEET (Google Review + Private Feedback) */}
            {action === "review" && (
              <div className="sheet-content review-sheet">
                {/* 1. Google Review Direct Button */}
                {showGoogleReview && (
                  <div className="google-review-callout">
                    <div className="google-icon-row">
                      <span className="google-g">G</span>
                      <div className="stars-row">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <IconStar key={s} size={16} fill="currentColor" />
                        ))}
                      </div>
                    </div>
                    <h3>Help {restaurant.name} on Google!</h3>
                    <p>Your honest review on Google helps other diners in Raipur discover our kitchen.</p>
                    <a
                      className="google-btn"
                      href={restaurant.googleReviewUrl!}
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      <IconStar size={15} fill="currentColor" /> Write a Google Review ↗
                    </a>
                  </div>
                )}

                {showGoogleReview && showFeedback && (
                  <div className="divider-text">
                    <span>OR SEND PRIVATE FEEDBACK TO THE MANAGER</span>
                  </div>
                )}

                {/* 2. Private Feedback Form */}
                {showFeedback && (
                <form onSubmit={(e) => void handleFeedbackSubmit(e)}>
                  <div className="rating-select-row">
                    <span>Your Rating:</span>
                    <div className="star-rating-buttons">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          className={`star-btn ${rating >= star ? "active" : ""}`}
                          key={star}
                          onClick={() => setRating(star)}
                          type="button"
                        >
                          <IconStar size={18} fill={rating >= star ? "currentColor" : "none"} />
                        </button>
                      ))}
                    </div>
                  </div>

                  <label className="sheet-label">
                    Your Thoughts
                    <textarea
                      className="sheet-textarea"
                      maxLength={1000}
                      onChange={(e) => setFeedbackComment(e.target.value)}
                      placeholder="What did you love or how can we improve?"
                      rows={3}
                      value={feedbackComment}
                    />
                  </label>

                  <div className="sheet-two-col">
                    <label className="sheet-label">
                      Your Name <span>(Optional)</span>
                      <input
                        className="sheet-input"
                        maxLength={60}
                        onChange={(e) => setFeedbackName(e.target.value)}
                        placeholder="Name"
                        type="text"
                        value={feedbackName}
                      />
                    </label>

                    <label className="sheet-label">
                      Phone Number <span>(Optional)</span>
                      <input
                        className="sheet-input"
                        maxLength={15}
                        onChange={(e) => setFeedbackPhone(e.target.value)}
                        placeholder="Phone"
                        type="tel"
                        value={feedbackPhone}
                      />
                    </label>
                  </div>

                  {feedbackMsg && (
                    <p className={`sheet-status-msg ${feedbackStatus}`}>{feedbackMsg}</p>
                  )}

                  <button
                    className="guest-btn-primary full-width"
                    disabled={feedbackStatus === "sending"}
                    type="submit"
                  >
                    {feedbackStatus === "sending" ? "Submitting..." : "Send Private Feedback"}
                  </button>
                </form>
                )}
              </div>
            )}
          </section>
        </div>
      )}

      {showReservations && (
        <GuestReservationModal
          isOpen={isReservationOpen}
          onClose={() => setIsReservationOpen(false)}
          restaurantId={restaurant.id}
          restaurantName={restaurant.name}
        />
      )}
    </div>
  );
}
