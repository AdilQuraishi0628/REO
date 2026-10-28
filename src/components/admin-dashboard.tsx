"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import type { AdminRestaurant } from "@/lib/admin-auth";
import {
  AnalyticsSection,
  FeedbackAdminSection,
  LoyaltyAdminSection,
} from "@/components/admin-insights";

type AdminDashboardData = {
  restaurant: {
    id: string;
    slug: string;
    name: string;
    description: string;
    hero_image: string;
    logo_url: string | null;
    wifi_ssid: string;
    wifi_password: string;
    google_review_url: string | null;
    primary_color: string;
  };
  categories: { id: string; name: string; sort_order: number }[];
  items: {
    id: string;
    category_id: string;
    name: string;
    description: string;
    price: number;
    image_url: string | null;
    is_available: boolean;
    sort_order: number;
  }[];
  feedback: {
    id: string;
    rating: number;
    comment: string | null;
    guest_name: string | null;
    table_label: string | null;
    review_prompted: boolean;
    resolved_at: string | null;
    created_at: string;
  }[];
  loyaltyMemberCount: number;
  links: {
    id: string;
    kind: "qr" | "nfc";
    token: string;
    table_label: string | null;
    created_at: string;
  }[];
  totalScans: number;
};

type AdminDashboardProps = {
  restaurants: AdminRestaurant[];
  userEmail: string;
};

type Section = "overview" | "analytics" | "feedback" | "loyalty" | "menu" | "tables" | "settings" | "links" | "account";

const navItems: { id: Section; label: string; icon: string }[] = [
  { id: "overview", label: "Overview", icon: "◫" },
  { id: "analytics", label: "Analytics", icon: "⌁" },
  { id: "feedback", label: "Feedback", icon: "✳" },
  { id: "loyalty", label: "Loyalty members", icon: "☆" },
  { id: "menu", label: "Menu", icon: "≡" },
  { id: "tables", label: "Tables", icon: "▦" },
  { id: "settings", label: "Restaurant settings", icon: "⚙" },
  { id: "links", label: "QR & NFC links", icon: "⌗" },
  { id: "account", label: "Account", icon: "○" },
];

async function parseResponse(response: Response) {
  const result: unknown = await response.json();
  if (response.ok) return result;
  const error =
    typeof result === "object" &&
    result !== null &&
    "error" in result &&
    typeof result.error === "string"
      ? result.error
      : "Something went wrong. Please try again.";
  throw new Error(error);
}

export default function AdminDashboard({
  restaurants,
  userEmail,
}: AdminDashboardProps) {
  const [section, setSection] = useState<Section>("overview");
  const [restaurantId, setRestaurantId] = useState(restaurants[0].id);
  const [data, setData] = useState<AdminDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [categoryName, setCategoryName] = useState("");
  const [editingCategoryId, setEditingCategoryId] = useState("");
  const [itemId, setItemId] = useState("");
  const [itemForm, setItemForm] = useState({
    categoryId: "",
    name: "",
    description: "",
    price: "",
    imageUrl: "",
    isAvailable: true,
  });
  const [linkKind, setLinkKind] = useState<"qr" | "nfc">("qr");
  const [tableLabel, setTableLabel] = useState("");
  const [createdUrl, setCreatedUrl] = useState("");

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/${restaurantId}`, {
        cache: "no-store",
      });
      const nextData = (await parseResponse(response)) as AdminDashboardData;
      setData(nextData);
      setItemForm((current) => {
        const currentCategoryExists = nextData.categories.some(
          (category) => category.id === current.categoryId,
        );
        return {
          ...current,
          categoryId: currentCategoryExists
            ? current.categoryId
            : nextData.categories[0]?.id ?? "",
        };
      });
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load dashboard.");
    } finally {
      setIsLoading(false);
    }
  }, [restaurantId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  async function performRequest(url: string, body: unknown, method = "POST") {
    setIsBusy(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = await parseResponse(response);
      setMessage("Changes saved.");
      await loadData();
      return result;
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Could not save changes.");
      return null;
    } finally {
      setIsBusy(false);
    }
  }

  async function saveCategory(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = await performRequest(`/api/admin/${restaurantId}/menu`, {
      operation: editingCategoryId ? "update-category" : "create-category",
      id: editingCategoryId || undefined,
      name: categoryName,
    });
    if (result) {
      setCategoryName("");
      setEditingCategoryId("");
    }
  }

  async function deleteCategory(id: string) {
    if (!window.confirm("Delete this category and all its menu items?")) return;
    await performRequest(`/api/admin/${restaurantId}/menu`, {
      operation: "delete-category",
      id,
    });
    if (editingCategoryId === id) {
      setEditingCategoryId("");
      setCategoryName("");
    }
  }

  function startEditItem(item: AdminDashboardData["items"][number]) {
    setItemId(item.id);
    setItemForm({
      categoryId: item.category_id,
      name: item.name,
      description: item.description ?? "",
      price: String(item.price),
      imageUrl: item.image_url ?? "",
      isAvailable: item.is_available,
    });
  }

  function resetItemForm() {
    setItemId("");
    setItemForm({
      categoryId: data?.categories[0]?.id ?? "",
      name: "",
      description: "",
      price: "",
      imageUrl: "",
      isAvailable: true,
    });
  }

  async function saveItem(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = await performRequest(`/api/admin/${restaurantId}/menu`, {
      operation: itemId ? "update-item" : "create-item",
      id: itemId || undefined,
      ...itemForm,
      price: Number(itemForm.price),
    });
    if (result) resetItemForm();
  }

  async function saveSettings(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!data) return;
    const form = new FormData(event.currentTarget);
    await performRequest(`/api/admin/${restaurantId}`, {
      name: form.get("name"),
      logoUrl: form.get("logoUrl"),
      wifiSsid: form.get("wifiSsid"),
      wifiPassword: form.get("wifiPassword"),
      googleReviewUrl: form.get("googleReviewUrl"),
      primaryColor: form.get("primaryColor"),
    }, "PATCH");
  }

  async function createGuestLink(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = await performRequest(`/api/admin/${restaurantId}/links`, {
      kind: linkKind,
      tableLabel,
    }) as { url?: string } | null;
    if (result?.url) {
      setCreatedUrl(result.url);
      setTableLabel("");
      setMessage(linkKind === "qr" ? "QR code link created." : "NFC link created.");
    }
  }

  async function deleteGuestLink(id: string) {
    if (!window.confirm("Remove this QR/NFC link? Printed copies will stop working.")) return;
    setIsBusy(true);
    setError("");
    try {
      const response = await fetch(
        `/api/admin/${restaurantId}/links?linkId=${encodeURIComponent(id)}`,
        { method: "DELETE" },
      );
      await parseResponse(response);
      setMessage("Link removed.");
      await loadData();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Could not remove this link.");
    } finally {
      setIsBusy(false);
    }
  }

  async function signOut() {
    setIsSigningOut(true);
    setError("");
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      await parseResponse(response);
      const supabase = createSupabaseBrowserClient();
      await supabase.auth.signOut();
      window.location.assign("/admin/login");
    } catch (signOutError) {
      console.error("Admin sign-out failed:", signOutError);
      setError("Could not sign out. Please try again.");
    } finally {
      setIsSigningOut(false);
    }
  }

  const activeRestaurant = restaurants.find((restaurant) => restaurant.id === restaurantId);

  return (
    <main className="admin-shell">
      <aside className="admin-sidebar">
        <Link className="brand-lockup admin-brand" href="/">
          <span className="brand-mark">T</span>
          <span className="brand-name">TableTap</span>
        </Link>
        <span className="admin-sidebar-label">Workspace</span>
        <nav aria-label="Admin navigation" className="admin-nav">
          {navItems.map((item) => (
            <button
              aria-current={section === item.id ? "page" : undefined}
              className={section === item.id ? "admin-nav-item active" : "admin-nav-item"}
              key={item.id}
              onClick={() => {
                setSection(item.id);
                setMessage("");
                setError("");
              }}
              type="button"
            >
              <span>{item.icon}</span>{item.label}
            </button>
          ))}
        </nav>
        <div className="admin-sidebar-bottom">
          <span className="admin-user-email">{userEmail}</span>
          <button className="admin-signout" disabled={isSigningOut} onClick={() => void signOut()} type="button">
            {isSigningOut ? "Signing out..." : "Sign out"}
          </button>
        </div>
      </aside>

      <div className="admin-main">
        <header className="admin-topbar">
          <div>
            <span className="eyebrow">Restaurant workspace</span>
            <h1>{activeRestaurant?.name ?? "Dashboard"}</h1>
          </div>
          {restaurants.length > 1 && (
            <label className="restaurant-switcher">
              <span>Restaurant</span>
              <select
                onChange={(event) => {
                  setRestaurantId(event.target.value);
                  setCreatedUrl("");
                }}
                value={restaurantId}
              >
                {restaurants.map((restaurant) => (
                  <option key={restaurant.id} value={restaurant.id}>{restaurant.name}</option>
                ))}
              </select>
            </label>
          )}
          <button className="admin-mobile-signout" disabled={isSigningOut} onClick={() => void signOut()} type="button">
            {isSigningOut ? "Signing out..." : "Sign out"}
          </button>
        </header>

        <div className="admin-mobile-nav" aria-label="Admin navigation">
          {navItems.map((item) => (
            <button
              aria-current={section === item.id ? "page" : undefined}
              className={section === item.id ? "admin-mobile-tab active" : "admin-mobile-tab"}
              key={item.id}
              onClick={() => setSection(item.id)}
              type="button"
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="admin-content">
          {error && <p aria-live="assertive" className="admin-alert error">{error}</p>}
          {message && !error && <p aria-live="polite" className="admin-alert success">{message}</p>}
          {isLoading && <p className="admin-loading">Loading your workspace...</p>}
          {!isLoading && !data && error && (
            <section className="admin-panel admin-load-error">
              <h2>We couldn&apos;t load this workspace.</h2>
              <p>Check your connection and try again.</p>
              <button className="admin-button primary" onClick={() => void loadData()} type="button">
                Try again
              </button>
            </section>
          )}
          {!isLoading && data && section === "overview" && (
            <OverviewSection data={data} />
          )}
          {section === "analytics" && (
            <AnalyticsSection key={restaurantId} restaurantId={restaurantId} />
          )}
          {section === "feedback" && (
            <FeedbackAdminSection key={restaurantId} restaurantId={restaurantId} />
          )}
          {section === "loyalty" && (
            <LoyaltyAdminSection key={restaurantId} restaurantId={restaurantId} />
          )}
          {!isLoading && data && section === "menu" && (
            <MenuSection
              categories={data.categories}
              editingCategoryId={editingCategoryId}
              isBusy={isBusy}
              itemForm={itemForm}
              itemId={itemId}
              items={data.items}
              categoryName={categoryName}
              onCategoryNameChange={setCategoryName}
              onEditCategory={(category) => {
                setEditingCategoryId(category.id);
                setCategoryName(category.name);
              }}
              onDeleteCategory={(id) => void deleteCategory(id)}
              onCancelCategory={() => {
                setEditingCategoryId("");
                setCategoryName("");
              }}
              onSaveCategory={(event) => void saveCategory(event)}
              onEditItem={startEditItem}
              onDeleteItem={(id) => {
                if (window.confirm("Delete this menu item?")) {
                  void performRequest(`/api/admin/${restaurantId}/menu`, {
                    operation: "delete-item",
                    id,
                  });
                }
              }}
              onItemFormChange={setItemForm}
              onCancelItem={resetItemForm}
              onSaveItem={(event) => void saveItem(event)}
            />
          )}
          {!isLoading && data && section === "settings" && (
            <SettingsSection
              key={data.restaurant.id}
              restaurant={data.restaurant}
              isBusy={isBusy}
              onSave={(event) => void saveSettings(event)}
            />
          )}
          {section === "tables" && (
            <TablesAdminSection key={restaurantId} restaurantId={restaurantId} />
          )}
          {!isLoading && data && section === "links" && (
            <LinksSection
              links={data.links}
              restaurantId={restaurantId}
              isBusy={isBusy}
              createdUrl={createdUrl}
              kind={linkKind}
              tableLabel={tableLabel}
              onKindChange={setLinkKind}
              onTableLabelChange={setTableLabel}
              onCreate={(event) => void createGuestLink(event)}
              onDelete={(id) => void deleteGuestLink(id)}
            />
          )}
          {section === "account" && (
            <AccountSection userEmail={userEmail} />
          )}
        </div>
      </div>
    </main>
  );
}

function AccountSection({ userEmail }: { userEmail: string }) {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  async function deleteAccount(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (confirmation !== "DELETE") {
      setError("Type DELETE exactly to confirm account deletion.");
      return;
    }
    if (!window.confirm("Delete your account and any restaurants where you are the only admin? This cannot be undone.")) {
      return;
    }
    setIsDeleting(true);
    setError("");
    try {
      const response = await fetch("/api/auth/account", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, confirmation }),
      });
      await parseResponse(response);
      window.location.assign("/auth/account-deleted");
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "We couldn't delete your account.");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <>
      <div className="admin-page-heading">
        <div><span className="eyebrow">Your sign-in and profile</span><h2>Account settings</h2></div>
      </div>
      <section className="admin-panel account-panel">
        <span className="eyebrow">Signed in as</span>
        <h3>{userEmail}</h3>
        <p>Your email address is verified. Password changes are available through the password reset flow.</p>
        <Link className="admin-button secondary" href="/admin/forgot-password">Send password reset link</Link>
        <div className="account-legal-links">
          <Link href="/privacy">Privacy policy</Link>
          <Link href="/terms">Terms of service</Link>
        </div>
      </section>
      <section className="admin-panel account-delete-panel">
        <span className="eyebrow">Permanent action</span>
        <h3>Delete account</h3>
        <p>
          This permanently removes your login. Restaurants where you are the
          only administrator and their guest data will also be deleted.
          Restaurants with another administrator will remain available to them.
        </p>
        <form className="account-delete-form" onSubmit={deleteAccount}>
          <label className="admin-field">
            Current password
            <input
              autoComplete="current-password"
              maxLength={256}
              onChange={(event) => setPassword(event.target.value)}
              required
              type="password"
              value={password}
            />
          </label>
          <label className="admin-field">
            Type DELETE to confirm
            <input
              autoComplete="off"
              onChange={(event) => setConfirmation(event.target.value)}
              required
              value={confirmation}
            />
          </label>
          {error && <p aria-live="assertive" className="form-error">{error}</p>}
          <button className="admin-button danger-button" disabled={isDeleting} type="submit">
            {isDeleting ? "Deleting account..." : "Delete account"}
          </button>
        </form>
      </section>
    </>
  );
}

function OverviewSection({ data }: { data: AdminDashboardData }) {
  return (
    <>
      <div className="admin-page-heading">
        <div>
          <span className="eyebrow">At a glance</span>
          <h2>Welcome to your table.</h2>
        </div>
        <Link className="admin-guest-link" href={`/${data.restaurant.slug}`} target="_blank" rel="noreferrer">
          View guest page ↗
        </Link>
      </div>
      <div className="admin-stats-grid">
        <article className="admin-stat-card">
          <span className="eyebrow">Total scans</span>
          <strong>{data.totalScans.toLocaleString()}</strong>
          <span className="stat-caption">Guest page views · all time</span>
        </article>
        <article className="admin-stat-card">
          <span className="eyebrow">Loyalty members</span>
          <strong>{data.loyaltyMemberCount}</strong>
          <span className="stat-caption">Across this restaurant</span>
        </article>
        <article className="admin-stat-card">
          <span className="eyebrow">Recent feedback</span>
          <strong>{data.feedback.length}</strong>
          <span className="stat-caption">Latest guest notes below</span>
        </article>
      </div>
      <section className="admin-panel">
        <div className="admin-panel-heading">
          <div>
            <span className="eyebrow">Guest voices</span>
            <h3>Recent feedback</h3>
          </div>
          <span className="private-badge">Private</span>
        </div>
        {data.feedback.length ? (
          <div className="feedback-list">
            {data.feedback.map((entry) => (
              <article className="admin-feedback-item" key={entry.id}>
                <div className="feedback-rating-line">
                  <span className="admin-rating-stars" aria-label={`${entry.rating} out of 5 stars`}>
                    {"★".repeat(entry.rating)}<span>{"★".repeat(5 - entry.rating)}</span>
                  </span>
                  <time dateTime={entry.created_at}>
                    {new Date(entry.created_at).toLocaleDateString()}
                  </time>
                </div>
                <p>{entry.comment || "No written comment."}</p>
                <div className="overview-feedback-meta">
                  <span className="feedback-author">{entry.guest_name || "Guest"}</span>
                  {entry.table_label && <span className="feedback-author">Table · {entry.table_label}</span>}
                  <span className={entry.resolved_at ? "resolved-badge" : "unresolved-badge"}>
                    {entry.resolved_at ? "Resolved" : "Unresolved"}
                  </span>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="admin-empty-message">Feedback will appear here after your first guest response.</p>
        )}
      </section>
    </>
  );
}

type ItemForm = {
  categoryId: string;
  name: string;
  description: string;
  price: string;
  imageUrl: string;
  isAvailable: boolean;
};

function MenuSection(props: {
  categories: AdminDashboardData["categories"];
  items: AdminDashboardData["items"];
  itemId: string;
  itemForm: ItemForm;
  isBusy: boolean;
  categoryName: string;
  editingCategoryId: string;
  onCategoryNameChange: (value: string) => void;
  onEditCategory: (category: AdminDashboardData["categories"][number]) => void;
  onDeleteCategory: (id: string) => void;
  onCancelCategory: () => void;
  onSaveCategory: (event: React.FormEvent<HTMLFormElement>) => void;
  onEditItem: (item: AdminDashboardData["items"][number]) => void;
  onDeleteItem: (id: string) => void;
  onItemFormChange: (form: ItemForm) => void;
  onCancelItem: () => void;
  onSaveItem: (event: React.FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <>
      <div className="admin-page-heading">
        <div>
          <span className="eyebrow">Keep it current</span>
          <h2>Menu management</h2>
        </div>
      </div>
      <section className="admin-panel category-manager">
        <div className="admin-panel-heading">
          <div><span className="eyebrow">Organize</span><h3>Categories</h3></div>
        </div>
        {props.categories.map((category) => (
          <div className="category-admin-row" key={category.id}>
            <span>{category.name}</span>
            <div>
              <button onClick={() => props.onEditCategory(category)} type="button">Rename</button>
              <button className="danger-action" onClick={() => props.onDeleteCategory(category.id)} type="button">
                Delete
              </button>
            </div>
          </div>
        ))}
        <form className="inline-admin-form" onSubmit={props.onSaveCategory}>
          <input
            aria-label="Category name"
            maxLength={100}
            onChange={(event) => props.onCategoryNameChange(event.target.value)}
            placeholder="New category name"
            required
            value={props.categoryName}
          />
          <button className="admin-button secondary" disabled={props.isBusy} type="submit">
            {props.editingCategoryId ? "Save name" : "Add category"}
          </button>
          {props.editingCategoryId && (
            <button className="admin-text-button" onClick={props.onCancelCategory} type="button">Cancel</button>
          )}
        </form>
      </section>

      <section className="admin-panel item-editor-panel">
        <div className="admin-panel-heading">
          <div>
            <span className="eyebrow">Menu details</span>
            <h3>{props.itemId ? "Edit item" : "Add a menu item"}</h3>
          </div>
        </div>
        <form className="admin-form-grid" onSubmit={props.onSaveItem}>
          <label className="admin-field">
            Category
            <select
              onChange={(event) => props.onItemFormChange({ ...props.itemForm, categoryId: event.target.value })}
              required
              value={props.itemForm.categoryId}
            >
              <option value="">Choose a category</option>
              {props.categories.map((category) => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </select>
          </label>
          <label className="admin-field">
            Item name
            <input
              maxLength={120}
              onChange={(event) => props.onItemFormChange({ ...props.itemForm, name: event.target.value })}
              required
              value={props.itemForm.name}
            />
          </label>
          <label className="admin-field">
            Price
            <input
              min="0"
              onChange={(event) => props.onItemFormChange({ ...props.itemForm, price: event.target.value })}
              required
              step="0.01"
              type="number"
              value={props.itemForm.price}
            />
          </label>
          <label className="admin-field">
            Photo URL
            <input
              onChange={(event) => props.onItemFormChange({ ...props.itemForm, imageUrl: event.target.value })}
              placeholder="https://..."
              type="url"
              value={props.itemForm.imageUrl}
            />
          </label>
          <label className="admin-field admin-field-wide">
            Description
            <textarea
              maxLength={1000}
              onChange={(event) => props.onItemFormChange({ ...props.itemForm, description: event.target.value })}
              rows={3}
              value={props.itemForm.description}
            />
          </label>
          <label className="admin-toggle">
            <input
              checked={props.itemForm.isAvailable}
              onChange={(event) => props.onItemFormChange({ ...props.itemForm, isAvailable: event.target.checked })}
              type="checkbox"
            />
            Available to order
          </label>
          <div className="admin-form-actions">
            {props.itemId && (
              <button className="admin-button secondary" onClick={props.onCancelItem} type="button">
                Cancel edit
              </button>
            )}
            <button className="admin-button primary" disabled={props.isBusy || !props.categories.length} type="submit">
              {props.itemId ? "Save item" : "Add item"}
            </button>
          </div>
        </form>
      </section>

      <section className="admin-panel">
        <div className="admin-panel-heading">
          <div><span className="eyebrow">Published menu</span><h3>{props.items.length} items</h3></div>
        </div>
        {props.items.length ? (
          <div className="admin-menu-list">
            {props.items.map((item) => (
              <article className="admin-menu-row" key={item.id}>
                {item.image_url ? (
                  <Image alt="" className="admin-menu-thumb" height={54} src={item.image_url} unoptimized width={64} />
                ) : (
                  <div aria-hidden="true" className="admin-menu-thumb menu-thumb-empty">✳</div>
                )}
                <div className="admin-menu-item-copy">
                  <strong>{item.name}</strong>
                  <span>{props.categories.find((category) => category.id === item.category_id)?.name ?? "Uncategorized"} · ${Number(item.price).toFixed(2)}</span>
                </div>
                <span className={item.is_available ? "availability-pill available" : "availability-pill unavailable"}>
                  {item.is_available ? "Available" : "Sold out"}
                </span>
                <button className="admin-text-button" onClick={() => props.onEditItem(item)} type="button">Edit</button>
                <button className="admin-text-button danger-action" onClick={() => props.onDeleteItem(item.id)} type="button">Delete</button>
              </article>
            ))}
          </div>
        ) : (
          <p className="admin-empty-message">Add your first menu item above.</p>
        )}
      </section>
    </>
  );
}

function SettingsSection(props: {
  restaurant: AdminDashboardData["restaurant"];
  isBusy: boolean;
  onSave: (event: React.FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <>
      <div className="admin-page-heading">
        <div><span className="eyebrow">Make it yours</span><h2>Restaurant settings</h2></div>
      </div>
      <section className="admin-panel settings-panel">
        <form className="admin-form-grid" onSubmit={props.onSave}>
          <label className="admin-field">
            Restaurant name
            <input defaultValue={props.restaurant.name} maxLength={120} name="name" required />
          </label>
          <label className="admin-field">
            Logo image URL
            <input defaultValue={props.restaurant.logo_url ?? ""} name="logoUrl" placeholder="https://..." type="url" />
          </label>
          <label className="admin-field">
            Wi-Fi network name
            <input defaultValue={props.restaurant.wifi_ssid} maxLength={128} name="wifiSsid" />
          </label>
          <label className="admin-field">
            Wi-Fi password
            <input defaultValue={props.restaurant.wifi_password} maxLength={256} name="wifiPassword" />
          </label>
          <label className="admin-field admin-field-wide">
            Google review link
            <input defaultValue={props.restaurant.google_review_url ?? ""} name="googleReviewUrl" placeholder="https://..." type="url" />
          </label>
          <label className="admin-field">
            Primary brand color
            <span className="admin-color-field">
              <input defaultValue={props.restaurant.primary_color ?? "#536543"} name="primaryColor" pattern="#[0-9a-fA-F]{6}" required />
              <input
                aria-label="Pick primary brand color"
                defaultValue={props.restaurant.primary_color ?? "#536543"}
                onChange={(event) => {
                  const textField = event.currentTarget.previousElementSibling as HTMLInputElement | null;
                  if (textField) textField.value = event.target.value;
                }}
                type="color"
              />
            </span>
          </label>
          <div className="admin-form-actions admin-field-wide">
            <button className="admin-button primary" disabled={props.isBusy} type="submit">
              Save settings
            </button>
          </div>
        </form>
        <p className="admin-privacy-note">Restaurant settings and credentials are only available to linked admin accounts.</p>
      </section>
    </>
  );
}

function LinksSection(props: {
  links: AdminDashboardData["links"];
  restaurantId: string;
  isBusy: boolean;
  createdUrl: string;
  kind: "qr" | "nfc";
  tableLabel: string;
  onKindChange: (kind: "qr" | "nfc") => void;
  onTableLabelChange: (label: string) => void;
  onCreate: (event: React.FormEvent<HTMLFormElement>) => void;
  onDelete: (id: string) => void;
}) {
  const [copied, setCopied] = useState(false);
  const [copyMessage, setCopyMessage] = useState("");
  const [siteOrigin, setSiteOrigin] = useState("");

  useEffect(() => {
    setSiteOrigin(window.location.origin);
  }, []);

  async function copyLink(url: string) {
    setCopyMessage("");
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch (copyError) {
      console.error("Could not copy guest link:", copyError);
      setCopyMessage("Copy isn't available here. Open the link or copy it manually.");
    }
  }

  return (
    <>
      <div className="admin-page-heading">
        <div><span className="eyebrow">Print, place, welcome</span><h2>QR codes & NFC tags</h2></div>
      </div>
      <section className="admin-panel link-create-panel">
        <div className="admin-panel-heading">
          <div><span className="eyebrow">New guest link</span><h3>Create a unique destination</h3></div>
        </div>
        <form className="link-create-form" onSubmit={props.onCreate}>
          <label className="admin-field">
            Link type
            <select onChange={(event) => props.onKindChange(event.target.value as "qr" | "nfc")} value={props.kind}>
              <option value="qr">QR code</option>
              <option value="nfc">NFC tag</option>
            </select>
          </label>
          <label className="admin-field">
            Table / placement label <span className="field-optional">Optional</span>
            <input
              maxLength={80}
              onChange={(event) => props.onTableLabelChange(event.target.value)}
              placeholder="e.g. Patio table 4"
              value={props.tableLabel}
            />
          </label>
          <button className="admin-button primary" disabled={props.isBusy} type="submit">
            Create {props.kind === "qr" ? "QR code" : "NFC link"}
          </button>
        </form>
        <p className="admin-privacy-note">
          NFC links are unique URLs ready to write to a tag. Guest page opens are counted as approximate page views.
        </p>
        {copyMessage && <p aria-live="polite" className="admin-inline-error">{copyMessage}</p>}
        {props.createdUrl && (
          <div className="created-link-notice">
            <span>{props.createdUrl}</span>
            <button className="admin-button secondary" onClick={() => void copyLink(props.createdUrl)} type="button">
              {copied ? "Copied" : "Copy link"}
            </button>
          </div>
        )}
      </section>

      <section className="admin-panel">
        <div className="admin-panel-heading">
          <div><span className="eyebrow">Active destinations</span><h3>{props.links.length} links</h3></div>
        </div>
        {copyMessage && <p aria-live="polite" className="admin-inline-error">{copyMessage}</p>}
        {props.links.length ? (
          <div className="guest-links-list">
            {props.links.map((link) => (
              <article className="guest-link-card" key={link.id}>
                {link.kind === "qr" && (
                  <a className="qr-download" href={`/api/admin/links/${link.id}/qr`} download={`tabletap-${link.id}.png`}>
                    <Image alt={`QR code for ${link.table_label || "restaurant"}`} height={78} src={`/api/admin/links/${link.id}/qr`} unoptimized width={78} />
                    <span>Download QR</span>
                  </a>
                )}
                <div className="guest-link-details">
                  <span className={link.kind === "qr" ? "link-kind qr-kind" : "link-kind nfc-kind"}>
                    {link.kind.toUpperCase()}
                  </span>
                  <strong>{link.table_label || "Restaurant entrance"}</strong>
                  <span className="guest-link-url">{link.token}</span>
                </div>
                <button
                  className="admin-text-button"
                  onClick={() => void copyLink(`${siteOrigin}/go/${link.token}`)}
                  type="button"
                >
                  Copy URL
                </button>
                <button
                  className="admin-text-button danger-action"
                  disabled={props.isBusy}
                  onClick={() => props.onDelete(link.id)}
                  type="button"
                >
                  Remove
                </button>
              </article>
            ))}
          </div>
        ) : (
          <p className="admin-empty-message">Create a QR code or NFC destination to get started.</p>
        )}
      </section>
      <span className="sr-only">Restaurant: {props.restaurantId}</span>
    </>
  );
}

type ManagedTable = {
  id: string;
  table_number: string;
  unique_code: string;
  is_active: boolean;
  created_at: string;
};

function TablesAdminSection({ restaurantId }: { restaurantId: string }) {
  const [tables, setTables] = useState<ManagedTable[]>([]);
  const [tableNumber, setTableNumber] = useState("");
  const [bulkStart, setBulkStart] = useState("1");
  const [bulkEnd, setBulkEnd] = useState("20");
  const [editingId, setEditingId] = useState("");
  const [editingNumber, setEditingNumber] = useState("");
  const [infoTableId, setInfoTableId] = useState("");
  const [siteOrigin, setSiteOrigin] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadTables = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/${restaurantId}/tables`, {
        cache: "no-store",
      });
      const result = await parseResponse(response) as {
        tables: ManagedTable[];
        siteOrigin: string;
      };
      setTables(result.tables);
      setSiteOrigin(result.siteOrigin);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load tables.");
    } finally {
      setIsLoading(false);
    }
  }, [restaurantId]);

  useEffect(() => {
    setSiteOrigin(window.location.origin);
    void loadTables();
  }, [loadTables]);

  async function sendTableRequest(
    method: "POST" | "PATCH" | "DELETE",
    body: unknown,
    successMessage: string,
  ) {
    setIsBusy(true);
    setError("");
    setMessage("");
    try {
      const isDelete = method === "DELETE";
      const url = `/api/admin/${restaurantId}/tables${isDelete ? `?tableId=${encodeURIComponent(String((body as { id: string }).id))}` : ""}`;
      const response = await fetch(url, {
        method,
        ...(isDelete
          ? {}
          : {
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(body),
            }),
      });
      await parseResponse(response);
      setMessage(successMessage);
      await loadTables();
      return true;
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Could not save table changes.");
      return false;
    } finally {
      setIsBusy(false);
    }
  }

  async function createTable(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const success = await sendTableRequest(
      "POST",
      { tableNumber },
      "Table created. Its guest URL is ready to copy or print.",
    );
    if (success) setTableNumber("");
  }

  async function createBulk(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const start = Number(bulkStart);
    const end = Number(bulkEnd);
    if (!Number.isInteger(start) || !Number.isInteger(end) || start < 1 || end < start || end - start >= 200) {
      setError("Enter a valid whole-number range of up to 200 tables.");
      return;
    }
    setIsBusy(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch(`/api/admin/${restaurantId}/tables`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "bulk", start, end }),
      });
      const result = await parseResponse(response) as { created: number };
      setMessage(`${result.created} table${result.created === 1 ? "" : "s"} created. Existing table numbers were left unchanged.`);
      await loadTables();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Could not create tables.");
    } finally {
      setIsBusy(false);
    }
  }

  async function updateTable(id: string, updates: { tableNumber?: string; isActive?: boolean }) {
    const success = await sendTableRequest(
      "PATCH",
      { id, ...updates },
      updates.isActive === undefined ? "Table details updated." : "Table status updated.",
    );
    if (success) {
      setEditingId("");
      setEditingNumber("");
    }
  }

  async function deleteTable(table: ManagedTable) {
    if (!window.confirm(`Delete Table ${table.table_number}? Existing feedback and loyalty records will remain, without a table assignment.`)) {
      return;
    }
    await sendTableRequest("DELETE", { id: table.id }, "Table deleted.");
  }

  function guestUrl(code: string) {
    return `${siteOrigin}/t/${code}`;
  }

  return (
    <>
      <div className="admin-page-heading">
        <div>
          <span className="eyebrow">One destination per seat</span>
          <h2>Tables</h2>
        </div>
      </div>
      {error && <p aria-live="assertive" className="admin-alert error">{error}</p>}
      {message && !error && <p aria-live="polite" className="admin-alert success">{message}</p>}
      <div className="table-create-grid">
        <section className="admin-panel">
          <div className="admin-panel-heading">
            <div><span className="eyebrow">Add one</span><h3>Create a table</h3></div>
          </div>
          <form className="table-create-form" onSubmit={(event) => void createTable(event)}>
            <label className="admin-field">
              Table number or name
              <input
                autoComplete="off"
                maxLength={80}
                onChange={(event) => setTableNumber(event.target.value)}
                placeholder="e.g. 12, A1, Patio-3"
                required
                value={tableNumber}
              />
            </label>
            <button className="admin-button primary" disabled={isBusy} type="submit">Add table</button>
          </form>
        </section>
        <section className="admin-panel">
          <div className="admin-panel-heading">
            <div><span className="eyebrow">Create a range</span><h3>Bulk create tables</h3></div>
          </div>
          <form className="table-bulk-form" onSubmit={(event) => void createBulk(event)}>
            <label className="admin-field">
              From
              <input
                inputMode="numeric"
                onChange={(event) => setBulkStart(event.target.value)}
                required
                type="number"
                min="1"
                max="1000000"
                value={bulkStart}
              />
            </label>
            <label className="admin-field">
              To
              <input
                inputMode="numeric"
                onChange={(event) => setBulkEnd(event.target.value)}
                required
                type="number"
                min="1"
                max="1000000"
                value={bulkEnd}
              />
            </label>
            <button className="admin-button secondary" disabled={isBusy} type="submit">Create range</button>
          </form>
        </section>
      </div>

      <section className="admin-panel table-list-panel">
        <div className="admin-panel-heading">
          <div><span className="eyebrow">Guest destinations</span><h3>{tables.length} table{tables.length === 1 ? "" : "s"}</h3></div>
        </div>
        {isLoading ? (
          <p className="admin-loading">Loading tables...</p>
        ) : tables.length ? (
          <div className="managed-table-list">
            {tables.map((table) => (
              <article className="managed-table-card" key={table.id}>
                <div className="managed-table-heading">
                  {editingId === table.id ? (
                    <form
                      className="managed-table-edit"
                      onSubmit={(event) => {
                        event.preventDefault();
                        void updateTable(table.id, { tableNumber: editingNumber });
                      }}
                    >
                      <input
                        aria-label="Table number"
                        autoFocus
                        maxLength={80}
                        onChange={(event) => setEditingNumber(event.target.value)}
                        required
                        value={editingNumber}
                      />
                      <button className="admin-text-button" disabled={isBusy} type="submit">Save</button>
                      <button className="admin-text-button" onClick={() => setEditingId("")} type="button">Cancel</button>
                    </form>
                  ) : (
                    <div className="managed-table-title">
                      <strong>Table {table.table_number}</strong>
                      <span className={table.is_active ? "table-status active" : "table-status inactive"}>
                        {table.is_active ? "Active" : "Inactive"}
                      </span>
                    </div>
                  )}
                  {editingId !== table.id && (
                    <button
                      className="admin-text-button"
                      onClick={() => {
                        setEditingId(table.id);
                        setEditingNumber(table.table_number);
                      }}
                      type="button"
                    >Edit</button>
                  )}
                </div>
                <div className="managed-table-url">
                  <span>Guest URL</span>
                  <a href={guestUrl(table.unique_code)} rel="noreferrer" target="_blank">
                    {guestUrl(table.unique_code)}
                  </a>
                </div>
                <div className="managed-table-actions">
                  <a className="admin-button secondary" href={`/api/admin/tables/${table.id}/qr`} download>
                    Download QR · PNG
                  </a>
                  <a className="admin-button secondary" href={`/api/admin/tables/${table.id}/qr?format=svg`} download>
                    Download QR · SVG
                  </a>
                  <button
                    className="admin-button secondary"
                    onClick={() => setInfoTableId(infoTableId === table.id ? "" : table.id)}
                    type="button"
                  >
                    NFC Tag Info
                  </button>
                  <button
                    className="admin-button secondary"
                    disabled={isBusy}
                    onClick={() => void updateTable(table.id, { isActive: !table.is_active })}
                    type="button"
                  >
                    {table.is_active ? "Deactivate" : "Activate"}
                  </button>
                  <button
                    className="admin-text-button danger-action"
                    disabled={isBusy}
                    onClick={() => void deleteTable(table)}
                    type="button"
                  >Delete</button>
                </div>
                {infoTableId === table.id && (
                  <div className="nfc-tag-info">
                    <strong>Write this URL to the NFC tag</strong>
                    <a href={guestUrl(table.unique_code)}>{guestUrl(table.unique_code)}</a>
                    {!table.is_active && <span>This table is inactive; the link will not open until it is activated.</span>}
                  </div>
                )}
              </article>
            ))}
          </div>
        ) : (
          <p className="admin-empty-message">Add a table to generate its unique guest URL, QR code, and NFC destination.</p>
        )}
      </section>
    </>
  );
}
