"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { Database } from "@/lib/database.types";
import {
  useRealtimeTable,
  useRealtimeChannel,
  type RealtimeConnectionStatus,
} from "@/hooks/use-realtime-table";
import {
  getSoundPreference,
  setSoundPreference,
  playOrderAlertChime,
} from "@/lib/kitchen-sound";
import {
  Icon,
  IconBell,
  IconClock,
  IconServed,
  IconOrder,
  IconSettings,
} from "@/components/icons";

type RestaurantOption = {
  id: string;
  name: string;
};

type KitchenOrder = Database["public"]["Tables"]["orders"]["Row"] & {
  items: Database["public"]["Tables"]["order_items"]["Row"][];
};

type Filter = "all" | "pending" | "preparing" | "ready" | "served";
type Status = KitchenOrder["status"];

const filters: { id: Filter; label: string }[] = [
  { id: "all", label: "All Active" },
  { id: "pending", label: "New / Pending" },
  { id: "preparing", label: "Preparing" },
  { id: "ready", label: "Ready to Serve" },
  { id: "served", label: "Served History" },
];

function currency(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(amount));
}

function nextStatus(status: Status): Status | null {
  if (status === "pending") return "preparing";
  if (status === "preparing") return "ready";
  if (status === "ready") return "served";
  return null;
}

/**
 * Computes per-order timer duration in the current status ("Preparing · 4 min")
 */
function formatStatusDuration(order: KitchenOrder, now: number): string {
  const timestamp = order.status_updated_at || order.updated_at || order.created_at;
  const minutes = Math.max(0, Math.floor((now - new Date(timestamp).getTime()) / 60_000));
  const durationText =
    minutes < 1
      ? "Just now"
      : minutes < 60
        ? `${minutes} min`
        : `${Math.floor(minutes / 60)}h ${minutes % 60}m`;

  const statusLabels: Record<Status, string> = {
    pending: "New",
    preparing: "Preparing",
    ready: "Ready",
    served: "Served",
    cancelled: "Cancelled",
  };
  const label = statusLabels[order.status] ?? order.status;
  return `${label} · ${durationText}`;
}

type ServiceRequest = {
  id: string;
  restaurant_id: string;
  table_id: string | null;
  table_number: string;
  type: "call_waiter" | "request_bill";
  status: "pending" | "acknowledged" | "completed";
  created_at: string;
  updated_at: string;
};

type ToastMessage = {
  id: string;
  type: "error" | "info" | "success";
  text: string;
};

export default function KitchenDisplay({
  restaurants,
  initialRestaurantId,
  isStaffSession = false,
}: {
  restaurants: RestaurantOption[];
  initialRestaurantId: string;
  isStaffSession?: boolean;
}) {
  const [restaurantId, setRestaurantId] = useState(initialRestaurantId);
  const [filter, setFilter] = useState<Filter>("all");
  const [busyOrderId, setBusyOrderId] = useState("");
  const [busyRequestId, setBusyRequestId] = useState("");
  const [now, setNow] = useState(Date.now());
  const [newOrderIds, setNewOrderIds] = useState<Set<string>>(new Set());
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  // Initialize sound preference from localStorage
  useEffect(() => {
    setSoundEnabled(getSoundPreference());
  }, []);

  // Timer: Tick locally every 30s to update live duration badges and clock
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  // Auto-dismiss error toasts after 6s
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 6_000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const showToast = useCallback((text: string, type: "error" | "info" | "success" = "error") => {
    setToast({ id: String(Date.now()), text, type });
  }, []);

  // 1. Fetch function for orders
  const loadOrders = useCallback(async (): Promise<KitchenOrder[]> => {
    const response = await fetch(`/api/kitchen/${restaurantId}/orders`, {
      cache: "no-store",
    });
    const result: unknown = await response.json().catch(() => null);
    if (!response.ok) {
      const message =
        typeof result === "object" &&
        result !== null &&
        "error" in result &&
        typeof result.error === "string"
          ? result.error
          : "Could not load kitchen orders.";
      throw new Error(message);
    }
    if (
      typeof result !== "object" ||
      result === null ||
      !("orders" in result) ||
      !Array.isArray(result.orders)
    ) {
      throw new Error("Invalid kitchen orders response from server.");
    }
    return result.orders as KitchenOrder[];
  }, [restaurantId]);

  // 2. Fetch function for service requests
  const loadServiceRequests = useCallback(async (): Promise<ServiceRequest[]> => {
    const response = await fetch(`/api/kitchen/${restaurantId}/service-requests`, {
      cache: "no-store",
    });
    const result: unknown = await response.json().catch(() => null);
    if (!response.ok) {
      const message =
        typeof result === "object" &&
        result !== null &&
        "error" in result &&
        typeof result.error === "string"
          ? result.error
          : "Could not load service requests.";
      throw new Error(message);
    }
    if (
      typeof result !== "object" ||
      result === null ||
      !("requests" in result) ||
      !Array.isArray(result.requests)
    ) {
      return [];
    }
    return result.requests as ServiceRequest[];
  }, [restaurantId]);

  // 3. Realtime orders subscription via useRealtimeTable
  const {
    data: orders,
    setData: setOrders,
    status: ordersStatus,
    isLoading: isOrdersLoading,
    error: ordersError,
    refetch: refetchOrders,
  } = useRealtimeTable<KitchenOrder>({
    table: "orders",
    restaurantId,
    fetchData: loadOrders,
    transformInsert: async (rawOrder) => {
      // If the incoming order row doesn't have order_items attached, fetch this single order with items
      try {
        const response = await fetch(
          `/api/kitchen/${restaurantId}/orders?orderId=${rawOrder.id}`,
          { cache: "no-store" },
        );
        if (response.ok) {
          const json = await response.json().catch(() => null);
          if (json && json.order) {
            return json.order as KitchenOrder;
          }
        }
      } catch (err) {
        console.warn("[Kitchen] Single order enrichment error:", err);
      }
      return {
        ...rawOrder,
        items: [],
      } as unknown as KitchenOrder;
    },
    onInsert: (newOrder) => {
      // Highlight card with subtle entrance animation
      setNewOrderIds((prev) => new Set([...prev, newOrder.id]));
      setTimeout(() => {
        setNewOrderIds((prev) => {
          const next = new Set(prev);
          next.delete(newOrder.id);
          return next;
        });
      }, 5_000);

      // Play alert chime if enabled
      if (getSoundPreference()) {
        void playOrderAlertChime();
      }
    },
  });

  // 4. Realtime service requests subscription via useRealtimeTable
  const {
    data: serviceRequests,
    setData: setServiceRequests,
    status: serviceRequestsStatus,
    refetch: refetchServiceRequests,
  } = useRealtimeTable<ServiceRequest>({
    table: "service_requests",
    restaurantId,
    fetchData: loadServiceRequests,
    onInsert: () => {
      if (getSoundPreference()) {
        void playOrderAlertChime();
      }
    },
  });

  // 4-second polling fallback for kitchen when broadcast drops
  useEffect(() => {
    const pollInterval = window.setInterval(() => {
      void refetchOrders();
      void refetchServiceRequests();
    }, 4_000);
    return () => window.clearInterval(pollInterval);
  }, [refetchOrders, refetchServiceRequests]);

  // Realtime Broadcast subscription on kitchen-${restaurantId}
  const { status: broadcastStatus } = useRealtimeChannel({
    channelName: `kitchen-${restaurantId}`,
    broadcasts: [
      {
        event: "new_order",
        onReceive: async (payload) => {
          const rawOrder = (payload.order || payload) as KitchenOrder;
          if (!rawOrder?.id) {
            void refetchOrders();
            return;
          }
          let fullOrder = rawOrder;
          if (!fullOrder.items || fullOrder.items.length === 0) {
            try {
              const res = await fetch(`/api/kitchen/${restaurantId}/orders?orderId=${rawOrder.id}`, {
                cache: "no-store",
              });
              if (res.ok) {
                const json = await res.json().catch(() => null);
                if (json?.order) fullOrder = json.order as KitchenOrder;
              }
            } catch {
              // fallback to rawOrder
            }
          }
          setOrders((prev) => {
            const idx = prev.findIndex((o) => o.id === fullOrder.id);
            if (idx !== -1) {
              const next = [...prev];
              next[idx] = { ...next[idx], ...fullOrder };
              return next;
            }
            return [fullOrder, ...prev];
          });
          setNewOrderIds((prev) => new Set([...prev, fullOrder.id]));
          setTimeout(() => {
            setNewOrderIds((prev) => {
              const next = new Set(prev);
              next.delete(fullOrder.id);
              return next;
            });
          }, 5_000);
          if (getSoundPreference()) {
            void playOrderAlertChime();
          }
        },
      },
      {
        event: "order_status_change",
        onReceive: (payload) => {
          const order = payload.order as KitchenOrder;
          const orderId = (payload.orderId || order?.id) as string;
          const newStatus = (payload.status || order?.status) as KitchenOrder["status"];
          if (!orderId) {
            void refetchOrders();
            return;
          }
          setOrders((prev) =>
            prev.map((o) => (o.id === orderId ? { ...o, ...(order || {}), status: newStatus } : o))
          );
        },
      },
      {
        event: "service_request",
        onReceive: (payload) => {
          const req = (payload.serviceRequest || payload) as ServiceRequest;
          if (!req?.id) {
            void refetchServiceRequests();
            return;
          }
          setServiceRequests((prev) => {
            const idx = prev.findIndex((r) => r.id === req.id);
            if (idx !== -1) {
              const next = [...prev];
              next[idx] = { ...next[idx], ...req };
              return next;
            }
            return [req, ...prev];
          });
          if (getSoundPreference()) {
            void playOrderAlertChime();
          }
        },
      },
      {
        event: "service_request_resolved",
        onReceive: (payload) => {
          const req = (payload.serviceRequest || payload) as ServiceRequest;
          if (!req?.id) {
            void refetchServiceRequests();
            return;
          }
          setServiceRequests((prev) => prev.filter((r) => r.id !== req.id));
        },
      },
    ],
    onRefetchNeeded: () => {
      void refetchOrders();
      void refetchServiceRequests();
    },
  });

  // Derive unified connection status
  const connectionStatus: RealtimeConnectionStatus = useMemo(() => {
    if (ordersStatus === "offline" || serviceRequestsStatus === "offline" || broadcastStatus === "offline") {
      return "offline";
    }
    if (ordersStatus === "live" || serviceRequestsStatus === "live" || broadcastStatus === "live") {
      return "live";
    }
    if (ordersStatus === "reconnecting" || serviceRequestsStatus === "reconnecting" || broadcastStatus === "reconnecting") {
      return "reconnecting";
    }
    return "connecting";
  }, [ordersStatus, serviceRequestsStatus, broadcastStatus]);

  // Toggle sound alert
  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    setSoundPreference(next);
    if (next) {
      void playOrderAlertChime();
    }
  };

  // Visible orders filtered by status
  const visibleOrders = useMemo(() => {
    if (filter === "all") {
      // "All Active": show pending, preparing, and ready orders
      return orders.filter((o) => ["pending", "preparing", "ready"].includes(o.status));
    }
    return orders.filter((o) => o.status === filter);
  }, [filter, orders]);

  // Order summary counts
  const counts = useMemo(
    () => ({
      pending: orders.filter((o) => o.status === "pending").length,
      preparing: orders.filter((o) => o.status === "preparing").length,
      ready: orders.filter((o) => o.status === "ready").length,
      served: orders.filter((o) => o.status === "served").length,
    }),
    [orders],
  );

  // Active table calls (pending or acknowledged)
  const pendingRequests = useMemo(
    () => serviceRequests.filter((r) => r.status === "pending" || r.status === "acknowledged"),
    [serviceRequests],
  );

  // Optimistic Order Status Update with Rollback on error
  async function changeStatus(order: KitchenOrder, targetStatus: Status) {
    const previousOrders = orders;
    setBusyOrderId(order.id);

    // Optimistically update local state immediately
    const nowIso = new Date().toISOString();
    setOrders((prev) =>
      prev.map((o) =>
        o.id === order.id
          ? {
              ...o,
              status: targetStatus,
              status_updated_at: nowIso,
              updated_at: nowIso,
            }
          : o,
      ),
    );

    try {
      const response = await fetch(`/api/kitchen/${restaurantId}/orders`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: order.id, status: targetStatus }),
      });
      const result: unknown = await response.json().catch(() => null);

      if (!response.ok) {
        const message =
          typeof result === "object" &&
          result !== null &&
          "error" in result &&
          typeof result.error === "string"
            ? result.error
            : "Could not update order status.";
        throw new Error(message);
      }
    } catch (updateError) {
      // Revert local state on error
      setOrders(previousOrders);
      showToast(
        updateError instanceof Error
          ? updateError.message
          : "Could not update order status. Rolled back.",
        "error",
      );
    } finally {
      setBusyOrderId("");
    }
  }

  // Optimistic Service Request Update with Rollback on error
  async function updateServiceStatus(requestId: string, targetStatus: "acknowledged" | "completed") {
    const previousRequests = serviceRequests;
    setBusyRequestId(requestId);

    // Optimistically update local state immediately
    const nowIso = new Date().toISOString();
    setServiceRequests((prev) =>
      prev.map((r) =>
        r.id === requestId
          ? {
              ...r,
              status: targetStatus,
              updated_at: nowIso,
            }
          : r,
      ),
    );

    try {
      const response = await fetch(`/api/kitchen/${restaurantId}/service-requests`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, status: targetStatus }),
      });
      const result: unknown = await response.json().catch(() => null);

      if (!response.ok) {
        const message =
          typeof result === "object" &&
          result !== null &&
          "error" in result &&
          typeof result.error === "string"
            ? result.error
            : "Could not update service request.";
        throw new Error(message);
      }
    } catch (err) {
      // Revert local state on error
      setServiceRequests(previousRequests);
      showToast(
        err instanceof Error ? err.message : "Could not update table call. Rolled back.",
        "error",
      );
    } finally {
      setBusyRequestId("");
    }
  }

  const clockString = useMemo(() => {
    return new Intl.DateTimeFormat("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).format(new Date(now));
  }, [now]);

  return (
    <main className="kitchen-shell">
      {/* Toast Notification Banner (Floating top alert for errors & optimistic rollback) */}
      {toast && (
        <div
          aria-live="assertive"
          className={`kitchen-toast-banner ${toast.type}`}
          role="alert"
        >
          <div className="kitchen-toast-content">
            <Icon name={toast.type === "error" ? "alert" : "check"} size={18} />
            <span>{toast.text}</span>
          </div>
          <button
            aria-label="Dismiss message"
            className="kitchen-toast-close"
            onClick={() => setToast(null)}
            type="button"
          >
            <Icon name="close" size={14} />
          </button>
        </div>
      )}

      {/* 1. KDS Header: Brand Badge, Eyebrow, Title, Live Clock, Live Indicator, Sound Toggle, Admin Link */}
      <header className="kitchen-header">
        <div className="kitchen-header-left">
          <Link className="kitchen-brand-mark" href="/" title="TableTap Home">
            <Icon name="monogram-t" size={20} />
          </Link>
          <div>
            <span className="eyebrow">TableTap · Staff kitchen display</span>
            <h1 className="kitchen-heading">Kitchen Display</h1>
          </div>
        </div>

        <div className="kitchen-header-actions">
          {/* Live WebSocket Status Indicator */}
          <div
            aria-live="polite"
            className={`kitchen-live-pill status-${connectionStatus}`}
            title={`Realtime updates: ${connectionStatus}`}
          >
            <span className={`live-dot ${connectionStatus}`} />
            <span className="live-pill-label">
              {connectionStatus === "live"
                ? "Live"
                : connectionStatus === "reconnecting"
                  ? "Reconnecting…"
                  : connectionStatus === "connecting"
                    ? "Connecting…"
                    : "Offline"}
            </span>
          </div>

          {/* Audio Chime Toggle Button */}
          <button
            aria-label={soundEnabled ? "Mute order alert chime" : "Unmute order alert chime"}
            className={`kitchen-sound-btn ${soundEnabled ? "sound-active" : "sound-muted"}`}
            onClick={toggleSound}
            title={soundEnabled ? "Chime enabled on new orders (click to mute)" : "Chime muted (click to unmute)"}
            type="button"
          >
            <Icon name={soundEnabled ? "volume" : "volume-x"} size={16} />
            <span>{soundEnabled ? "Sound on" : "Muted"}</span>
          </button>

          {/* Raipur Local Clock */}
          <div className="kitchen-clock-pill">
            <span className="live-clock-dot" />
            <span className="clock-city">Raipur</span>
            <span className="clock-divider">·</span>
            <strong className="clock-digits">{clockString}</strong>
          </div>

          {/* Multi-Restaurant Selector */}
          {restaurants.length > 1 && !isStaffSession && (
            <label className="kitchen-restaurant-selector">
              <span className="sr-only">Restaurant</span>
              <select
                onChange={(event) => setRestaurantId(event.target.value)}
                value={restaurantId}
              >
                {restaurants.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </label>
          )}

          {/* Staff Exit or Admin Navigation */}
          {isStaffSession ? (
            <button
              className="kitchen-admin-btn"
              onClick={async () => {
                await fetch("/api/auth/logout", { method: "POST" });
                window.location.assign("/admin/login?tab=kitchen");
              }}
              title="Sign out kitchen station"
              type="button"
            >
              <Icon name="logout" size={15} />
              <span>Staff Exit</span>
            </button>
          ) : (
            <Link className="kitchen-admin-btn" href="/admin">
              <IconSettings size={15} />
              <span>Admin</span>
            </Link>
          )}
        </div>
      </header>

      {/* 2. Order Counts Row */}
      <section aria-label="Order summary counts" className="kitchen-counts">
        <div className="kitchen-count pending">
          <div className="count-label-row">
            <IconClock size={16} />
            <span>New / Pending</span>
          </div>
          <strong>{counts.pending}</strong>
        </div>

        <div className="kitchen-count preparing">
          <div className="count-label-row">
            <IconClock size={16} />
            <span>Preparing</span>
          </div>
          <strong>{counts.preparing}</strong>
        </div>

        <div className="kitchen-count ready">
          <div className="count-label-row">
            <IconServed size={16} />
            <span>Ready to Serve</span>
          </div>
          <strong>{counts.ready}</strong>
        </div>

        <div
          className={`kitchen-count service-calls ${pendingRequests.length ? "active-alert" : ""}`}
        >
          <div className="count-label-row">
            <IconBell size={16} />
            <span>Table Calls</span>
          </div>
          <strong>{pendingRequests.length}</strong>
        </div>
      </section>

      {/* 3. Live Table Service Requests */}
      <section aria-label="Table service requests" className="kitchen-service-requests-panel">
        <div className="service-requests-header">
          <div className="service-req-title-group">
            <span className="live-pulse-dot" />
            <h2>Live Table Service Calls</h2>
            <span className="service-count-pill">{pendingRequests.length} Active</span>
          </div>
          <button
            className="service-refresh-btn"
            onClick={() => void refetchServiceRequests()}
            type="button"
          >
            Refresh calls ⟳
          </button>
        </div>

        {pendingRequests.length === 0 ? (
          <div className="service-requests-empty">
            <IconBell className="empty-bell-icon" size={28} />
            <p>No active table calls. All dining tables are attended to.</p>
          </div>
        ) : (
          <div className="service-requests-grid">
            {pendingRequests.map((req) => {
              const isWaiter = req.type === "call_waiter";
              const isAcknowledged = req.status === "acknowledged";
              return (
                <div
                  className={`service-call-card ${isWaiter ? "type-waiter" : "type-bill"} ${isAcknowledged ? "acknowledged" : "pending"}`}
                  key={req.id}
                >
                  <div className="service-card-top">
                    <div className="service-type-badge">
                      {isWaiter ? <IconBell size={16} /> : <IconOrder size={16} />}
                      <strong>{isWaiter ? "Call Waiter" : "Request Bill"}</strong>
                    </div>
                    <span className="service-time">
                      {formatStatusDuration(
                        {
                          id: req.id,
                          restaurant_id: req.restaurant_id,
                          table_id: req.table_id,
                          table_number: req.table_number,
                          customer_phone: null,
                          status: "pending",
                          total_amount: 0,
                          notes: null,
                          created_at: req.created_at,
                          updated_at: req.updated_at,
                          status_updated_at: req.updated_at,
                          items: [],
                        },
                        now,
                      )}
                    </span>
                  </div>

                  <div className="service-card-table">
                    <span>Dining Table</span>
                    <strong>{req.table_number}</strong>
                  </div>

                  <div className="service-card-status-indicator">
                    <span className={`status-pill ${req.status}`}>
                      {isAcknowledged ? (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                          <Icon name="check-circle" size={12} />
                          <span>Attending / Acknowledged</span>
                        </span>
                      ) : (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                          <Icon name="bell-service" size={12} />
                          <span>Waiting for Staff</span>
                        </span>
                      )}
                    </span>
                  </div>

                  <div className="service-card-actions">
                    {!isAcknowledged && (
                      <button
                        className="service-btn acknowledge"
                        disabled={busyRequestId === req.id}
                        onClick={() => void updateServiceStatus(req.id, "acknowledged")}
                        type="button"
                      >
                        {busyRequestId === req.id ? "Saving…" : "Acknowledge"}
                      </button>
                    )}
                    <button
                      className="service-btn complete"
                      disabled={busyRequestId === req.id}
                      onClick={() => void updateServiceStatus(req.id, "completed")}
                      type="button"
                    >
                      {busyRequestId === req.id ? (
                        "Saving…"
                      ) : (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                          <Icon name="check" size={13} />
                          <span>Done / Attended</span>
                        </span>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 4. Filter Navigation Bar */}
      <nav aria-label="Filter orders" className="kitchen-filters">
        {filters.map((item) => (
          <button
            aria-pressed={filter === item.id}
            className={filter === item.id ? "kitchen-filter active" : "kitchen-filter"}
            key={item.id}
            onClick={() => setFilter(item.id)}
            type="button"
          >
            {item.label}
            {item.id === "pending" && counts.pending > 0 && (
              <span className="filter-count-badge pending">{counts.pending}</span>
            )}
            {item.id === "preparing" && counts.preparing > 0 && (
              <span className="filter-count-badge preparing">{counts.preparing}</span>
            )}
            {item.id === "ready" && counts.ready > 0 && (
              <span className="filter-count-badge ready">{counts.ready}</span>
            )}
          </button>
        ))}

        <div className="kitchen-filters-right">
          <button
            className="service-refresh-btn"
            onClick={() => void refetchOrders()}
            title="Refresh order tickets"
            type="button"
          >
            Refresh orders ⟳
          </button>
        </div>
      </nav>

      {/* 5. Orders Board */}
      {ordersError && (
        <p aria-live="assertive" className="admin-alert error">
          {ordersError}
        </p>
      )}

      {isOrdersLoading ? (
        <p className="admin-loading">Loading kitchen orders…</p>
      ) : visibleOrders.length ? (
        <section aria-label="Orders" className="kitchen-order-grid">
          {visibleOrders.map((order) => {
            const followingStatus = nextStatus(order.status);
            const isNew = newOrderIds.has(order.id);
            const isUrgent =
              order.status === "pending"
                ? now - new Date(order.created_at).getTime() > 10 * 60 * 1000
                : order.status === "preparing"
                  ? now -
                      new Date(
                        order.status_updated_at || order.updated_at || order.created_at,
                      ).getTime() >
                    25 * 60 * 1000
                  : false;

            return (
              <article
                className={`kitchen-order-card status-${order.status} ${isNew ? "kitchen-new-order-card" : ""} ${isUrgent ? "kitchen-order-urgent" : ""}`}
                key={order.id}
              >
                <header className="kitchen-order-top">
                  <div className="kitchen-table-number">
                    <span>
                      {order.order_type === "takeaway" || !order.table_number
                        ? "Takeaway Order"
                        : "Dining Table"}
                    </span>
                    <strong>
                      {order.order_type === "takeaway" || !order.table_number
                        ? "Takeaway"
                        : order.table_number}
                    </strong>
                    {order.order_code && (
                      <span className="kitchen-order-code" style={{ fontSize: "0.85rem", opacity: 0.85, marginLeft: "0.4rem" }}>
                        {order.order_code}
                      </span>
                    )}
                  </div>
                  <div className="kitchen-order-meta">
                    {/* Per-order live duration in current status: "Preparing · 4 min" */}
                    <span
                      className={`kitchen-status-timer ${isUrgent ? "timer-urgent" : ""}`}
                      title={`Status duration since last change: ${order.status_updated_at || order.updated_at}`}
                    >
                      <IconClock size={12} />
                      <time>{formatStatusDuration(order, now)}</time>
                    </span>

                    {/* Accessible colored status badge */}
                    <span className={`kitchen-status status-badge-${order.status}`}>
                      {order.status}
                    </span>
                  </div>
                </header>

                <ul className="kitchen-order-items">
                  {order.items.map((item) => (
                    <li key={item.id}>
                      <strong className="item-qty-badge">{item.quantity}×</strong>
                      <div className="item-text-box">
                        <span className="item-name">{item.item_name}</span>
                        {item.special_instructions && (
                          <em className="item-note">“{item.special_instructions}”</em>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>

                {order.notes && (
                  <p className="kitchen-order-notes">
                    <strong>Special Note:</strong> {order.notes}
                  </p>
                )}

                <footer className="kitchen-order-footer">
                  <div className="order-total-price">
                    <span className="total-label">Total:</span>
                    <strong>{currency(order.total_amount)}</strong>
                  </div>

                  <div className="kitchen-order-actions">
                    {followingStatus && (
                      <button
                        className="kitchen-action-btn primary"
                        disabled={busyOrderId === order.id}
                        onClick={() => void changeStatus(order, followingStatus)}
                        type="button"
                      >
                        {busyOrderId === order.id ? (
                          "Saving…"
                        ) : followingStatus === "preparing" ? (
                          <>
                            <IconClock size={15} />
                            <span>Accept &amp; Start</span>
                          </>
                        ) : followingStatus === "ready" ? (
                          <>
                            <IconServed size={15} />
                            <span>Mark Ready</span>
                          </>
                        ) : (
                          <>
                            <IconServed size={15} />
                            <span>Mark Served</span>
                          </>
                        )}
                      </button>
                    )}
                    {["pending", "preparing", "ready"].includes(order.status) && (
                      <button
                        className="kitchen-cancel-btn"
                        disabled={busyOrderId === order.id}
                        onClick={() => void changeStatus(order, "cancelled")}
                        type="button"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </footer>
              </article>
            );
          })}
        </section>
      ) : (
        <section className="kitchen-empty">
          <IconServed className="empty-kds-icon" size={36} />
          <h2>
            {filter === "all"
              ? "No active orders"
              : filter === "served"
                ? "No served orders"
                : `No ${filter} orders`}
          </h2>
          <p>No orders here. New ones appear on their own.</p>
        </section>
      )}
    </main>
  );
}
