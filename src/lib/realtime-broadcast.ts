/**
 * Server-side Realtime Broadcast utilities.
 * 
 * Note: Realtime synchronization for kitchen orders, status changes, service requests,
 * and reservations is handled directly via Supabase PostgreSQL replication (`postgres_changes`),
 * which publishes database table INSERTs and UPDATEs directly to connected clients.
 * 
 * In serverless Node.js 22 runtime, opening raw Phoenix WebSockets causes buffer stack overflows
 * in Undici WebSocket client. Real-time updates are delivered via Postgres CDC WAL replication.
 */

export async function broadcastToKitchen(
  restaurantId: string,
  event: "new_order" | "order_status_change" | "service_request" | "service_request_resolved" | "new_reservation" | "reservation_status_change",
  payload: Record<string, unknown>,
): Promise<void> {
  void restaurantId;
  void event;
  void payload;
  return Promise.resolve();
}

export async function broadcastToOrder(
  orderId: string,
  event: "order_status_change" | "order_updated",
  payload: Record<string, unknown>,
): Promise<void> {
  void orderId;
  void event;
  void payload;
  return Promise.resolve();
}

export async function broadcastToReservation(
  reservationId: string,
  event: "reservation_status_change" | "reservation_updated",
  payload: Record<string, unknown>,
): Promise<void> {
  void reservationId;
  void event;
  void payload;
  return Promise.resolve();
}
