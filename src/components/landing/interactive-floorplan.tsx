"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/icons";
import { demoRestaurants, demoTables } from "@/lib/restaurant-data";

interface FloorTable {
  id: string;
  tableNumber: string;
  code: string;
  restaurantSlug: string;
  restaurantName: string;
  zone: string;
  seats: number;
}

const FLOOR_TABLES: FloorTable[] = [
  {
    id: "t1",
    tableNumber: "Table 1",
    code: "demo-juniper-t1",
    restaurantSlug: "juniper-and-rye",
    restaurantName: "Juniper & Rye",
    zone: "Window Promenade",
    seats: 2,
  },
  {
    id: "t2",
    tableNumber: "Table 2",
    code: "demo-juniper-t2",
    restaurantSlug: "juniper-and-rye",
    restaurantName: "Juniper & Rye",
    zone: "Center Hall",
    seats: 4,
  },
  {
    id: "t4",
    tableNumber: "Table 4",
    code: "demo-juniper-t4",
    restaurantSlug: "juniper-and-rye",
    restaurantName: "Juniper & Rye",
    zone: "Sunlit Veranda",
    seats: 4,
  },
  {
    id: "t5",
    tableNumber: "Table 5",
    code: "demo-chai-t5",
    restaurantSlug: "chai-and-chutney",
    restaurantName: "Chai & Chutney",
    zone: "Bistro Counter",
    seats: 2,
  },
  {
    id: "t7",
    tableNumber: "Table 7",
    code: "demo-chai-t7",
    restaurantSlug: "chai-and-chutney",
    restaurantName: "Chai & Chutney",
    zone: "Courtyard",
    seats: 6,
  },
  {
    id: "t8",
    tableNumber: "Table 8",
    code: "demo-royal-t8",
    restaurantSlug: "the-royal-feast",
    restaurantName: "The Royal Feast",
    zone: "Family Alcove",
    seats: 6,
  },
  {
    id: "t12",
    tableNumber: "Table 12",
    code: "table12",
    restaurantSlug: "juniper-and-rye",
    restaurantName: "Juniper & Rye",
    zone: "Bookshelf Corner",
    seats: 2,
  },
  {
    id: "ak1",
    tableNumber: "Table 1",
    code: "ak-coffee-t1",
    restaurantSlug: "ak-s-coffee-0298f6d52949",
    restaurantName: "AK's Coffee",
    zone: "Espresso Bar",
    seats: 2,
  },
];

export function InteractiveFloorplan() {
  const [selectedTable, setSelectedTable] = useState<FloorTable | null>(null);
  const [cart, setCart] = useState<{ [itemId: string]: number }>({});
  const [flyAnimation, setFlyAnimation] = useState<string | null>(null);
  const [simulatedSent, setSimulatedSent] = useState(false);

  const activeVenue = selectedTable
    ? demoRestaurants[selectedTable.restaurantSlug] || demoRestaurants["juniper-and-rye"]
    : null;

  const handleAddToCart = (itemId: string, name: string) => {
    setCart((prev) => ({
      ...prev,
      [itemId]: (prev[itemId] || 0) + 1,
    }));
    setFlyAnimation(name);
    setTimeout(() => setFlyAnimation(null), 900);
  };

  const handleRemoveFromCart = (itemId: string) => {
    setCart((prev) => {
      const updated = { ...prev };
      if (updated[itemId] > 1) {
        updated[itemId] -= 1;
      } else {
        delete updated[itemId];
      }
      return updated;
    });
  };

  const totalItemCount = Object.values(cart).reduce((a, b) => a + b, 0);

  const calculateSubtotal = () => {
    if (!activeVenue) return 0;
    let sum = 0;
    for (const cat of activeVenue.categories) {
      for (const item of cat.items) {
        if (cart[item.id]) {
          sum += item.price * cart[item.id];
        }
      }
    }
    return sum;
  };

  return (
    <section className="tt-section-wrap" id="floorplan">
      <div className="tt-editorial-header">
        <span className="tt-editorial-eyebrow">Interactive Dining Room</span>
        <h2>Click Any Table to Test Guest Ordering</h2>
        <p>
          Hover over tables to see seating zones. Tap a table to open a working digital menu drawer,
          simulate adding artisan items to cart, or jump straight to the live guest phone view.
        </p>
      </div>

      {/* Floorplan Container */}
      <div className="tt-floorplan-container">
        {/* Café Zone Legend */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "24px",
            paddingBottom: "16px",
            borderBottom: "1px solid var(--tt-border)",
            flexWrap: "wrap",
            gap: "12px",
          }}
        >
          <div style={{ display: "flex", gap: "16px", alignItems: "center", fontSize: "12px", color: "var(--tt-ink-muted)" }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
              <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: "var(--tt-burgundy)" }} />
              Dine-in Table
            </span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
              <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: "var(--tt-brass)" }} />
              Espresso &amp; Bar Seating
            </span>
          </div>

          <span style={{ fontSize: "12px", fontStyle: "italic", color: "var(--tt-brass)", fontFamily: "var(--tt-font-serif)" }}>
            Click table to open guest menu drawer ↘
          </span>
        </div>

        {/* Blueprint Grid */}
        <div className="tt-floorplan-blueprint">
          {FLOOR_TABLES.map((table) => {
            const isSelected = selectedTable?.id === table.id;
            return (
              <div
                key={table.id}
                className={`tt-table-tile ${isSelected ? "active" : ""}`}
                onClick={() => {
                  setSelectedTable(table);
                  setCart({});
                  setSimulatedSent(false);
                }}
                data-cursor="Menu"
              >
                <span className="tt-table-badge">{table.zone}</span>
                <div className="tt-table-number">{table.tableNumber}</div>
                <div className="tt-table-zone">
                  {table.restaurantName} · {table.seats} Seats
                </div>
                <div className="tt-table-cta">
                  <span>Open Menu</span>
                  <Icon name="arrow-right" size={11} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Working Menu Drawer / Modal */}
      {selectedTable && activeVenue && (
        <div className="tt-menu-drawer-overlay" onClick={() => setSelectedTable(null)}>
          <div
            className="tt-menu-drawer"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={`${selectedTable.tableNumber} Guest Menu`}
          >
            {/* Drawer Header */}
            <div className="tt-drawer-header">
              <div className="tt-drawer-title">
                <h3>{activeVenue.restaurant.name}</h3>
                <p>
                  {selectedTable.tableNumber} · {selectedTable.zone} ({selectedTable.seats} Seats)
                </p>
              </div>
              <button
                type="button"
                className="tt-drawer-close"
                onClick={() => setSelectedTable(null)}
                aria-label="Close menu drawer"
              >
                <Icon name="x" size={18} />
              </button>
            </div>

            {/* Direct Link Banner */}
            <div
              style={{
                padding: "10px 20px",
                background: "var(--tt-burgundy-soft)",
                borderBottom: "1px solid var(--tt-border-light)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span style={{ fontSize: "11px", color: "var(--tt-burgundy)", fontWeight: 600 }}>
                Direct Table Code: <code>{selectedTable.code}</code>
              </span>
              <Link
                href={`/t/${selectedTable.code}`}
                target="_blank"
                rel="noreferrer"
                style={{
                  fontSize: "11px",
                  fontWeight: 700,
                  color: "var(--tt-burgundy)",
                  textDecoration: "underline",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                <span>Open Full Mobile View</span>
                <Icon name="external-link" size={11} />
              </Link>
            </div>

            {/* Fly-to-Cart Notice */}
            {flyAnimation && (
              <div
                style={{
                  position: "sticky",
                  top: 0,
                  zIndex: 10,
                  background: "var(--tt-burgundy)",
                  color: "var(--tt-cream)",
                  padding: "8px 16px",
                  fontSize: "12px",
                  fontWeight: 600,
                  textAlign: "center",
                  animation: "fadeIn 0.2s ease",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                }}
              >
                <Icon name="check" size={13} />
                <span>Added {flyAnimation} to cart</span>
              </div>
            )}

            {/* Drawer Menu Items */}
            <div className="tt-drawer-body">
              {activeVenue.categories.map((cat) => (
                <div key={cat.id}>
                  <div
                    style={{
                      fontFamily: "var(--tt-font-serif)",
                      fontSize: "16px",
                      fontWeight: 700,
                      color: "var(--tt-brass)",
                      margin: "8px 0 10px",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <span>{cat.name}</span>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    {cat.items.map((item) => {
                      const qty = cart[item.id] || 0;
                      return (
                        <div className="tt-drawer-item" key={item.id}>
                          <div className="tt-drawer-item-info">
                            <h4>{item.name}</h4>
                            <p>{item.description}</p>
                            <span className="tt-drawer-item-price">₹{item.price}</span>
                          </div>

                          {qty === 0 ? (
                            <button
                              type="button"
                              className="tt-drawer-add-btn"
                              onClick={() => handleAddToCart(item.id, item.name)}
                            >
                              + Add
                            </button>
                          ) : (
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "8px",
                                background: "var(--tt-burgundy-soft)",
                                borderRadius: "8px",
                                padding: "4px 8px",
                              }}
                            >
                              <button
                                type="button"
                                onClick={() => handleRemoveFromCart(item.id)}
                                style={{
                                  background: "none",
                                  border: "none",
                                  color: "var(--tt-burgundy)",
                                  fontWeight: 800,
                                  cursor: "pointer",
                                  fontSize: "14px",
                                }}
                              >
                                -
                              </button>
                              <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--tt-burgundy)" }}>
                                {qty}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleAddToCart(item.id, item.name)}
                                style={{
                                  background: "none",
                                  border: "none",
                                  color: "var(--tt-burgundy)",
                                  fontWeight: 800,
                                  cursor: "pointer",
                                  fontSize: "14px",
                                }}
                              >
                                +
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Drawer Cart & Send Simulation */}
            <div className="tt-drawer-footer">
              <div className="tt-cart-summary-line">
                <span>Total ({totalItemCount} {totalItemCount === 1 ? "item" : "items"}):</span>
                <span>₹{calculateSubtotal()}</span>
              </div>

              {simulatedSent ? (
                <div
                  style={{
                    background: "rgba(16, 185, 129, 0.15)",
                    border: "1px solid #10b981",
                    color: "#065F46",
                    borderRadius: "10px",
                    padding: "10px 14px",
                    textAlign: "center",
                    fontSize: "13px",
                    fontWeight: 600,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                  }}
                >
                  <Icon name="check" size={13} />
                  <span>Ticket dispatched to kitchen KDS for {selectedTable.tableNumber}</span>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={totalItemCount === 0}
                  onClick={() => setSimulatedSent(true)}
                  style={{
                    width: "100%",
                    background: totalItemCount > 0 ? "var(--tt-burgundy)" : "var(--tt-border)",
                    color: "var(--tt-cream)",
                    border: "none",
                    borderRadius: "999px",
                    padding: "12px",
                    fontSize: "14px",
                    fontWeight: 700,
                    cursor: totalItemCount > 0 ? "pointer" : "not-allowed",
                    transition: "background 0.2s ease",
                  }}
                >
                  {totalItemCount > 0
                    ? `Simulate Order for ${selectedTable.tableNumber} (₹${calculateSubtotal()})`
                    : "Add items to place order"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Preserve All Raipur Outlets Directory Links */}
      <div style={{ marginTop: "48px" }}>
        <h3
          style={{
            fontFamily: "var(--tt-font-serif)",
            fontSize: "22px",
            color: "var(--tt-burgundy)",
            textAlign: "center",
            margin: "0 0 20px",
          }}
        >
          Or Browse Live Demo Cafés Directly:
        </h3>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "20px" }}>
          {Object.values(demoRestaurants).map(({ restaurant }) => {
            const tableList = demoTables.filter((t) => t.restaurantSlug === restaurant.slug);
            return (
              <div
                key={restaurant.id}
                style={{
                  background: "var(--tt-cream-card)",
                  border: "1px solid var(--tt-border)",
                  borderRadius: "18px",
                  padding: "20px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <div
                    style={{
                      width: "38px",
                      height: "38px",
                      borderRadius: "10px",
                      background: "var(--tt-burgundy)",
                      color: "var(--tt-cream)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 800,
                      fontSize: "14px",
                    }}
                  >
                    {restaurant.initials}
                  </div>
                  <div>
                    <h4 style={{ margin: 0, fontSize: "16px", color: "var(--tt-ink)", fontWeight: 700 }}>
                      {restaurant.name}
                    </h4>
                    <span style={{ fontSize: "12px", color: "var(--tt-ink-muted)" }}>
                      {restaurant.address}
                    </span>
                  </div>
                </div>

                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "4px" }}>
                  {tableList.slice(0, 3).map((tbl) => (
                    <Link
                      key={tbl.code}
                      href={`/t/${tbl.code}`}
                      style={{
                        background: "var(--tt-cream-warm)",
                        border: "1px solid var(--tt-border)",
                        color: "var(--tt-burgundy)",
                        fontSize: "11px",
                        fontWeight: 700,
                        padding: "5px 10px",
                        borderRadius: "6px",
                        textDecoration: "none",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                      }}
                    >
                      <span>{tbl.tableLabel}</span>
                      <Icon name="external-link" size={10} />
                    </Link>
                  ))}
                  <Link
                    href={`/${restaurant.slug}`}
                    style={{
                      fontSize: "11px",
                      fontWeight: 600,
                      color: "var(--tt-ink-muted)",
                      padding: "5px 10px",
                      textDecoration: "none",
                    }}
                  >
                    Menu View ↗
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
