"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRealtimeTable } from "@/hooks/use-realtime-table";
import {
  Icon,
  IconClock,
  IconTable,
  IconSettings,
  IconFilter,
} from "@/components/icons";

export type AdminReservation = {
  id: string;
  restaurant_id: string;
  guest_name: string;
  phone: string;
  party_size: number;
  reservation_date: string;
  reservation_time: string;
  table_id: string | null;
  table_number?: string | null;
  notes: string | null;
  status: "pending" | "confirmed" | "seated" | "completed" | "cancelled" | "no_show";
  created_at: string;
  updated_at: string;
};

interface AdminReservationsSectionProps {
  restaurantId: string;
  restaurantName: string;
  settings: {
    enable_reservations?: boolean;
    reservation_opening_time?: string | null;
    reservation_closing_time?: string | null;
    reservation_slot_duration?: number | null;
    reservation_max_party_size?: number | null;
    reservation_max_days_advance?: number | null;
    reservation_auto_confirm?: boolean | null;
  };
  onUpdateSettings: (patch: Record<string, unknown>) => Promise<unknown>;
}

export default function AdminReservationsSection({
  restaurantId,
  restaurantName,
  settings,
  onUpdateSettings,
}: AdminReservationsSectionProps) {
  const todayStr = new Date().toISOString().split("T")[0];

  const [tab, setTab] = useState<"today" | "upcoming" | "past">("today");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [tablesList, setTablesList] = useState<{ id: string; table_number: string }[]>([]);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [actionError, setActionError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // Settings form local state
  const [settingsForm, setSettingsForm] = useState({
    enable_reservations: settings.enable_reservations !== false,
    reservation_opening_time: settings.reservation_opening_time || "11:00",
    reservation_closing_time: settings.reservation_closing_time || "23:00",
    reservation_slot_duration: settings.reservation_slot_duration || 60,
    reservation_max_party_size: settings.reservation_max_party_size || 12,
    reservation_max_days_advance: settings.reservation_max_days_advance || 30,
    reservation_auto_confirm: settings.reservation_auto_confirm || false,
  });

  useEffect(() => {
    setSettingsForm({
      enable_reservations: settings.enable_reservations !== false,
      reservation_opening_time: settings.reservation_opening_time || "11:00",
      reservation_closing_time: settings.reservation_closing_time || "23:00",
      reservation_slot_duration: settings.reservation_slot_duration || 60,
      reservation_max_party_size: settings.reservation_max_party_size || 12,
      reservation_max_days_advance: settings.reservation_max_days_advance || 30,
      reservation_auto_confirm: settings.reservation_auto_confirm || false,
    });
  }, [settings]);

  // Fetch reservations from server
  const fetchReservations = useCallback(async (): Promise<AdminReservation[]> => {
    try {
      const res = await fetch(`/api/admin/${restaurantId}/reservations?tab=${tab}&status=${statusFilter}`, {
        cache: "no-store",
      });
      if (res.ok) {
        const json = await res.json();
        if (json.tables && Array.isArray(json.tables)) {
          setTablesList(json.tables);
        }
        return json.reservations || [];
      }
    } catch (err) {
      console.warn("Failed to fetch admin reservations:", err);
    }
    return [];
  }, [restaurantId, tab, statusFilter]);

  // Real-time table subscription for reservations
  const {
    data: reservations,
    setData: setReservations,
    status: connectionStatus,
    isLoading: isReservationsLoading,
    error: reservationsError,
    refetch,
  } = useRealtimeTable<AdminReservation>({
    table: "reservations",
    restaurantId,
    fetchData: fetchReservations,
  });

  // Re-fetch when tab or filter changes
  useEffect(() => {
    void refetch();
  }, [tab, statusFilter, refetch]);

  // Calculate pending count for badge
  const pendingCount = useMemo(() => {
    return reservations.filter((r) => r.status === "pending").length;
  }, [reservations]);

  // Filtered list based on active tab and status
  const displayedReservations = useMemo(() => {
    return reservations.filter((r) => {
      // Tab date filter
      if (tab === "today" && r.reservation_date !== todayStr) return false;
      if (tab === "upcoming" && r.reservation_date <= todayStr) return false;
      if (tab === "past" && r.reservation_date >= todayStr) return false;

      // Status filter
      if (statusFilter !== "all" && r.status !== statusFilter) return false;

      return true;
    });
  }, [reservations, tab, statusFilter, todayStr]);

  // Optimistic update for reservation action
  async function updateReservationStatus(
    reservationId: string,
    nextStatus: AdminReservation["status"],
    tableId?: string,
  ) {
    const previous = [...reservations];
    setActionError("");
    setActionSuccess("");

    // Optimistically update local state
    setReservations((prev) =>
      prev.map((r) =>
        r.id === reservationId
          ? {
              ...r,
              status: nextStatus,
              table_id: tableId !== undefined ? tableId : r.table_id,
              table_number:
                tableId !== undefined
                  ? tablesList.find((t) => t.id === tableId)?.table_number || null
                  : r.table_number,
              updated_at: new Date().toISOString(),
            }
          : r,
      ),
    );

    try {
      const res = await fetch(`/api/reservations/${reservationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: nextStatus,
          tableId,
        }),
      });

      if (!res.ok) {
        const errorJson = await res.json().catch(() => null);
        throw new Error(errorJson?.error || "Could not update reservation.");
      }

      setActionSuccess(`Reservation marked as ${nextStatus}.`);
      setTimeout(() => setActionSuccess(""), 4000);
    } catch (err) {
      // Rollback on error
      setReservations(previous);
      setActionError(err instanceof Error ? err.message : "Action failed. Reverted changes.");
      setTimeout(() => setActionError(""), 5000);
    }
  }

  // Save reservation settings
  async function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault();
    setIsSavingSettings(true);
    setActionError("");
    setActionSuccess("");
    try {
      await onUpdateSettings(settingsForm);
      setIsSettingsOpen(false);
      setActionSuccess("Reservation settings saved successfully.");
      setTimeout(() => setActionSuccess(""), 4000);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Could not save reservation settings.");
    } finally {
      setIsSavingSettings(false);
    }
  }

  return (
    <div className="admin-reservations-wrapper">
      {/* Toast Notification Banners */}
      {actionSuccess && (
        <aside className="admin-res-toast success" role="alert">
          <Icon name="check" size={15} />
          <span>{actionSuccess}</span>
        </aside>
      )}
      {actionError && (
        <aside className="admin-res-toast error" role="alert">
          <Icon name="alert-triangle" size={15} />
          <span>{actionError}</span>
        </aside>
      )}
      {reservationsError && (
        <aside className="admin-res-toast error" role="alert">
          <Icon name="alert-triangle" size={15} />
          <span>{reservationsError}</span>
        </aside>
      )}

      {/* Top Header & Action Controls */}
      <div className="admin-res-header">
        <div className="admin-res-title-wrap">
          <div className="admin-res-title-row">
            <h2 className="admin-res-title">Table Reservations</h2>
            <div className={`kitchen-live-pill status-${connectionStatus}`}>
              <span className={`live-dot ${connectionStatus}`} />
              <span>{connectionStatus === "live" ? "Live Sync" : connectionStatus}</span>
            </div>
          </div>
          <p className="admin-res-subtitle">
            Manage incoming guest bookings, assign tables, and control booking limits for {restaurantName}.
          </p>
        </div>

        <button
          className="admin-res-settings-btn"
          onClick={() => setIsSettingsOpen(!isSettingsOpen)}
          type="button"
        >
          <IconSettings size={15} />
          <span>Booking Settings</span>
        </button>
      </div>

      {/* Reservation Settings Drawer / Card */}
      {isSettingsOpen && (
        <form className="admin-res-settings-card motion-fade-rise" onSubmit={handleSaveSettings}>
          <div className="settings-card-header">
            <h3>Reservation Rules &amp; Hours</h3>
            <span className="settings-badge">Applied to Guest Booking</span>
          </div>

          <div className="settings-fields-grid">
            <div className="settings-field">
              <label className="settings-checkbox-label">
                <input
                  type="checkbox"
                  checked={settingsForm.enable_reservations}
                  onChange={(e) =>
                    setSettingsForm((prev) => ({ ...prev, enable_reservations: e.target.checked }))
                  }
                />
                <span>Enable Guest Table Reservations</span>
              </label>
            </div>

            <div className="settings-field">
              <label className="settings-checkbox-label">
                <input
                  type="checkbox"
                  checked={settingsForm.reservation_auto_confirm}
                  onChange={(e) =>
                    setSettingsForm((prev) => ({ ...prev, reservation_auto_confirm: e.target.checked }))
                  }
                />
                <span>Auto-Confirm Bookings (Bypass Manual Review)</span>
              </label>
            </div>

            <div className="settings-field">
              <label className="settings-label">Opening Time</label>
              <input
                className="settings-input"
                type="time"
                value={settingsForm.reservation_opening_time}
                onChange={(e) =>
                  setSettingsForm((prev) => ({ ...prev, reservation_opening_time: e.target.value }))
                }
              />
            </div>

            <div className="settings-field">
              <label className="settings-label">Closing Time</label>
              <input
                className="settings-input"
                type="time"
                value={settingsForm.reservation_closing_time}
                onChange={(e) =>
                  setSettingsForm((prev) => ({ ...prev, reservation_closing_time: e.target.value }))
                }
              />
            </div>

            <div className="settings-field">
              <label className="settings-label">Slot Duration</label>
              <select
                className="settings-select"
                value={settingsForm.reservation_slot_duration}
                onChange={(e) =>
                  setSettingsForm((prev) => ({
                    ...prev,
                    reservation_slot_duration: Number(e.target.value),
                  }))
                }
              >
                <option value={30}>30 Minutes</option>
                <option value={45}>45 Minutes</option>
                <option value={60}>60 Minutes (Standard)</option>
                <option value={90}>90 Minutes</option>
                <option value={120}>120 Minutes</option>
              </select>
            </div>

            <div className="settings-field">
              <label className="settings-label">Max Party Size</label>
              <input
                className="settings-input"
                type="number"
                min={1}
                max={40}
                value={settingsForm.reservation_max_party_size}
                onChange={(e) =>
                  setSettingsForm((prev) => ({
                    ...prev,
                    reservation_max_party_size: Number(e.target.value),
                  }))
                }
              />
            </div>

            <div className="settings-field">
              <label className="settings-label">Max Days in Advance</label>
              <input
                className="settings-input"
                type="number"
                min={1}
                max={90}
                value={settingsForm.reservation_max_days_advance}
                onChange={(e) =>
                  setSettingsForm((prev) => ({
                    ...prev,
                    reservation_max_days_advance: Number(e.target.value),
                  }))
                }
              />
            </div>
          </div>

          <div className="settings-actions-row">
            <button
              className="admin-btn-secondary"
              type="button"
              onClick={() => setIsSettingsOpen(false)}
            >
              Cancel
            </button>
            <button
              className="admin-btn-primary"
              type="submit"
              disabled={isSavingSettings}
            >
              {isSavingSettings ? "Saving Rules…" : "Save Booking Rules"}
            </button>
          </div>
        </form>
      )}

      {/* Tabs and Filter Bar */}
      <div className="admin-res-tabs-bar">
        <div className="admin-res-tabs">
          <button
            className={`admin-res-tab-btn ${tab === "today" ? "active" : ""}`}
            onClick={() => setTab("today")}
            type="button"
          >
            <span>Today&apos;s Bookings</span>
            {pendingCount > 0 && <span className="admin-res-count-badge">{pendingCount}</span>}
          </button>
          <button
            className={`admin-res-tab-btn ${tab === "upcoming" ? "active" : ""}`}
            onClick={() => setTab("upcoming")}
            type="button"
          >
            <span>Upcoming</span>
          </button>
          <button
            className={`admin-res-tab-btn ${tab === "past" ? "active" : ""}`}
            onClick={() => setTab("past")}
            type="button"
          >
            <span>Past</span>
          </button>
        </div>

        <div className="admin-res-filter-row">
          <IconFilter size={14} className="filter-icon" />
          <select
            aria-label="Filter reservations by status"
            className="admin-res-status-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="seated">Seated</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
            <option value="no_show">No Show</option>
          </select>
        </div>
      </div>

      {/* Reservations List */}
      {isReservationsLoading ? (
        <div className="admin-res-empty-state">
          <p className="admin-loading-indicator">Loading reservations…</p>
        </div>
      ) : displayedReservations.length === 0 ? (
        <div className="admin-res-empty-state">
          <div className="empty-icon-wrap">
            <IconClock size={36} />
          </div>
          <h3>No reservations here</h3>
          <p>
            {tab === "today"
              ? "No reservations booked for today. New bookings from guests appear automatically."
              : `No ${tab} reservations found matching your filter.`}
          </p>
        </div>
      ) : (
        <div className="admin-res-cards-grid">
          {displayedReservations.map((res) => {
            const timeSlice = res.reservation_time?.slice(0, 5) || "12:00";
            return (
              <article key={res.id} className="admin-res-card motion-fade-rise">
                <div className="res-card-top">
                  <div className="res-card-guest">
                    <h3 className="res-guest-name">{res.guest_name}</h3>
                    <div className="res-guest-meta">
                      <span className="res-phone">{res.phone}</span>
                      <span className="meta-bullet">·</span>
                      <span className="res-party">{res.party_size} Guests</span>
                    </div>
                  </div>

                  <span className={`reservation-status-pill status-${res.status}`}>
                    {res.status === "confirmed" && "Confirmed"}
                    {res.status === "pending" && "Pending"}
                    {res.status === "seated" && "Seated"}
                    {res.status === "completed" && "Completed"}
                    {res.status === "cancelled" && "Cancelled"}
                    {res.status === "no_show" && "No Show"}
                  </span>
                </div>

                <div className="res-card-details">
                  <div className="res-detail-item">
                    <span className="detail-label">Date &amp; Time</span>
                    <strong className="detail-val">
                      {res.reservation_date} at {timeSlice}
                    </strong>
                  </div>

                  <div className="res-detail-item">
                    <span className="detail-label">Assigned Table</span>
                    <div className="table-assign-wrap">
                      <select
                        aria-label="Assign table"
                        className="table-assign-select"
                        value={res.table_id || ""}
                        onChange={(e) =>
                          void updateReservationStatus(res.id, res.status, e.target.value || "")
                        }
                      >
                        <option value="">Unassigned</option>
                        {tablesList.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.table_number}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {res.notes && (
                  <div className="res-card-notes">
                    <span className="notes-label">Special request:</span>
                    <p className="notes-text">&ldquo;{res.notes}&rdquo;</p>
                  </div>
                )}

                {/* Staff Actions Bar */}
                <div className="res-card-actions">
                  {res.status === "pending" && (
                    <>
                      <button
                        className="res-action-btn confirm"
                        onClick={() => void updateReservationStatus(res.id, "confirmed")}
                        type="button"
                      >
                        <Icon name="check" size={13} />
                        <span>Confirm</span>
                      </button>
                      <button
                        className="res-action-btn cancel"
                        onClick={() => void updateReservationStatus(res.id, "cancelled")}
                        type="button"
                      >
                        <span>Decline</span>
                      </button>
                    </>
                  )}

                  {res.status === "confirmed" && (
                    <>
                      <button
                        className="res-action-btn seat"
                        onClick={() => void updateReservationStatus(res.id, "seated")}
                        type="button"
                      >
                        <IconTable size={13} />
                        <span>Seat Guests</span>
                      </button>
                      <button
                        className="res-action-btn noshow"
                        onClick={() => void updateReservationStatus(res.id, "no_show")}
                        type="button"
                      >
                        <span>No-Show</span>
                      </button>
                      <button
                        className="res-action-btn cancel"
                        onClick={() => void updateReservationStatus(res.id, "cancelled")}
                        type="button"
                      >
                        <span>Cancel</span>
                      </button>
                    </>
                  )}

                  {res.status === "seated" && (
                    <button
                      className="res-action-btn complete"
                      onClick={() => void updateReservationStatus(res.id, "completed")}
                      type="button"
                    >
                      <Icon name="check" size={13} />
                      <span>Complete &amp; Free Table</span>
                    </button>
                  )}

                  {(res.status === "completed" || res.status === "cancelled" || res.status === "no_show") && (
                    <span className="res-finished-tag">No further action needed</span>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
