"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { FeedbackSection, GuestServices } from "@/components/guest-services";
import LoyaltyProgram from "@/components/loyalty-program";
import type { GuestPageData, MenuCategory } from "@/lib/restaurant-data";

function RestaurantMark({
  logoUrl,
  initials,
  size,
}: {
  logoUrl: string;
  initials: string;
  size: number;
}) {
  if (logoUrl) {
    return (
      <Image
        alt=""
        className="restaurant-logo-image"
        height={size}
        src={logoUrl}
        unoptimized
        width={size}
      />
    );
  }

  return <span className="brand-mark">{initials}</span>;
}

function ArrowIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" fill="none">
      <path d="M4.167 10h11.666M10 4.167 15.833 10 10 15.833" />
    </svg>
  );
}

function PinIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" fill="none">
      <path d="M16.25 8.333c0 4.583-6.25 9.167-6.25 9.167s-6.25-4.584-6.25-9.167a6.25 6.25 0 1 1 12.5 0Z" />
      <circle cx="10" cy="8.333" r="2.083" />
    </svg>
  );
}

function renderCategory(category: MenuCategory) {
  return (
    <section className="menu-section" id={`category-${category.id}`} key={category.id}>
      <div className="section-heading">
        <span className="eyebrow">Made for the table</span>
        <h2>{category.name}</h2>
      </div>
      <div className="menu-grid">
        {category.items.map((item, index) => (
          <article className="menu-card" key={item.id}>
            <div
              className={`menu-card-image menu-image-${index % 3}`}
              role="img"
              aria-label={item.name}
              style={
                item.imageUrl
                  ? { backgroundImage: `url("${item.imageUrl}")` }
                  : undefined
              }
            >
              {item.dietaryTags[0] && (
                <span className="dietary-pill">{item.dietaryTags[0]}</span>
              )}
            </div>
            <div className="menu-card-copy">
              <div className="menu-item-title">
                <h3>{item.name}</h3>
                <span>${item.price.toFixed(0)}</span>
              </div>
              <p>{item.description}</p>
              {!item.isAvailable && <span className="sold-out">Sold out today</span>}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export default function GuestExperience({
  restaurant,
  categories,
  tableId = null,
  tableLabel = null,
}: GuestPageData) {
  const [activeCategory, setActiveCategory] = useState(categories[0]?.id ?? "");
  const trackedView = useRef("");

  useEffect(() => {
    const viewKey = `${restaurant.id}:${tableId ?? ""}:${tableLabel ?? ""}`;
    if (trackedView.current === viewKey) return;
    trackedView.current = viewKey;
    void fetch("/api/scans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ restaurantId: restaurant.id, tableId, tableLabel }),
      keepalive: true,
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Page-view tracking failed (${response.status}).`);
        }
      })
      .catch((error: unknown) => {
        console.warn("Guest page view tracking is unavailable:", error);
      });
  }, [restaurant.id, tableId, tableLabel]);

  function selectCategory(categoryId: string) {
    setActiveCategory(categoryId);
    document
      .getElementById(`category-${categoryId}`)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <main style={{ "--restaurant-primary": restaurant.primaryColor } as CSSProperties}>
      <div className="announcement">
        <span className="announcement-dot" />
        {restaurant.hours}
        <span className="announcement-divider">·</span>
        {tableLabel ? `Welcome · ${tableLabel}` : "Walk-ins always welcome"}
      </div>

      <header className="site-header">
        <a className="brand-lockup" href={`/${restaurant.slug}`} aria-label={restaurant.name}>
          <RestaurantMark
            initials={restaurant.initials}
            logoUrl={restaurant.logoUrl}
            size={37}
          />
          <span className="brand-name">{restaurant.name}</span>
        </a>
        <nav className="desktop-nav" aria-label="Main navigation">
          <a className="nav-active" href="#menu">The menu</a>
          <a href="#visit">Find us</a>
          <a href="#story">Our story</a>
        </nav>
        <a className="header-cta" href={`tel:${restaurant.phone.replace(/[^+\d]/g, "")}`}>
          Say hello <ArrowIcon />
        </a>
      </header>

      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow hero-eyebrow">Your neighborhood table</span>
          <h1>Good things<br />grow <em>together.</em></h1>
          <p>{restaurant.description}</p>
          <div className="hero-actions">
            <a className="button button-dark" href="#menu">Explore the menu <ArrowIcon /></a>
            <a className="text-link" href="#visit">Come on in <span>↘</span></a>
          </div>
          <div className="hero-note">
            <span className="note-stars" aria-hidden="true">✳</span>
            <span>Locally sourced. Always seasonal.</span>
          </div>
        </div>
        <div
          className="hero-image"
          role="img"
          aria-label={`Dining room at ${restaurant.name}`}
          style={{ backgroundImage: `url("${restaurant.heroImage}")` }}
        >
          <div className="image-caption">
            <span className="caption-spark">✳</span>
            <span>Gather around</span>
            <span className="caption-line" />
            <span>Oakland, California</span>
          </div>
        </div>
        <span className="hero-side-note">GOOD FOOD, GOOD COMPANY — ALWAYS</span>
      </section>

      <section className="welcome-strip" id="story">
        <div className="welcome-icon">✳</div>
        <p>
          A little seasonal, a little unexpected.
          <span> Always made with love, right here in Oakland.</span>
        </p>
        <a href="#visit" aria-label="Find Juniper & Rye">
          <ArrowIcon />
        </a>
      </section>

      <GuestServices
        wifiPassword={restaurant.wifiPassword}
        wifiSsid={restaurant.wifiSsid}
      />

      <LoyaltyProgram
        restaurantId={restaurant.id}
        restaurantName={restaurant.name}
        tableId={tableId}
      />

      <section className="menu-area" id="menu">
        <div className="menu-intro">
          <div>
            <span className="eyebrow">From our kitchen, with love</span>
            <h2>A menu that follows<br />the <em>seasons.</em></h2>
          </div>
          <p>
            Thoughtful ingredients, a little fire, and plenty to pass around.
            Our menu changes with what&apos;s growing.
          </p>
        </div>

        <div className="category-tabs" aria-label="Menu categories">
          {categories.map((category, index) => (
            <button
              className={activeCategory === category.id ? "category-tab active" : "category-tab"}
              key={category.id}
              onClick={() => selectCategory(category.id)}
              type="button"
            >
              <span>0{index + 1}</span>{category.name}
            </button>
          ))}
        </div>

        <div className="menu-sections">
          {categories.map(renderCategory)}
        </div>
        {categories.length === 0 && (
          <p className="empty-menu">Our menu is being refreshed. Please check back soon.</p>
        )}

        <div className="menu-footnote">
          <span>✳</span>
          Please let your server know about any allergies or dietary needs.
        </div>
      </section>

      <FeedbackSection
        googleReviewUrl={restaurant.googleReviewUrl}
        restaurantId={restaurant.id}
        restaurantName={restaurant.name}
        tableId={tableId}
        tableLabel={tableLabel}
      />
      {tableId && (
        <nav aria-label="Guest shortcuts" className="table-quick-nav">
          <a href="#feedback">Share feedback</a>
          <a href="#loyalty">Join loyalty</a>
        </nav>
      )}

      <section className="visit-section" id="visit">
        <div className="visit-copy">
          <span className="eyebrow">Pull up a chair</span>
          <h2>There&apos;s always<br />room <em>for you.</em></h2>
          <a
            className="address-link"
            href={`https://maps.google.com/?q=${encodeURIComponent(`${restaurant.address} ${restaurant.city}`)}`}
          >
            <PinIcon />
            <span>{restaurant.address}<br />{restaurant.city}</span>
          </a>
          <a className="button button-light" href={`tel:${restaurant.phone.replace(/[^+\d]/g, "")}`}>
            {restaurant.phone} <ArrowIcon />
          </a>
        </div>
        <div className="visit-details">
          <span className="eyebrow">When to find us</span>
          <p>{restaurant.hours}</p>
          <div className="visit-note">
            <span>✳</span>
            <p>Bringing a big group? Give us a call and we&apos;ll make it special.</p>
          </div>
        </div>
      </section>

      <footer className="site-footer">
        <a className="brand-lockup" href={`/${restaurant.slug}`}>
          <RestaurantMark
            initials={restaurant.initials}
            logoUrl={restaurant.logoUrl}
            size={32}
          />
          <span className="brand-name">{restaurant.name}</span>
        </a>
        <span>Made slowly, served generously. © {new Date().getFullYear()}</span>
        <div className="site-footer-links">
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
          <a href="#menu">Back to the top ↑</a>
        </div>
      </footer>
      <div className="powered-by">
        <span>Powered by</span>
        <strong>TableTap</strong>
      </div>
    </main>
  );
}
