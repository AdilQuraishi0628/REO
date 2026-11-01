"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import type { Database } from "@/lib/database.types";
import {
  Icon,
  IconBell,
  IconClock,
  IconServed,
  IconTable,
  IconOrder,
  IconSettings,
  IconMonogramT,
} from "@/components/icons";

type RestaurantOption = {
  id: string;
  name: string;
};

type KitchenOrder = Database["public"]["Tables"]["orders"]["Row"] & {
  items: Database["public"]["Tables"]["order_items"]["Row"][];
};

type Filter = "all" | "pending" | "preparing" | "ready";
type Status = KitchenOrder["status"];

const filters: { id: Filter; label: string }[] = [
  { id: "all", label: "All Orders" },
  { id: "pending", label: "New / Pending" },
  { id: "preparing", label: "Preparing" },
  { id: "ready", label: "Ready to Serve" },
];

function elapsedTime(createdAt: string, now: number) {
  const minutes = Math.max(0, Math.floor((now - new Date(createdAt).getTime()) / 60_000));
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes ? `${hours}h ${remainingMinutes}m ago` : `${hours}h ago`;
}

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
  const [orders, setOrders] = useState<KitchenOrder[]>([]);
  const [serviceRequests, setServiceRequests] = useState<ServiceRequest[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [busyOrderId, setBusyOrderId] = useState("");
  const [busyRequestId, setBusyRequestId] = useState("");
  const [error, setError] = useState("");
  const [now, setNow] = useState(Date.now());
  const [newOrderIds, setNewOrderIds] = useState<Set<string>>(new Set());
  const [bellRinging, setBellRinging] = useState(false);
  const knownOrderIdsRef = useRef<Set<string>>(new Set());
  const isFirstLoadRef = useRef(true);

  const loadOrders = useCallback(async () => {
    try {
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
        throw new Error("The kitchen returned an invalid order list.");
      }
      const freshOrders = result.orders as KitchenOrder[];
      if (!isFirstLoadRef.current) {
        const newlyArrived = freshOrders.filter((o) => !knownOrderIdsRef.current.has(o.id));
        if (newlyArrived.length > 0) {
          const freshSet = new Set(newlyArrived.map((o) => o.id));
          setNewOrderIds(freshSet);
          setBellRinging(true);
          setTimeout(() => setBellRinging(false), 500);
          setTimeout(() => setNewOrderIds(new Set()), 2000);
        }
      } else {
        isFirstLoadRef.current = false;
      }
      knownOrderIdsRef.current = new Set(freshOrders.map((o) => o.id));
      setOrders(freshOrders);
      setError("");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load kitchen orders.");
    } finally {
      setIsLoading(false);
    }
  }, [restaurantId]);

  const loadServiceRequests = useCallback(async () => {
    try {
      const response = await fetch(`/api/kitchen/${restaurantId}/service-requests`, {
        cache: "no-store",
      });
      const result: unknown = await response.json().catch(() => null);
      if (response.ok && typeof result === "object" && result !== null && "requests" in result) {
        setServiceRequests((result as { requests: ServiceRequest[] }).requests);
      }
    } catch (err) {
      console.warn("Could not load service requests:", err);
    }
  }, [restaurantId]);

  useEffect(() => {
    setIsLoading(true);
    void loadOrders();
    void loadServiceRequests();

    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      // In demo / unconfigured mode, use fast 3-second polling
      const pollInterval = window.setInterval(() => {
        void loadServiceRequests();
        void loadOrders();
      }, 3_000);

      return () => {
        window.clearInterval(pollInterval);
      };
    }

    const orderChannel = supabase
      .channel(`kitchen-orders-${restaurantId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        () => void loadOrders(),
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "service_requests",
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        () => void loadServiceRequests(),
      )
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          setError("Live updates are unavailable. Reload the page to check for new orders.");
        }
      });

    // Also poll every 15s as fallback in live mode
    const pollInterval = window.setInterval(() => {
      void loadServiceRequests();
      void loadOrders();
    }, 15_000);

    return () => {
      window.clearInterval(pollInterval);
      void supabase.removeChannel(orderChannel);
    };
  }, [loadOrders, loadServiceRequests, restaurantId]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const visibleOrders = useMemo(
    () => orders.filter((order) => filter === "all" || order.status === filter),
    [filter, orders],
  );
  const counts = useMemo(
    () => ({
      pending: orders.filter((order) => order.status === "pending").length,
      preparing: orders.filter((order) => order.status === "preparing").length,
      ready: orders.filter((order) => order.status === "ready").length,
    }),
    [orders],
  );

  async function changeStatus(order: KitchenOrder, status: Status) {
    setBusyOrderId(order.id);
    setError("");
    try {
      const response = await fetch(`/api/kitchen/${restaurantId}/orders`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: order.id, status }),
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
      await loadOrders();
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Could not update order status.");
    } finally {
      setBusyOrderId("");
    }
  }

  async function updateServiceStatus(requestId: string, status: "acknowledged" | "completed") {
    setBusyRequestId(requestId);
    try {
      const response = await fetch(`/api/kitchen/${restaurantId}/service-requests`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, status }),
      });
      if (response.ok) {
        await loadServiceRequests();
      }
    } catch (err) {
      console.warn("Could not update service request:", err);
    } finally {
      setBusyRequestId("");
    }
  }

  const pendingRequests = useMemo(
    () => serviceRequests.filter((r) => r.status === "pending" || r.status === "acknowledged"),
    [serviceRequests],
  );

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
      {/* 1. KDS Header: Brand Badge, Eyebrow, Title, Live Clock, and Admin Link */}
      <header className="kitchen-header">
        <div className="kitchen-header-left">
          <Link className="kitchen-brand-mark" href="/" title="TableTap Home">
            <span className="brand-monogram-t">T</span>
          </Link>
          <div>
            <span className="eyebrow">TABLETAP · STAFF KDS</span>
            <h1 className="kitchen-heading">Kitchen Display</h1>
          </div>
        </div>

        <div className="kitchen-header-actions">
          <div className="kitchen-clock-pill">
            <span className="live-clock-dot" />
            <span className="clock-city">Raipur</span>
            <span className="clock-divider">·</span>
            <strong className="clock-digits">{clockString}</strong>
          </div>

          {restaurants.length > 1 && !isStaffSession && (
            <label className="kitchen-restaurant-selector">
              <span className="sr-only">Restaurant</span>
              <select
                onChange={(event) => setRestaurantId(event.target.value)}
                value={restaurantId}
              >
                {restaurants.map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </label>
          )}

          {isStaffSession ? (
            <button
              className="kitchen-admin-btn"
              onClick={async () => {
                await fetch("/api/auth/logout", { method: "POST" });
                window.location.assign("/admin/login?tab=kitchen");
              }}
              type="button"
              title="Sign out kitchen station"
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

        <div className={`kitchen-count service-calls ${pendingRequests.length ? "active-alert" : ""}`}>
          <div className="count-label-row">
            <IconBell size={16} className={bellRinging ? "kitchen-bell-ringing" : ""} />
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
            onClick={() => void loadServiceRequests()}
            type="button"
          >
            Refresh calls ⟳
          </button>
        </div>

        {pendingRequests.length === 0 ? (
          <div className="service-requests-empty">
            <IconBell size={28} className="empty-bell-icon" />
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
                    <span className="service-time">{elapsedTime(req.created_at, now)}</span>
                  </div>

                  <div className="service-card-table">
                    <span>Table</span>
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
                        {busyRequestId === req.id ? "..." : "Acknowledge"}
                      </button>
                    )}
                    <button
                      className="service-btn complete"
                      disabled={busyRequestId === req.id}
                      onClick={() => void updateServiceStatus(req.id, "completed")}
                      type="button"
                    >
                      {busyRequestId === req.id ? (
                        "..."
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
          </button>
        ))}
        <span aria-live="polite" className="kitchen-live-indicator">
          <i /> Live updates on
        </span>
      </nav>

      {/* 5. Orders Board */}
      {error && <p aria-live="assertive" className="admin-alert error">{error}</p>}
      {isLoading ? (
        <p className="admin-loading">Loading kitchen orders...</p>
      ) : visibleOrders.length ? (
        <section aria-label="Orders" className="kitchen-order-grid">
          {visibleOrders.map((order) => {
            const followingStatus = nextStatus(order.status);
            const isNew = newOrderIds.has(order.id);
            const isUrgent = (now - new Date(order.created_at).getTime()) > 15 * 60 * 1000;
            return (
              <article
                className={`kitchen-order-card status-${order.status} ${isNew ? "kitchen-new-order-card" : ""}`}
                key={order.id}
              >
                <header className="kitchen-order-top">
                  <div className="kitchen-table-number">
                    <span>Dining Table</span>
                    <strong>{order.table_number}</strong>
                  </div>
                  <div className="kitchen-order-meta">
                    <time dateTime={order.created_at} className={isUrgent ? "timer-urgent" : ""}>
                      {elapsedTime(order.created_at, now)}
                    </time>
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
                          "Saving..."
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
          <IconServed size={36} className="empty-kds-icon" />
          <h2>{filter === "all" ? "No orders active" : `No ${filter} orders`}</h2>
          <p>Orders submitted by dining guests will appear here in real-time.</p>
        </section>
      )}
    </main>
  );
}
