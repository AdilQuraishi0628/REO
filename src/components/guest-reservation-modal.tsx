"use client";

import { useEffect, useState, useCallback } from "react";
import { Icon, IconClose, IconClock, IconTable } from "@/components/icons";
import { useRealtimeChannel } from "@/hooks/use-realtime-table";

export type ReservationSlot = {
  time: string;
  available: boolean;
  remainingCapacity: number;
};

export type ReservationRecord = {
  id: string;
  restaurant_id: string;
  guest_name: string;
  phone: string;
  party_size: number;
  reservation_date: string;
  reservation_time: string;
  table_id: string | null;
  notes: string | null;
  status: "pending" | "confirmed" | "seated" | "completed" | "cancelled" | "no_show";
  created_at: string;
  updated_at: string;
};

interface GuestReservationModalProps {
  restaurantId: string;
  restaurantName: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function GuestReservationModal({
  restaurantId,
  restaurantName,
  isOpen,
  onClose,
}: GuestReservationModalProps) {
  const todayStr = new Date().toISOString().split("T")[0];
  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + 30);
  const maxDateStr = maxDate.toISOString().split("T")[0];

  const [date, setDate] = useState(todayStr);
  const [partySize, setPartySize] = useState(2);
  const [selectedSlot, setSelectedSlot] = useState("");
  const [guestName, setGuestName] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");

  const [slots, setSlots] = useState<ReservationSlot[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [confirmedReservation, setConfirmedReservation] = useState<ReservationRecord | null>(null);

  // Fetch available slots for the selected date
  const loadSlots = useCallback(async (targetDate: string) => {
    setIsLoadingSlots(true);
    setErrorMessage("");
    try {
      const res = await fetch(`/api/reservations?restaurantId=${restaurantId}&date=${targetDate}`);
      if (!res.ok) {
        throw new Error("Could not load available reservation times.");
      }
      const data = await res.json();
      const loadedSlots: ReservationSlot[] = data.slots || [];
      setSlots(loadedSlots);

      // Auto-select first available slot if current selected is invalid
      const firstAvail = loadedSlots.find((s) => s.available);
      if (firstAvail && (!selectedSlot || !loadedSlots.some((s) => s.time === selectedSlot && s.available))) {
        setSelectedSlot(firstAvail.time);
      }
    } catch (err) {
      console.error("Failed to load slots:", err);
      setErrorMessage(err instanceof Error ? err.message : "Error loading slots");
    } finally {
      setIsLoadingSlots(false);
    }
  }, [restaurantId, selectedSlot]);

  useEffect(() => {
    if (isOpen && !confirmedReservation) {
      void loadSlots(date);
    }
  }, [isOpen, date, loadSlots, confirmedReservation]);

  // Real-time broadcast listener and gentle poll for guest's confirmed reservation
  const [activeRecord, setActiveRecord] = useState<ReservationRecord | null>(confirmedReservation);

  useEffect(() => {
    if (confirmedReservation) {
      setActiveRecord(confirmedReservation);
    }
  }, [confirmedReservation]);

  const fetchSingleReservation = useCallback(async (): Promise<ReservationRecord | null> => {
    if (!confirmedReservation?.id) return null;
    try {
      const res = await fetch(`/api/reservations/${confirmedReservation.id}`);
      if (res.ok) {
        const json = await res.json();
        if (json?.reservation) return json.reservation as ReservationRecord;
      }
    } catch {
      // Ignore
    }
    return null;
  }, [confirmedReservation?.id]);

  // Gentle 15s poll fallback when reservation is active
  useEffect(() => {
    if (!confirmedReservation?.id) return;
    const timer = window.setInterval(async () => {
      const fresh = await fetchSingleReservation();
      if (fresh) setActiveRecord(fresh);
    }, 15_000);
    return () => window.clearInterval(timer);
  }, [confirmedReservation?.id, fetchSingleReservation]);

  useRealtimeChannel({
    channelName: confirmedReservation?.id
      ? `reservation:${confirmedReservation.id}`
      : "guest-reservation-idle",
    enabled: Boolean(confirmedReservation?.id),
    broadcasts: [
      {
        event: "reservation_status_change",
        onReceive: (payload) => {
          if (payload.status) {
            setActiveRecord((prev) =>
              prev ? { ...prev, status: payload.status as ReservationRecord["status"] } : null
            );
          }
        },
      },
    ],
    onRefetchNeeded: () => {
      void fetchSingleReservation().then((fresh) => {
        if (fresh) setActiveRecord(fresh);
      });
    },
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedSlot) {
      setErrorMessage("Please select a time slot.");
      return;
    }
    if (!guestName.trim()) {
      setErrorMessage("Please enter your name.");
      return;
    }
    if (!phone.trim()) {
      setErrorMessage("Please enter your phone number.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");
    try {
      const res = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          restaurantId,
          guestName: guestName.trim(),
          phone: phone.trim(),
          partySize,
          reservationDate: date,
          reservationTime: selectedSlot,
          notes: notes.trim() || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Reservation request failed. Please choose another time.");
      }

      setConfirmedReservation(data.reservation);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Could not submit reservation.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleReset() {
    setConfirmedReservation(null);
    setGuestName("");
    setPhone("");
    setNotes("");
    setPartySize(2);
    setDate(todayStr);
    onClose();
  }

  if (!isOpen) return null;

  return (
    <div className="reservation-modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="reservation-modal-card motion-fade-rise" onClick={(e) => e.stopPropagation()}>
        <div className="reservation-modal-header">
          <div className="reservation-header-copy">
            <span className="reservation-eyebrow">TABLE RESERVATION</span>
            <h2 className="reservation-modal-title">{restaurantName}</h2>
          </div>
          <button
            aria-label="Close reservation modal"
            className="reservation-close-btn"
            onClick={onClose}
            type="button"
          >
            <IconClose size={18} />
          </button>
        </div>

        {confirmedReservation ? (
          /* Confirmation & Live Tracking View */
          <div className="reservation-confirmed-content">
            <div className="reservation-success-badge">
              <Icon name="check" size={28} animate="draw" />
            </div>

            <h3 className="confirmed-heading">Table Reserved</h3>
            <p className="confirmed-ref-badge">
              Booking Ref: <strong>#RES-{activeRecord?.id?.slice(-4).toUpperCase() || "CONF"}</strong>
            </p>

            <div className="confirmed-status-pill-wrap">
              <span className={`reservation-status-pill status-${activeRecord?.status}`}>
                {activeRecord?.status === "confirmed" && "● Confirmed by Staff"}
                {activeRecord?.status === "pending" && "⏳ Pending Confirmation"}
                {activeRecord?.status === "seated" && "🍽️ Seated at Table"}
                {activeRecord?.status === "completed" && "✓ Completed"}
                {activeRecord?.status === "cancelled" && "✕ Cancelled"}
              </span>
            </div>

            <div className="confirmed-details-box">
              <div className="confirmed-row">
                <span className="row-label">Guest</span>
                <span className="row-val">{activeRecord?.guest_name}</span>
              </div>
              <div className="confirmed-row">
                <span className="row-label">Party</span>
                <span className="row-val">{activeRecord?.party_size} Guests</span>
              </div>
              <div className="confirmed-row">
                <span className="row-label">Date & Time</span>
                <span className="row-val">
                  {activeRecord?.reservation_date} at {activeRecord?.reservation_time?.slice(0, 5)}
                </span>
              </div>
              {activeRecord?.notes && (
                <div className="confirmed-row">
                  <span className="row-label">Special Notes</span>
                  <span className="row-val">{activeRecord.notes}</span>
                </div>
              )}
            </div>

            <div className="confirmed-arrival-tip">
              <IconClock size={15} />
              <span>Please arrive 5 minutes before your slot. Tables are held for 15 minutes.</span>
            </div>

            <button className="reservation-done-btn" onClick={handleReset} type="button">
              Done & Return to Menu
            </button>
          </div>
        ) : (
          /* Reservation Booking Form */
          <form className="reservation-form" onSubmit={handleSubmit}>
            {errorMessage && (
              <div className="reservation-error-banner" role="alert">
                <Icon name="alert-triangle" size={15} />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Date and Party Size Row */}
            <div className="reservation-field-row">
              <div className="reservation-field">
                <label htmlFor="res-date" className="reservation-label">
                  Date
                </label>
                <input
                  id="res-date"
                  className="reservation-input"
                  type="date"
                  min={todayStr}
                  max={maxDateStr}
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </div>

              <div className="reservation-field">
                <label htmlFor="res-party" className="reservation-label">
                  Guests
                </label>
                <div className="reservation-party-stepper">
                  <button
                    type="button"
                    className="stepper-btn"
                    onClick={() => setPartySize((p) => Math.max(1, p - 1))}
                    disabled={partySize <= 1}
                  >
                    -
                  </button>
                  <span className="stepper-count">{partySize}</span>
                  <button
                    type="button"
                    className="stepper-btn"
                    onClick={() => setPartySize((p) => Math.min(16, p + 1))}
                    disabled={partySize >= 16}
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            {/* Time Slot Picker */}
            <div className="reservation-field">
              <div className="reservation-label-row">
                <label className="reservation-label">Select Time Slot</label>
                {isLoadingSlots && <span className="slots-loading-text">Checking availability…</span>}
              </div>

              {isLoadingSlots ? (
                <div className="slots-skeleton-grid">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="slot-skeleton" />
                  ))}
                </div>
              ) : slots.length === 0 ? (
                <div className="slots-empty-notice">No slots available for this date.</div>
              ) : (
                <div className="reservation-slots-grid">
                  {slots.map((slot) => {
                    const isSelected = selectedSlot === slot.time;
                    return (
                      <button
                        key={slot.time}
                        type="button"
                        disabled={!slot.available}
                        onClick={() => setSelectedSlot(slot.time)}
                        className={`slot-chip ${isSelected ? "selected" : ""} ${!slot.available ? "unavailable" : ""}`}
                      >
                        <span className="slot-chip-time">{slot.time}</span>
                        {slot.available ? (
                          <span className="slot-chip-cap">
                            {slot.remainingCapacity <= 2 ? `Only ${slot.remainingCapacity} left` : "Available"}
                          </span>
                        ) : (
                          <span className="slot-chip-cap">Full</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Guest Name & Phone */}
            <div className="reservation-field-row">
              <div className="reservation-field">
                <label htmlFor="res-name" className="reservation-label">
                  Your Name
                </label>
                <input
                  id="res-name"
                  className="reservation-input"
                  type="text"
                  placeholder="e.g. Aditi Sharma"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  required
                />
              </div>

              <div className="reservation-field">
                <label htmlFor="res-phone" className="reservation-label">
                  Mobile Number
                </label>
                <input
                  id="res-phone"
                  className="reservation-input"
                  type="tel"
                  placeholder="10-digit mobile"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Special Instructions */}
            <div className="reservation-field">
              <label htmlFor="res-notes" className="reservation-label">
                Special Requests <span className="label-sub">(Optional)</span>
              </label>
              <input
                id="res-notes"
                className="reservation-input"
                type="text"
                placeholder="Window seat, quiet corner, anniversary, etc."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <button
              className="reservation-submit-btn"
              type="submit"
              disabled={isSubmitting || !selectedSlot}
            >
              <IconTable size={16} />
              <span>{isSubmitting ? "Securing Table…" : "Confirm Table Reservation"}</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
