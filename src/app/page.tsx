import Link from "next/link";
import { Icon } from "@/components/icons";
import { demoRestaurants, demoTables } from "@/lib/restaurant-data";

export default function Home() {
  const restaurantsList = Object.values(demoRestaurants);

  return (
    <div className="tabletap-landing">
      {/* Top Navbar */}
      <header className="saas-nav">
        <div className="saas-nav-container">
          <Link className="saas-brand" href="/">
            <span className="saas-logo-icon"><Icon name="monogram-t" size={24} /></span>
            <div className="saas-brand-text">
              <strong>TableTap</strong>
              <span>Raipur SaaS</span>
            </div>
          </Link>

          <nav className="saas-nav-links">
            <a href="#raipur-demo">Demo Tables</a>
            <a href="#features">Features</a>
            <a href="#how-it-works">How It Works</a>
            <Link href="/kitchen">Kitchen KDS</Link>
          </nav>

          <div className="saas-nav-actions">
            <Link className="saas-btn-text" href="/admin/login">
              Owner Login
            </Link>
            <Link className="saas-btn-primary" href="/admin/signup">
              Get Started Free
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="saas-hero">
        <div className="saas-hero-container">
          <div className="raipur-geo-pill">
            <span className="geo-dot" />
            <span>Built for Restaurants &amp; Cafes in Raipur, Chhattisgarh</span>
          </div>

          <h1 className="saas-hero-title">
            Smart Table QR Menus, <br />
            <span className="gradient-text">1-Click Google Reviews</span> &amp; Loyalty
          </h1>

          <p className="saas-hero-subtitle">
            TableTap gives your restaurant a clean, distraction-free digital ordering tool.
            Guests scan your table QR, order in seconds, collect loyalty stamps, and leave 5-star Google reviews.
          </p>

          <div className="saas-hero-cta-group">
            <a className="saas-btn-hero" href="#raipur-demo">
              Try Live Table QR Demo <span>↘</span>
            </a>
            <Link className="saas-btn-secondary" href="/admin">
              Open Admin Dashboard
            </Link>
          </div>

          <div className="saas-stats-strip">
            <div className="stat-card">
              <strong>&lt; 2 sec</strong>
              <span>Menu Load Speed</span>
            </div>
            <div className="stat-card">
              <strong>Zero</strong>
              <span>App Downloads Needed</span>
            </div>
            <div className="stat-card">
              <strong>+38%</strong>
              <span>More Google Reviews</span>
            </div>
            <div className="stat-card">
              <strong>100%</strong>
              <span>Multi-Tenant Isolation</span>
            </div>
          </div>
        </div>
      </section>

      {/* Raipur Local Hubs Strip */}
      <section className="raipur-hubs-bar">
        <div className="hubs-inner">
          <span className="hubs-label">Trusted dining zones in Raipur:</span>
          <div className="hubs-tags">
            <span>Civil Lines</span>
            <span>Shankar Nagar</span>
            <span>Telibandha (Marine Drive)</span>
            <span>VIP Road</span>
            <span>Devendra Nagar</span>
            <span>Pandri</span>
            <span>Samta Colony</span>
          </div>
        </div>
      </section>

      {/* Interactive Raipur Demo Outlets */}
      <section className="saas-demo-section" id="raipur-demo">
        <div className="section-header">
          <span className="saas-eyebrow">Interactive Live Demos</span>
          <h2>Experience TableTap at Raipur&apos;s Favourite Outlets</h2>
          <p>
            Tap any table below to test what your guests see on their mobile phones when scanning a table QR:
          </p>
        </div>

        <div className="demo-restaurants-grid">
          {restaurantsList.map(({ restaurant, categories }) => {
            const tableOptions = demoTables.filter(
              (t) => t.restaurantSlug === restaurant.slug,
            );

            return (
              <div
                className="demo-venue-card"
                key={restaurant.id}
                style={{ "--venue-theme": restaurant.primaryColor } as React.CSSProperties}
              >
                <div className="venue-card-header">
                  <div className="venue-avatar">
                    {restaurant.initials}
                  </div>
                  <div className="venue-titles">
                    <h3>{restaurant.name}</h3>
                    <p className="venue-location" style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <Icon name="pin" size={13} />
                      <span>{restaurant.address}</span>
                    </p>
                  </div>
                  <span className="venue-badge">{restaurant.tagline}</span>
                </div>

                <p className="venue-desc">{restaurant.description}</p>

                <div className="venue-menu-stats">
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                    <Icon name="plates" size={14} />
                    <span>{categories.length} Categories</span>
                  </span>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                    <Icon name="bowls" size={14} />
                    <span>{categories.reduce((acc, c) => acc + c.items.length, 0)} Dishes</span>
                  </span>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                    <Icon name="star" size={14} />
                    <span>Google Review Enabled</span>
                  </span>
                </div>

                <div className="venue-tables-tray">
                  <span className="tray-label">Scan / Tap Table:</span>
                  <div className="tray-buttons">
                    {tableOptions.slice(0, 3).map((table) => (
                      <Link
                        className="venue-table-link"
                        href={`/t/${table.code}`}
                        key={table.code}
                      >
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                          <span>{table.tableLabel}</span>
                          <Icon name="external-link" size={12} />
                        </span>
                      </Link>
                    ))}
                    <Link
                      className="venue-table-link secondary"
                      href={`/${restaurant.slug}`}
                    >
                      Dine-in Menu
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Feature Highlights */}
      <section className="saas-features-section" id="features">
        <div className="section-header">
          <span className="saas-eyebrow">Built for Busy Restaurateurs</span>
          <h2>Everything You Need, Nothing You Don&apos;t</h2>
          <p>Designed to be simple, practical, and non-technical for restaurant owners in Raipur.</p>
        </div>

        <div className="features-grid">
          <div className="feature-box">
            <div className="feature-icon"><Icon name="device-mobile" size={24} /></div>
            <h3>Laser-Focused Digital Menu</h3>
            <p>
              Not a bloated website. Guests get straight to ordering with attractive cards,
              Veg/Non-Veg indicators, spice levels, and search.
            </p>
          </div>

          <div className="feature-box">
            <div className="feature-icon"><Icon name="star" size={24} /></div>
            <h3>Google Reviews Booster</h3>
            <p>
              Direct 1-tap Google Review button for your happy guests.
              Unhappy diners can send private feedback directly to the manager.
            </p>
          </div>

          <div className="feature-box">
            <div className="feature-icon"><Icon name="gift" size={24} /></div>
            <h3>Phone-Number Loyalty</h3>
            <p>
              Frictionless stamp cards. Guests enter their mobile number to earn rewards on repeated visits
              without downloading any apps.
            </p>
          </div>

          <div className="feature-box">
            <div className="feature-icon"><Icon name="clock" size={24} /></div>
            <h3>Instant Kitchen Display (KDS)</h3>
            <p>
              Your kitchen team sees live table orders, item instructions (e.g. less spicy, jain),
              and updates status from Pending → Preparing → Ready.
            </p>
          </div>

          <div className="feature-box">
            <div className="feature-icon"><Icon name="print" size={24} /></div>
            <h3>Instant Table QR Generator</h3>
            <p>
              Generate unique high-resolution QR codes for all your tables in seconds.
              Download in PNG or SVG for easy printing.
            </p>
          </div>

          <div className="feature-box">
            <div className="feature-icon"><Icon name="lock" size={24} /></div>
            <h3>Strict Multi-Restaurant Isolation</h3>
            <p>
              Manage one cafe or multiple branches in Raipur. Each venue enjoys full data isolation,
              custom branding colors, logo, and staff permissions.
            </p>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="saas-steps-section" id="how-it-works">
        <div className="section-header">
          <span className="saas-eyebrow">3-Minute Setup</span>
          <h2>How TableTap Works</h2>
        </div>

        <div className="steps-container">
          <div className="step-card">
            <span className="step-number">01</span>
            <h3>Add Your Profile &amp; Menu</h3>
            <p>Enter your restaurant name, Raipur area, brand color, and dishes with prices and veg/non-veg tags.</p>
          </div>

          <div className="step-card">
            <span className="step-number">02</span>
            <h3>Print Table QR Codes</h3>
            <p>Download pre-formatted QR codes for Table 1 to 30. Place them on dining tables or stands.</p>
          </div>

          <div className="step-card">
            <span className="step-number">03</span>
            <h3>Guests Scan &amp; Enjoy</h3>
            <p>Guests view your live menu, place orders directly to the kitchen, and leave glowing Google reviews.</p>
          </div>
        </div>
      </section>

      {/* CTA Strip */}
      <section className="saas-cta-banner">
        <div className="cta-banner-content">
          <h2>Ready to upgrade your restaurant tables in Raipur?</h2>
          <p>Join cafes, bistros, and fine-dine spots saving server hours and getting more 5-star Google ratings.</p>
          <div className="cta-banner-buttons">
            <Link className="saas-btn-hero" href="/admin/signup">
              Create Restaurant Workspace
            </Link>
            <Link className="saas-btn-secondary" href="/admin/login">
              Sign In to Admin
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="saas-footer">
        <div className="saas-footer-content">
          <div className="footer-brand-side">
            <div className="saas-brand">
              <span className="saas-logo-icon"><Icon name="monogram-t" size={24} /></span>
              <strong>TableTap</strong>
            </div>
            <p>Modern table ordering and hospitality SaaS for Raipur, Chhattisgarh.</p>
          </div>

          <div className="footer-links-group">
            <h4>Quick Links</h4>
            <Link href="/admin">Restaurant Admin</Link>
            <Link href="/kitchen">Kitchen Display</Link>
            <Link href="/privacy">Privacy Policy</Link>
            <Link href="/terms">Terms of Service</Link>
          </div>
        </div>
        <div className="footer-bottom-bar">
          <p>© {new Date().getFullYear()} TableTap Inc. All rights reserved. Crafted for Raipur hospitality.</p>
        </div>
      </footer>
    </div>
  );
}
