"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Icon } from "@/components/icons";

interface KDSTicket {
  id: string;
  ticketNumber: string;
  table: string;
  time: string;
  items: { name: string; qty: number }[];
  note?: string;
  status: "new" | "preparing" | "ready";
}

const INITIAL_TICKETS: KDSTicket[] = [
  {
    id: "t-201",
    ticketNumber: "#201",
    table: "Table 4",
    time: "1m ago",
    items: [
      { name: "Iced Vanilla Latte (Oat Milk)", qty: 2 },
      { name: "Artisan Sourdough Tartine", qty: 1 },
    ],
    note: "Less sweet, extra chilled",
    status: "new",
  },
  {
    id: "t-202",
    ticketNumber: "#202",
    table: "Table 2",
    time: "4m ago",
    items: [
      { name: "Single Origin Flat White", qty: 1 },
      { name: "Almond Butter Croissant", qty: 2 },
    ],
    status: "preparing",
  },
  {
    id: "t-203",
    ticketNumber: "#203",
    table: "Table 7",
    time: "7m ago",
    items: [
      { name: "Classic Cappuccino", qty: 2 },
      { name: "Truffle Parmesan Fries", qty: 1 },
    ],
    note: "Jain preparation (no garlic/onion)",
    status: "ready",
  },
];

export function InteractiveKDSBoard() {
  const [tickets, setTickets] = useState<KDSTicket[]>(INITIAL_TICKETS);
  const [activeTicket, setActiveTicket] = useState<string | null>(null);

  // Auto-progress simulation loop to keep the board alive
  useEffect(() => {
    const timer = setInterval(() => {
      setTickets((prev) => {
        // Find first 'new' and move to 'preparing' or 'preparing' to 'ready'
        const newTicket = prev.find((t) => t.status === "new");
        if (newTicket) {
          return prev.map((t) =>
            t.id === newTicket.id ? { ...t, status: "preparing", time: "Just now" } : t
          );
        }
        // If all are preparing/ready, reset one back with new timestamp
        return prev.map((t, idx) =>
          idx === 0 ? { ...t, status: "new", time: "Just now" } : t
        );
      });
    }, 14000);

    return () => clearInterval(timer);
  }, []);

  const advanceTicket = (id: string, currentStatus: "new" | "preparing" | "ready") => {
    setActiveTicket(id);
    setTimeout(() => setActiveTicket(null), 600);

    setTickets((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t;
        if (currentStatus === "new") return { ...t, status: "preparing", time: "Just now" };
        if (currentStatus === "preparing") return { ...t, status: "ready", time: "Just now" };
        return { ...t, status: "new", time: "Just now" };
      })
    );
  };

  const getTicketsByStatus = (status: "new" | "preparing" | "ready") =>
    tickets.filter((t) => t.status === status);

  return (
    <section className="tt-kds-contrast-section" id="kds">
      <div className="tt-kds-inner">
        {/* Section Header */}
        <div className="tt-kds-header">
          <span
            style={{
              fontFamily: "var(--tt-font-serif)",
              fontStyle: "italic",
              fontSize: "16px",
              color: "var(--tt-brass)",
              display: "block",
              marginBottom: "8px",
            }}
          >
            Live Kitchen Display System
          </span>
          <h2>A Calm Kitchen, Even on Sunday Rush</h2>
          <p>
            No lost paper dockets or shouted instructions. Orders slide into your kitchen display
            instantly, tagged with dietary notes and elapsed timers. Tap any ticket below to advance its status:
          </p>
        </div>

        {/* Live Ticket Board (3 Columns) */}
        <div className="tt-kds-board">
          {/* Column 1: New Orders */}
          <div className="tt-kds-column">
            <div className="tt-kds-col-header">
              <span className="tt-kds-col-title" style={{ color: "#F59E0B" }}>
                ● New Orders
              </span>
              <span className="tt-kds-col-count">{getTicketsByStatus("new").length}</span>
            </div>

            {getTicketsByStatus("new").map((ticket) => (
              <div
                key={ticket.id}
                className={`tt-kds-ticket ${activeTicket === ticket.id ? "advancing" : ""}`}
                data-cursor="Prepare"
                onClick={() => advanceTicket(ticket.id, "new")}
              >
                <div className="tt-ticket-top">
                  <span className="tt-ticket-table">{ticket.table}</span>
                  <span className="tt-ticket-time">{ticket.time}</span>
                </div>
                <div className="tt-ticket-items">
                  {ticket.items.map((item) => (
                    <div className="tt-ticket-item" key={item.name}>
                      <span>{item.name}</span>
                      <strong style={{ color: "var(--tt-brass)" }}>x{item.qty}</strong>
                    </div>
                  ))}
                </div>
                {ticket.note && <div className="tt-ticket-note">Note: {ticket.note}</div>}
                <button
                  type="button"
                  className="tt-ticket-status-btn"
                  style={{ marginTop: "12px" }}
                  onClick={(e) => {
                    e.stopPropagation();
                    advanceTicket(ticket.id, "new");
                  }}
                >
                  Start Preparing →
                </button>
              </div>
            ))}
          </div>

          {/* Column 2: Preparing */}
          <div className="tt-kds-column">
            <div className="tt-kds-col-header">
              <span className="tt-kds-col-title" style={{ color: "#60A5FA" }}>
                ● In Preparation
              </span>
              <span className="tt-kds-col-count">{getTicketsByStatus("preparing").length}</span>
            </div>

            {getTicketsByStatus("preparing").map((ticket) => (
              <div
                key={ticket.id}
                className={`tt-kds-ticket ${activeTicket === ticket.id ? "advancing" : ""}`}
                data-cursor="Ready"
                onClick={() => advanceTicket(ticket.id, "preparing")}
              >
                <div className="tt-ticket-top">
                  <span className="tt-ticket-table">{ticket.table}</span>
                  <span className="tt-ticket-time">{ticket.time}</span>
                </div>
                <div className="tt-ticket-items">
                  {ticket.items.map((item) => (
                    <div className="tt-ticket-item" key={item.name}>
                      <span>{item.name}</span>
                      <strong style={{ color: "var(--tt-brass)" }}>x{item.qty}</strong>
                    </div>
                  ))}
                </div>
                {ticket.note && <div className="tt-ticket-note">Note: {ticket.note}</div>}
                <button
                  type="button"
                  className="tt-ticket-status-btn"
                  style={{ marginTop: "12px" }}
                  onClick={(e) => {
                    e.stopPropagation();
                    advanceTicket(ticket.id, "preparing");
                  }}
                >
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                    <span>Mark order ready</span>
                    <Icon name="check" size={13} />
                  </span>
                </button>
              </div>
            ))}
          </div>

          {/* Column 3: Ready to Serve */}
          <div className="tt-kds-column">
            <div className="tt-kds-col-header">
              <span className="tt-kds-col-title" style={{ color: "#34D399", display: "inline-flex", alignItems: "center", gap: 6 }}>
                <Icon name="check" size={13} />
                <span>Ready for runner</span>
              </span>
              <span className="tt-kds-col-count">{getTicketsByStatus("ready").length}</span>
            </div>

            {getTicketsByStatus("ready").map((ticket) => (
              <div
                key={ticket.id}
                className={`tt-kds-ticket ${activeTicket === ticket.id ? "advancing" : ""}`}
                data-cursor="Served"
                onClick={() => advanceTicket(ticket.id, "ready")}
              >
                <div className="tt-ticket-top">
                  <span className="tt-ticket-table">{ticket.table}</span>
                  <span className="tt-ticket-time" style={{ color: "#34D399" }}>
                    Ready
                  </span>
                </div>
                <div className="tt-ticket-items">
                  {ticket.items.map((item) => (
                    <div className="tt-ticket-item" key={item.name}>
                      <span>{item.name}</span>
                      <strong style={{ color: "var(--tt-brass)" }}>x{item.qty}</strong>
                    </div>
                  ))}
                </div>
                {ticket.note && <div className="tt-ticket-note">Note: {ticket.note}</div>}
                <button
                  type="button"
                  className="tt-ticket-status-btn"
                  style={{ marginTop: "12px", background: "rgba(52, 211, 153, 0.15)", color: "#34D399" }}
                  onClick={(e) => {
                    e.stopPropagation();
                    advanceTicket(ticket.id, "ready");
                  }}
                >
                  Served &amp; Clear
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Link to Live KDS Route */}
        <div style={{ textAlign: "center", marginTop: "44px" }}>
          <Link
            href="/kitchen"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              background: "var(--tt-brass)",
              color: "var(--tt-dark-section)",
              padding: "12px 26px",
              borderRadius: "999px",
              fontWeight: 700,
              fontSize: "14px",
              textDecoration: "none",
              transition: "transform 0.2s ease, background 0.2s ease",
            }}
            data-cursor="Open KDS"
          >
            <span>Launch Live Kitchen KDS View</span>
            <Icon name="arrow-right" size={14} />
          </Link>
        </div>
      </div>
    </section>
  );
}
