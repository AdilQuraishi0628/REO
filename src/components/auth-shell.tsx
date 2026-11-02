"use client";

import Link from "next/link";
import React, { useEffect, useState } from "react";

const DEMO_TICKETS = [
  { table: "Table 4", items: "Cold brew, banoffee slice" },
  { table: "Table 9", items: "Paneer tikka sandwich" },
  { table: "Table 2", items: "2 filter coffee" },
  { table: "Table 7", items: "Club sandwich, lemon soda" },
  { table: "Table 5", items: "Cappuccino, croissant" },
];

type TicketItem = {
  id: number;
  table: string;
  items: string;
  isOld: boolean;
};

export default function AuthShell({ children }: { children: React.ReactNode }) {
  const [tickets, setTickets] = useState<TicketItem[]>([]);

  useEffect(() => {
    let index = 0;
    let nextId = 1;

    const pushTicket = () => {
      const sample = DEMO_TICKETS[index % DEMO_TICKETS.length];
      index++;
      setTickets((prev) => {
        const markedOld = prev.map((t) => ({ ...t, isOld: true }));
        const newTicket: TicketItem = {
          id: nextId++,
          table: sample.table,
          items: sample.items,
          isOld: false,
        };
        const updated = [newTicket, ...markedOld];
        return updated.slice(0, 3);
      });
    };

    // Initial sequence matching reference
    pushTicket();
    const t1 = setTimeout(pushTicket, 900);
    const t2 = setTimeout(pushTicket, 1800);
    const interval = setInterval(pushTicket, 3200);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="auth-wrap">
      <aside className="auth-panel">
        <Link href="/" className="auth-logo" aria-label="TableTap Home">
          <i>T</i>
          <span>TableTap</span>
        </Link>

        <div className="auth-panel-mid">
          <h2>
            Every order, <em>straight to the kitchen.</em>
          </h2>
          <p>
            Guests scan the table QR and order from their phone. Your team sees it
            the moment it&apos;s sent.
          </p>

          <div className="auth-tk" id="tk" aria-hidden="true">
            {tickets.map((t) => (
              <div
                key={t.id}
                className={`auth-t ${t.isOld ? "old" : ""}`}
              >
                <div>
                  <b>{t.table}</b>
                  <span>{t.items}</span>
                </div>
                <small>New</small>
              </div>
            ))}
          </div>
        </div>

        <div className="auth-pf">Made in Raipur</div>
      </aside>

      <main className="auth-side">
        <div className="auth-box">
          {children}

          <div className="auth-foot">
            <Link href="/privacy">Privacy policy</Link>
            <Link href="/terms">Terms of service</Link>
          </div>
        </div>
      </main>
    </div>
  );
}
