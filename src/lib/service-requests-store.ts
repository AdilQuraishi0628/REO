export type ServiceRequestType = "call_waiter" | "request_bill";
export type ServiceRequestStatus = "pending" | "acknowledged" | "completed";

export type ServiceRequest = {
  id: string;
  restaurant_id: string;
  table_id: string | null;
  table_number: string;
  type: ServiceRequestType;
  status: ServiceRequestStatus;
  created_at: string;
  updated_at: string;
};

// Global in-memory store for demo mode when Supabase is not connected
const globalForRequests = globalThis as unknown as {
  demoServiceRequests?: ServiceRequest[];
};

export const demoServiceRequestsStore: ServiceRequest[] =
  globalForRequests.demoServiceRequests ?? [
    {
      id: "demo-req-1",
      restaurant_id: "00000000-0000-4000-8000-000000000001",
      table_id: "00000000-0000-4000-8000-000000000004",
      table_number: "Table 4",
      type: "call_waiter",
      status: "pending",
      created_at: new Date(Date.now() - 2 * 60_000).toISOString(),
      updated_at: new Date(Date.now() - 2 * 60_000).toISOString(),
    },
    {
      id: "demo-req-2",
      restaurant_id: "00000000-0000-4000-8000-000000000001",
      table_id: "00000000-0000-4000-8000-000000000002",
      table_number: "Table 2",
      type: "request_bill",
      status: "acknowledged",
      created_at: new Date(Date.now() - 5 * 60_000).toISOString(),
      updated_at: new Date(Date.now() - 3 * 60_000).toISOString(),
    },
    {
      id: "demo-req-3",
      restaurant_id: "00000000-0000-4000-8000-000000000002",
      table_id: "00000000-0000-4000-8000-000000000007",
      table_number: "Table 7",
      type: "call_waiter",
      status: "pending",
      created_at: new Date(Date.now() - 1 * 60_000).toISOString(),
      updated_at: new Date(Date.now() - 1 * 60_000).toISOString(),
    },
  ];

globalForRequests.demoServiceRequests = demoServiceRequestsStore;

export function addDemoServiceRequest(req: Omit<ServiceRequest, "id" | "created_at" | "updated_at">): ServiceRequest {
  const newReq: ServiceRequest = {
    ...req,
    id: `demo-req-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  demoServiceRequestsStore.unshift(newReq);
  return newReq;
}

export function updateDemoServiceRequestStatus(
  restaurantId: string,
  requestId: string,
  status: ServiceRequestStatus,
): ServiceRequest | null {
  const req = demoServiceRequestsStore.find(
    (item) => item.restaurant_id === restaurantId && item.id === requestId,
  );
  if (!req) return null;
  req.status = status;
  req.updated_at = new Date().toISOString();
  return req;
}
