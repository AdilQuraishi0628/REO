import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

/**
 * Server-side Supabase Realtime Broadcast utilities.
 * Allows backend API routes to broadcast events directly to dedicated channels
 * without requiring client-side row-level security (RLS) to be open to anon.
 */

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Broadcasts an event to staff & kitchen for a specific restaurant.
 * Channel: `kitchen-${restaurantId}`
 */
export async function broadcastToKitchen(
  restaurantId: string,
  event: "new_order" | "order_status_change" | "service_request" | "service_request_resolved" | "new_reservation" | "reservation_status_change",
  payload: Record<string, unknown>,
): Promise<void> {
  const client = getServiceClient();
  if (!client || !restaurantId) return;

  try {
    const channelName = `kitchen-${restaurantId}`;
    const channel = client.channel(channelName);
    await new Promise<void>((resolve) => {
      channel.subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          try {
            await channel.send({
              type: "broadcast",
              event,
              payload,
            });
          } catch (err) {
            console.error(`Failed to send broadcast on ${channelName}:`, err);
          } finally {
            void client.removeChannel(channel);
            resolve();
          }
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          void client.removeChannel(channel);
          resolve();
        }
      });
    });
  } catch (err) {
    console.error(`Error broadcasting to kitchen-${restaurantId}:`, err);
  }
}

/**
 * Broadcasts an order status change to the guest tracking their own order.
 * Channel: `order:${orderId}`
 */
export async function broadcastToOrder(
  orderId: string,
  event: "order_status_change" | "order_updated",
  payload: Record<string, unknown>,
): Promise<void> {
  const client = getServiceClient();
  if (!client || !orderId) return;

  try {
    const channelName = `order:${orderId}`;
    const channel = client.channel(channelName);
    await new Promise<void>((resolve) => {
      channel.subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          try {
            await channel.send({
              type: "broadcast",
              event,
              payload,
            });
          } catch (err) {
            console.error(`Failed to send broadcast on ${channelName}:`, err);
          } finally {
            void client.removeChannel(channel);
            resolve();
          }
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          void client.removeChannel(channel);
          resolve();
        }
      });
    });
  } catch (err) {
    console.error(`Error broadcasting to order:${orderId}:`, err);
  }
}

/**
 * Broadcasts a reservation status change to the guest tracking their reservation.
 * Channel: `reservation:${reservationId}`
 */
export async function broadcastToReservation(
  reservationId: string,
  event: "reservation_status_change" | "reservation_updated",
  payload: Record<string, unknown>,
): Promise<void> {
  const client = getServiceClient();
  if (!client || !reservationId) return;

  try {
    const channelName = `reservation:${reservationId}`;
    const channel = client.channel(channelName);
    await new Promise<void>((resolve) => {
      channel.subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          try {
            await channel.send({
              type: "broadcast",
              event,
              payload,
            });
          } catch (err) {
            console.error(`Failed to send broadcast on ${channelName}:`, err);
          } finally {
            void client.removeChannel(channel);
            resolve();
          }
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          void client.removeChannel(channel);
          resolve();
        }
      });
    });
  } catch (err) {
    console.error(`Error broadcasting to reservation:${reservationId}:`, err);
  }
}
