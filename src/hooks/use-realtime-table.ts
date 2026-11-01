"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createSupabaseBrowserClient, hasSupabaseBrowserConfig } from "@/lib/supabase-browser";

export type RealtimeConnectionStatus = "connecting" | "live" | "reconnecting" | "offline";

export interface UseRealtimeTableOptions<T extends { id: string }> {
  /** PostgreSQL table name to subscribe to, e.g. "orders", "service_requests", "reservations" */
  table: string;
  /** Restaurant ID used for row filtering */
  restaurantId: string;
  /** Optional custom filter string. Defaults to `restaurant_id=eq.${restaurantId}` */
  filter?: string;
  /** Initial dataset if already fetched server-side */
  initialData?: T[];
  /** Function to fetch full dataset on mount, on reconnect, and on tab refocus */
  fetchData: () => Promise<T[]>;
  /** Optional transformer/enricher for INSERT events (e.g. fetching items for a newly created order) */
  transformInsert?: (raw: Record<string, unknown>) => Promise<T | null> | T | null;
  /** Callback fired when a new row is inserted */
  onInsert?: (newItem: T) => void | Promise<void>;
  /** Callback fired when an existing row is updated */
  onUpdate?: (updatedItem: T, oldItem?: T) => void;
  /** Callback fired when a row is deleted */
  onDelete?: (deletedId: string) => void;
  /** Enable or disable real-time subscription */
  enabled?: boolean;
}

export interface UseRealtimeTableReturn<T> {
  data: T[];
  setData: React.Dispatch<React.SetStateAction<T[]>>;
  status: RealtimeConnectionStatus;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Reusable Supabase Realtime hook that:
 * - Subscribes to `supabase.channel(name).on('postgres_changes', { event: '*', schema: 'public', table, filter }, handler).subscribe(statusCb)`
 * - Tracks connection status: `connecting` | `live` | `reconnecting` | `offline`
 * - Merges INSERT, UPDATE, DELETE directly into local state by id without a full refetch
 * - Refetches once on reconnect and on tab refocus to catch any missed events
 * - Cleans up the channel on unmount, safe against React StrictMode duplicate subscriptions
 */
export function useRealtimeTable<T extends { id: string }>({
  table,
  restaurantId,
  filter,
  initialData,
  fetchData,
  transformInsert,
  onInsert,
  onUpdate,
  onDelete,
  enabled = true,
}: UseRealtimeTableOptions<T>): UseRealtimeTableReturn<T> {
  const [data, setData] = useState<T[]>(initialData ?? []);
  const [status, setStatus] = useState<RealtimeConnectionStatus>(() => {
    if (typeof navigator !== "undefined" && !navigator.onLine) return "offline";
    return hasSupabaseBrowserConfig() ? "connecting" : "live";
  });
  const [isLoading, setIsLoading] = useState<boolean>(!initialData);
  const [error, setError] = useState<string | null>(null);

  const effectiveFilter = filter ?? (restaurantId ? `restaurant_id=eq.${restaurantId}` : undefined);

  // Keep latest callbacks in refs so effects don't re-trigger unnecessarily
  const fetchDataRef = useRef(fetchData);
  fetchDataRef.current = fetchData;

  const transformInsertRef = useRef(transformInsert);
  transformInsertRef.current = transformInsert;

  const onInsertRef = useRef(onInsert);
  onInsertRef.current = onInsert;

  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

  const onDeleteRef = useRef(onDelete);
  onDeleteRef.current = onDelete;

  const prevStatusRef = useRef<RealtimeConnectionStatus>(status);
  const isMountedRef = useRef(true);

  // Manual or programmatic refetch
  const refetch = useCallback(async () => {
    try {
      const fresh = await fetchDataRef.current();
      if (isMountedRef.current) {
        setData(fresh);
        setError(null);
      }
    } catch (err) {
      if (isMountedRef.current) {
        const msg = err instanceof Error ? err.message : "Failed to load data";
        setError(msg);
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  // 1. Initial Load & Tab Refocus / Online-Offline handling
  useEffect(() => {
    isMountedRef.current = true;

    // Load initial data
    void refetch();

    // Refocus listener: refetch once on tab visibility to catch missed events
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void refetch();
      }
    };

    // Network status listeners
    const handleOnline = () => {
      setStatus("reconnecting");
      void refetch();
    };

    const handleOffline = () => {
      setStatus("offline");
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      isMountedRef.current = false;
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [refetch]);

  // 2. Realtime Channel Subscription
  useEffect(() => {
    if (!enabled || !table) {
      return;
    }

    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      // In demo or fallback mode without Supabase credentials, use polling fallback
      setStatus(typeof navigator !== "undefined" && !navigator.onLine ? "offline" : "live");
      const pollTimer = window.setInterval(() => {
        void refetch();
      }, 5_000);

      return () => {
        window.clearInterval(pollTimer);
      };
    }

    setStatus("connecting");

    // Unique channel identifier prevents collisions on rapid React StrictMode remounts
    const channelId = `realtime_${table}_${restaurantId || "global"}_${Math.random().toString(36).slice(2, 7)}`;
    const channel = supabase
      .channel(channelId)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table,
          ...(effectiveFilter ? { filter: effectiveFilter } : {}),
        },
        async (payload) => {
          if (!isMountedRef.current) return;

          if (payload.eventType === "INSERT") {
            const raw = payload.new as Record<string, unknown>;
            let itemToInsert: T | null = raw as unknown as T;

            if (transformInsertRef.current) {
              try {
                itemToInsert = await transformInsertRef.current(raw);
              } catch (transformErr) {
                console.warn(`[useRealtimeTable:${table}] transformInsert error:`, transformErr);
                itemToInsert = raw as unknown as T;
              }
            }

            if (!itemToInsert) return;

            setData((prev) => {
              const existingIdx = prev.findIndex((item) => item.id === itemToInsert!.id);
              if (existingIdx !== -1) {
                const next = [...prev];
                next[existingIdx] = { ...next[existingIdx], ...itemToInsert };
                return next;
              }
              return [itemToInsert!, ...prev];
            });

            try {
              void onInsertRef.current?.(itemToInsert);
            } catch (err) {
              console.warn(`[useRealtimeTable:${table}] onInsert callback error:`, err);
            }
          } else if (payload.eventType === "UPDATE") {
            const updatedRaw = payload.new as Record<string, unknown>;
            if (!updatedRaw || typeof updatedRaw.id !== "string") return;

            setData((prev) => {
              const existing = prev.find((item) => item.id === updatedRaw.id);
              if (onUpdateRef.current) {
                try {
                  onUpdateRef.current(updatedRaw as unknown as T, existing);
                } catch (err) {
                  console.warn(`[useRealtimeTable:${table}] onUpdate callback error:`, err);
                }
              }

              return prev.map((item) => {
                if (item.id === updatedRaw.id) {
                  return { ...item, ...updatedRaw };
                }
                return item;
              });
            });
          } else if (payload.eventType === "DELETE") {
            const oldRaw = payload.old as { id?: string } | undefined;
            const deletedId = oldRaw?.id;
            if (!deletedId) return;

            setData((prev) => prev.filter((item) => item.id !== deletedId));

            try {
              onDeleteRef.current?.(deletedId);
            } catch (err) {
              console.warn(`[useRealtimeTable:${table}] onDelete callback error:`, err);
            }
          }
        },
      )
      .subscribe((channelStatus, subErr) => {
        if (!isMountedRef.current) return;

        if (subErr) {
          console.warn(`[useRealtimeTable:${table}] Subscription error:`, subErr);
        }

        if (channelStatus === "SUBSCRIBED") {
          if (prevStatusRef.current === "reconnecting" || prevStatusRef.current === "offline") {
            void refetch();
          }
          setStatus("live");
          prevStatusRef.current = "live";
        } else if (channelStatus === "TIMED_OUT" || channelStatus === "CHANNEL_ERROR") {
          setStatus("reconnecting");
          prevStatusRef.current = "reconnecting";
        } else if (channelStatus === "CLOSED") {
          setStatus("offline");
          prevStatusRef.current = "offline";
        }
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [effectiveFilter, enabled, refetch, restaurantId, table]);

  return {
    data,
    setData,
    status,
    isLoading,
    error,
    refetch,
  };
}

export type ChannelTableConfig = {
  table: string;
  filter?: string;
  onChange?: (payload: {
    eventType: "INSERT" | "UPDATE" | "DELETE";
    new: Record<string, unknown>;
    old: Record<string, unknown>;
  }) => void;
  onInsert?: (record: Record<string, unknown>) => void;
  onUpdate?: (record: Record<string, unknown>, oldRecord?: Record<string, unknown>) => void;
  onDelete?: (record: Record<string, unknown>) => void;
};

export type TableSubscriptionConfig = ChannelTableConfig;

export interface UseRealtimeChannelOptions {
  channelName: string;
  subscriptions?: ChannelTableConfig[];
  configs?: ChannelTableConfig[];
  onReconnect?: () => void | Promise<void>;
  onRefetchNeeded?: () => void | Promise<void>;
  enabled?: boolean;
}

/**
 * Multi-table Supabase Realtime channel hook that:
 * - Groups multiple table listeners onto ONE single WebSocket channel per page/purpose
 * - Prevents connection over-subscription
 * - Tracks connection status: `connecting` | `live` | `reconnecting` | `offline`
 * - Automatically invokes onReconnect/onRefetchNeeded callback once when coming back online or refocusing tab
 * - Cleans up the channel on unmount, safe against React StrictMode duplicate subscriptions
 */
export function useRealtimeChannel({
  channelName,
  subscriptions,
  configs,
  onReconnect,
  onRefetchNeeded,
  enabled = true,
}: UseRealtimeChannelOptions): { status: RealtimeConnectionStatus } {
  const activeSubs = configs || subscriptions || [];
  const activeRefetch = onRefetchNeeded || onReconnect;
  const subsKey = JSON.stringify(activeSubs.map((s) => ({ t: s.table, f: s.filter })));

  const [status, setStatus] = useState<RealtimeConnectionStatus>(() => {
    if (typeof navigator !== "undefined" && !navigator.onLine) return "offline";
    return hasSupabaseBrowserConfig() ? "connecting" : "live";
  });

  const onReconnectRef = useRef(activeRefetch);
  onReconnectRef.current = activeRefetch;

  const subscriptionsRef = useRef(activeSubs);
  subscriptionsRef.current = activeSubs;

  const prevStatusRef = useRef<RealtimeConnectionStatus>(status);
  const isMountedRef = useRef(true);

  // Tab refocus & network listeners
  useEffect(() => {
    isMountedRef.current = true;

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void onReconnectRef.current?.();
      }
    };

    const handleOnline = () => {
      setStatus("reconnecting");
      void onReconnectRef.current?.();
    };

    const handleOffline = () => {
      setStatus("offline");
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      isMountedRef.current = false;
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    if (!enabled || activeSubs.length === 0) return;

    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      setStatus(typeof navigator !== "undefined" && !navigator.onLine ? "offline" : "live");
      return;
    }

    setStatus("connecting");

    const uniqueChannelName = `${channelName}_${Math.random().toString(36).slice(2, 7)}`;
    let channel = supabase.channel(uniqueChannelName);

    // Register all table subscriptions on this SINGLE channel
    for (const sub of subscriptionsRef.current) {
      channel = channel.on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: sub.table,
          ...(sub.filter ? { filter: sub.filter } : {}),
        },
        (payload) => {
          if (!isMountedRef.current) return;
          const newRecord = (payload.new as Record<string, unknown>) ?? {};
          const oldRecord = (payload.old as Record<string, unknown>) ?? {};
          const eventType = payload.eventType as "INSERT" | "UPDATE" | "DELETE";

          if (sub.onChange) {
            sub.onChange({ eventType, new: newRecord, old: oldRecord });
          }
          if (eventType === "INSERT" && sub.onInsert) {
            sub.onInsert(newRecord);
          } else if (eventType === "UPDATE" && sub.onUpdate) {
            sub.onUpdate(newRecord, oldRecord);
          } else if (eventType === "DELETE" && sub.onDelete) {
            sub.onDelete(oldRecord);
          }
        },
      );
    }

    channel.subscribe((channelStatus, subErr) => {
      if (!isMountedRef.current) return;

      if (subErr) {
        console.warn(`[useRealtimeChannel:${channelName}] Subscription error:`, subErr);
      }

      if (channelStatus === "SUBSCRIBED") {
        if (prevStatusRef.current === "reconnecting" || prevStatusRef.current === "offline") {
          void onReconnectRef.current?.();
        }
        setStatus("live");
        prevStatusRef.current = "live";
      } else if (channelStatus === "TIMED_OUT" || channelStatus === "CHANNEL_ERROR") {
        setStatus("reconnecting");
        prevStatusRef.current = "reconnecting";
      } else if (channelStatus === "CLOSED") {
        setStatus("offline");
        prevStatusRef.current = "offline";
      }
    });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [channelName, enabled, subsKey, activeSubs.length]);

  return { status };
}
