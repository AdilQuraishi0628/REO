"use client";

import { useEffect, useState, useCallback } from "react";
import { useRealtimeChannel } from "@/hooks/use-realtime-table";
import { Icon, IconClock, IconServed } from "@/components/icons";

export type TrackedOrder = {
  id: string;
  restaurant_id: string;
  table_number: string;
  status: "pending" | "preparing" | "ready" | "served" | "cancelled";
  total_amount: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
  status_updated_at?: string;
  items?: {
    id: string;
    item_name: string;
    quantity: number;
    unit_price: number;
    total_price: number;
    special_instructions: string | null;
  }[];
};

interface LiveOrderTrackerProps {
  orderId: string;
  restaurantId: string;
  tableCode: string;
  tableLabel: string;
  initialOrder?: TrackedOrder | null;
  onDismiss?: () => void;
  onCallWaiter?: () => void;
}

const STORAGE_KEY_PREFIX = "tabletap_recent_order_";

export function getPersistedOrder(restaurantId: string): { orderId: string; timestamp: number } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(`${STORAGE_KEY_PREFIX}${restaurantId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // Expire orders older than 8 hours
    if (Date.now() - parsed.timestamp > 8 * 3600_000) {
      window.localStorage.removeItem(`${STORAGE_KEY_PREFIX}${restaurantId}`);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function persistOrder(restaurantId: string, orderId: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      `${STORAGE_KEY_PREFIX}${restaurantId}`,
      JSON.stringify({ orderId, timestamp: Date.now() }),
    );
  } catch {
    // Ignore storage quota errors
  }
}

export function clearPersistedOrder(restaurantId: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(`${STORAGE_KEY_PREFIX}${restaurantId}`);
  } catch {
    // Ignore
  }
}

function currency(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function LiveOrderTracker({
  orderId,
  restaurantId,
  tableLabel,
  initialOrder,
  onDismiss,
  onCallWaiter,
}: LiveOrderTrackerProps) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [now, setNow] = useState(Date.now());

  // Tick time locally every 30s
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);

  const [order, setOrder] = useState<TrackedOrder | null>(initialOrder ?? null);

  const fetchOrder = useCallback(async (): Promise<TrackedOrder | null> => {
    try {
      const res = await fetch(`/api/orders?orderId=${orderId}`, {
        cache: "no-store",
      });
      if (res.ok) {
        const json = await res.json();
        if (json && json.order) return json.order as TrackedOrder;
      }
    } catch (err) {
      console.warn("Could not fetch tracked order:", err);
    }
    return null;
  }, [orderId]);

  // Gentle polling fallback (12s) when broadcast drops
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const fresh = await fetchOrder();
      if (mounted && fresh) {
        setOrder(fresh);
      }
    };
    if (!order) {
      void load();
    }
    const timer = window.setInterval(load, 12_000);
    return () => {
      mounted = false;
      window.clearInterval(timer);
    };
  }, [fetchOrder, order]);

  // Subscribe strictly to guest's own broadcast channel: order:${orderId}
  const { status: connectionStatus } = useRealtimeChannel({
    channelName: `order:${orderId}`,
    broadcasts: [
      {
        event: "order_status_change",
        onReceive: (payload) => {
          if (payload.order) {
            setOrder(payload.order as TrackedOrder);
          } else if (payload.status) {
            setOrder((prev) =>
              prev
                ? {
                    ...prev,
                    status: payload.status as TrackedOrder["status"],
                    status_updated_at:
                      (payload.statusUpdatedAt as string) || new Date().toISOString(),
                    updated_at:
                      (payload.updatedAt as string) || new Date().toISOString(),
                  }
                : null
            );
          }
        },
      },
    ],
    onRefetchNeeded: () => {
      void fetchOrder().then((fresh) => {
        if (fresh) setOrder(fresh);
      });
    },
  });

  // Persist order in localStorage
  useEffect(() => {
    if (orderId && restaurantId) {
      persistOrder(restaurantId, orderId);
    }
  }, [orderId, restaurantId]);

  // Clean up storage if order is completed / served for a while
  useEffect(() => {
    if (order?.status === "served") {
      const timeout = setTimeout(() => {
        clearPersistedOrder(restaurantId);
      }, 30 * 60_000);
      return () => clearTimeout(timeout);
    }
    if (order?.status === "cancelled") {
      clearPersistedOrder(restaurantId);
    }
  }, [order?.status, restaurantId]);

  if (!order) {
    return (
      <div className="live-tracker-loading">
        <span className="live-pulse-dot" />
        <p>Connecting to live order ticket…</p>
      </div>
    );
  }

  // Friendly short order reference e.g. #T1-4A8F
  const shortId = `#${tableLabel.replace(/[^0-9A-Za-z]/g, "")}-${order.id.slice(-4).toUpperCase()}`;

  const statusProgress: Record<TrackedOrder["status"], number> = {
    pending: 1,
    preparing: 2,
    ready: 3,
    served: 4,
    cancelled: 0,
  };

  const currentStep = statusProgress[order.status] ?? 1;
  const isCancelled = order.status === "cancelled";

  // Friendly status message
  const statusMessages: Record<TrackedOrder["status"], { title: string; subtitle: string }> = {
    pending: {
      title: "Order Placed & Confirmed",
      subtitle: "Sent straight to the kitchen display. The chef will accept it shortly.",
    },
    preparing: {
      title: "Kitchen is Preparing",
      subtitle: "The chef is preparing your dishes fresh right now.",
    },
    ready: {
      title: "Order Ready to Serve",
      subtitle: "Plated and ready! Your server is bringing it to your table.",
    },
    served: {
      title: "Served · Enjoy Your Meal",
      subtitle: "Your meal is served. Let us know if you need anything else!",
    },
    cancelled: {
      title: "Order Cancelled",
      subtitle: "This order was cancelled. Please speak with staff if you have questions.",
    },
  };

  const message = statusMessages[order.status];

  // Elapsed time in current status
  const timestamp = order.status_updated_at || order.updated_at || order.created_at;
  const elapsedMinutes = Math.max(0, Math.floor((now - new Date(timestamp).getTime()) / 60_000));
  const timeText =
    elapsedMinutes < 1
      ? "Just now"
      : elapsedMinutes < 60
        ? `${elapsedMinutes}m ago`
        : `${Math.floor(elapsedMinutes / 60)}h ago`;

  return (
    <section aria-label="Live Order Tracking" className="live-order-tracker-card">
      {/* Header with live indicator & Short Reference */}
      <header className="tracker-header">
        <div className="tracker-badge-group">
          <span className={`live-dot ${connectionStatus}`} />
          <strong className="tracker-order-id">{shortId}</strong>
          <span className="tracker-table-tag">{order.table_number || tableLabel}</span>
        </div>

        <div className="tracker-header-right">
          <span className="tracker-elapsed-tag">
            <IconClock size={12} />
            <span>{timeText}</span>
          </span>
          {onDismiss && (
            <button
              aria-label="Dismiss order tracker"
              className="tracker-dismiss-btn"
              onClick={onDismiss}
              type="button"
            >
              <Icon name="close" size={14} />
            </button>
          )}
        </div>
      </header>

      {/* Main Status Callout */}
      <div className={`tracker-status-box status-${order.status}`}>
        <div className="tracker-status-icon-wrap">
          {order.status === "pending" && <Icon name="check" size={20} />}
          {order.status === "preparing" && <IconClock size={20} />}
          {order.status === "ready" && <IconServed size={20} />}
          {order.status === "served" && <Icon name="check-circle" size={20} />}
          {isCancelled && <Icon name="alert" size={20} />}
        </div>
        <div>
          <h3 className="tracker-status-title">{message.title}</h3>
          <p className="tracker-status-subtitle">{message.subtitle}</p>
        </div>
      </div>

      {/* 4-Step Animated Progress Bar (if not cancelled) */}
      {!isCancelled ? (
        <div className="tracker-progress-container">
          <div className="tracker-progress-track">
            <div
              className="tracker-progress-fill"
              style={{ width: `${((currentStep - 1) / 3) * 100}%` }}
            />
          </div>

          <div className="tracker-steps-row">
            {/* Step 1: Placed */}
            <div className={`tracker-step ${currentStep >= 1 ? "completed" : ""}`}>
              <div className="tracker-step-circle">
                <Icon name="check" size={12} />
              </div>
              <span className="tracker-step-label">Placed</span>
            </div>

            {/* Step 2: Preparing */}
            <div
              className={`tracker-step ${currentStep >= 2 ? "completed" : currentStep === 1 ? "next-up" : ""}`}
            >
              <div className="tracker-step-circle">
                <IconClock size={12} />
              </div>
              <span className="tracker-step-label">Preparing</span>
            </div>

            {/* Step 3: Ready */}
            <div
              className={`tracker-step ${currentStep >= 3 ? "completed" : currentStep === 2 ? "next-up" : ""}`}
            >
              <div className="tracker-step-circle">
                <IconServed size={12} />
              </div>
              <span className="tracker-step-label">Ready</span>
            </div>

            {/* Step 4: Served */}
            <div className={`tracker-step ${currentStep >= 4 ? "completed" : ""}`}>
              <div className="tracker-step-circle">
                <Icon name="check-circle" size={12} />
              </div>
              <span className="tracker-step-label">Served</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="tracker-cancelled-notice">
          <p>This order was marked as cancelled. If this is unexpected, please tap below to call your waiter.</p>
        </div>
      )}

      {/* Expandable Order Details Accordion */}
      <div className="tracker-details-wrapper">
        <button
          aria-expanded={detailsOpen}
          className="tracker-details-toggle"
          onClick={() => setDetailsOpen(!detailsOpen)}
          type="button"
        >
          <span>View order items ({order.items?.length || 0})</span>
          <span className="tracker-total-peek">{currency(order.total_amount)}</span>
          <Icon name="chevron-down" className={`tracker-arrow ${detailsOpen ? "open" : ""}`} size={16} />
        </button>

        {detailsOpen && (
          <div className="tracker-details-content">
            {order.items && order.items.length > 0 ? (
              <ul className="tracker-items-list">
                {order.items.map((it) => (
                  <li className="tracker-item-row" key={it.id}>
                    <div className="tracker-item-info">
                      <span className="tracker-item-qty">{it.quantity}×</span>
                      <strong className="tracker-item-name">{it.item_name}</strong>
                      {it.special_instructions && (
                        <em className="tracker-item-spec">“{it.special_instructions}”</em>
                      )}
                    </div>
                    <span className="tracker-item-price">{currency(it.total_price)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="tracker-items-empty">Order details confirmed with kitchen.</p>
            )}

            {order.notes && (
              <p className="tracker-order-notes">
                <strong>Table Notes:</strong> {order.notes}
              </p>
            )}

            <div className="tracker-total-row">
              <span>Total Paid / Billed:</span>
              <strong>{currency(order.total_amount)}</strong>
            </div>
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <footer className="tracker-footer">
        {onCallWaiter && (
          <button
            className="tracker-call-waiter-btn"
            onClick={onCallWaiter}
            type="button"
          >
            <Icon name="bell-service" size={15} />
            <span>Need Help? Call Waiter</span>
          </button>
        )}
      </footer>
    </section>
  );
}
