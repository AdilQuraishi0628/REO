export type ReservationStatus =
  | "pending"
  | "confirmed"
  | "seated"
  | "completed"
  | "cancelled"
  | "no_show";

export type ReservationRecord = {
  id: string;
  restaurant_id: string;
  guest_name: string;
  phone: string;
  party_size: number;
  reservation_date: string; // YYYY-MM-DD
  reservation_time: string; // HH:MM
  table_id: string | null;
  table_number?: string | null;
  notes: string | null;
  status: ReservationStatus;
  created_at: string;
  updated_at: string;
};

const globalForReservations = globalThis as unknown as {
  demoReservationsStore?: ReservationRecord[];
};

export const demoReservationsStore: ReservationRecord[] =
  globalForReservations.demoReservationsStore ?? [
    {
      id: "demo-res-1",
      restaurant_id: "00000000-0000-4000-8000-000000000001",
      guest_name: "Aarav Sharma",
      phone: "+919827100001",
      party_size: 4,
      reservation_date: new Date().toISOString().split("T")[0],
      reservation_time: "19:30",
      table_id: "00000000-0000-4000-8000-000000000004",
      table_number: "Table 4",
      notes: "Window seating preferred for anniversary dinner",
      status: "confirmed",
      created_at: new Date(Date.now() - 3600_000 * 2).toISOString(),
      updated_at: new Date(Date.now() - 3600_000 * 2).toISOString(),
    },
    {
      id: "demo-res-2",
      restaurant_id: "00000000-0000-4000-8000-000000000001",
      guest_name: "Pooja Verma",
      phone: "+919827100002",
      party_size: 2,
      reservation_date: new Date().toISOString().split("T")[0],
      reservation_time: "20:00",
      table_id: null,
      table_number: null,
      notes: "First time visiting Raipur cafe",
      status: "pending",
      created_at: new Date(Date.now() - 1800_000).toISOString(),
      updated_at: new Date(Date.now() - 1800_000).toISOString(),
    },
  ];

globalForReservations.demoReservationsStore = demoReservationsStore;

export function addDemoReservation(
  reservation: Omit<ReservationRecord, "id" | "created_at" | "updated_at">,
): ReservationRecord {
  const now = new Date().toISOString();
  const newRes: ReservationRecord = {
    ...reservation,
    id: `demo-res-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    created_at: now,
    updated_at: now,
  };
  demoReservationsStore.unshift(newRes);
  return newRes;
}

export function updateDemoReservationStatus(
  reservationId: string,
  status: ReservationStatus,
  tableId?: string | null,
): ReservationRecord | null {
  const res = demoReservationsStore.find((r) => r.id === reservationId);
  if (!res) return null;
  res.status = status;
  if (tableId !== undefined) {
    res.table_id = tableId;
  }
  res.updated_at = new Date().toISOString();
  return res;
}
