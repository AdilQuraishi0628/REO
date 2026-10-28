"use client";

import { useCallback, useEffect, useState } from "react";
import { trackProductEvent } from "@/lib/product-analytics";

type AnalyticsRange = "7d" | "30d" | "all";
type FeedbackFilter = "all" | "unresolved" | "high" | "low";

type AnalyticsSummary = {
  totalScans: number;
  loyaltyMembers: number;
  feedbackTotal: number;
  averageRating: number;
  reviewPrompts: number;
};

type FeedbackEntry = {
  id: string;
  rating: number;
  comment: string | null;
  guest_name: string | null;
  phone: string | null;
  contact: string | null;
  table_label: string | null;
  review_prompted: boolean;
  resolved_at: string | null;
  created_at: string;
};

type LoyaltyMember = {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  stamps: number;
  reward_goal: number;
  created_at: string;
};

async function responseData(response: Response) {
  const data: unknown = await response.json();
  if (response.ok) return data;
  const message =
    typeof data === "object" &&
    data !== null &&
    "error" in data &&
    typeof data.error === "string"
      ? data.error
      : "Could not complete the request.";
  throw new Error(message);
}

function PageHeading({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="admin-page-heading">
      <div><span className="eyebrow">{eyebrow}</span><h2>{title}</h2></div>
    </div>
  );
}

function LoadingRows({ count = 3 }: { count?: number }) {
  return (
    <div aria-label="Loading" className="admin-skeleton-list" role="status">
      {Array.from({ length: count }, (_, index) => (
        <span className="admin-skeleton-row" key={index} />
      ))}
    </div>
  );
}

export function AnalyticsSection({ restaurantId }: { restaurantId: string }) {
  const [range, setRange] = useState<AnalyticsRange>("7d");
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);
    setError("");
    fetch(`/api/admin/${restaurantId}/analytics?range=${range}`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(responseData)
      .then((data) => setSummary(data as AnalyticsSummary))
      .catch((loadError: unknown) => {
        if (!controller.signal.aborted) {
          setError(loadError instanceof Error ? loadError.message : "Could not load analytics.");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });
    return () => controller.abort();
  }, [range, restaurantId]);

  const rangeLabel = range === "7d" ? "Last 7 days" : range === "30d" ? "Last 30 days" : "All time";

  return (
    <>
      <PageHeading eyebrow="The bigger picture" title="Analytics" />
      <section className="admin-panel analytics-panel">
        <div className="admin-panel-heading">
          <div><span className="eyebrow">Restaurant performance</span><h3>{rangeLabel}</h3></div>
          <label className="analytics-range">
            <span className="sr-only">Date range</span>
            <select onChange={(event) => setRange(event.target.value as AnalyticsRange)} value={range}>
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="all">All time</option>
            </select>
          </label>
        </div>
        {isLoading ? (
          <LoadingRows />
        ) : error ? (
          <p className="admin-inline-error">{error}</p>
        ) : summary ? (
          <>
            <div className="analytics-stats-grid">
              <MetricCard label="Page views" value={summary.totalScans.toLocaleString()} note="Guest page opens" />
              <MetricCard label="Loyalty members" value={summary.loyaltyMembers.toLocaleString()} note="Joined in selected period" />
              <MetricCard label="Feedback submitted" value={summary.feedbackTotal.toLocaleString()} note="Private guest responses" />
              <MetricCard label="Average rating" value={summary.feedbackTotal ? `${summary.averageRating.toFixed(1)} / 5` : "—"} note="Across all submitted feedback" />
              <MetricCard label="Review prompts" value={summary.reviewPrompts.toLocaleString()} note="4- and 5-star feedback" />
            </div>
            <p className="analytics-footnote">
              Page views count guest page loads and may include repeat visits or automated traffic.
            </p>
          </>
        ) : null}
      </section>
    </>
  );
}

function MetricCard({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <article className="analytics-metric-card">
      <span className="eyebrow">{label}</span>
      <strong>{value}</strong>
      <span>{note}</span>
    </article>
  );
}

export function FeedbackAdminSection({ restaurantId }: { restaurantId: string }) {
  const [filter, setFilter] = useState<FeedbackFilter>("all");
  const [page, setPage] = useState(0);
  const [entries, setEntries] = useState<FeedbackEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");

  const loadEntries = useCallback(async (signal?: AbortSignal) => {
    setIsLoading(true);
    setError("");
    try {
      const response = await fetch(
        `/api/admin/${restaurantId}/feedback?filter=${filter}&page=${page}`,
        { cache: "no-store", signal },
      );
      const result = await responseData(response) as {
        entries: FeedbackEntry[];
        total: number;
      };
      setEntries(result.entries);
      setTotal(result.total);
    } catch (loadError) {
      if (!signal?.aborted) setError(loadError instanceof Error ? loadError.message : "Could not load feedback.");
    } finally {
      if (!signal?.aborted) setIsLoading(false);
    }
  }, [filter, page, restaurantId]);

  useEffect(() => {
    const controller = new AbortController();
    void loadEntries(controller.signal);
    return () => controller.abort();
  }, [loadEntries]);

  async function toggleResolved(entry: FeedbackEntry) {
    setBusyId(entry.id);
    setError("");
    try {
      const response = await fetch(`/api/admin/${restaurantId}/feedback`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feedbackId: entry.id, resolved: !entry.resolved_at }),
      });
      await responseData(response);
      await loadEntries();
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Could not update feedback.");
    } finally {
      setBusyId("");
    }
  }

  return (
    <>
      <PageHeading eyebrow="Private guest notes" title="Feedback" />
      <section className="admin-panel feedback-admin-panel">
        <div className="admin-panel-heading">
          <div><span className="eyebrow">Guest voices</span><h3>{total} responses</h3></div>
          <label className="analytics-range">
            <span className="sr-only">Filter feedback</span>
            <select
              onChange={(event) => {
                setFilter(event.target.value as FeedbackFilter);
                setPage(0);
              }}
              value={filter}
            >
              <option value="all">All feedback</option>
              <option value="unresolved">Unresolved</option>
              <option value="high">High rating · 4–5</option>
              <option value="low">Low rating · 1–3</option>
            </select>
          </label>
        </div>
        {error && <p aria-live="assertive" className="admin-inline-error">{error}</p>}
        {isLoading ? (
          <LoadingRows count={4} />
        ) : entries.length ? (
          <>
            <div className="feedback-admin-list">
              {entries.map((entry) => (
                <article className="feedback-admin-row" key={entry.id}>
                  <div className="feedback-admin-main">
                    <div className="feedback-rating-line">
                      <span className="admin-rating-stars" aria-label={`${entry.rating} out of 5 stars`}>
                        {"★".repeat(entry.rating)}<span>{"★".repeat(5 - entry.rating)}</span>
                      </span>
                      <time dateTime={entry.created_at}>
                        {new Date(entry.created_at).toLocaleString()}
                      </time>
                    </div>
                    <p>{entry.comment || "No written comment."}</p>
                    <div className="feedback-admin-meta">
                      <span>{entry.guest_name || "Guest"}</span>
                      {entry.phone && <a href={`tel:${entry.phone}`}>{entry.phone}</a>}
                      {!entry.phone && entry.contact && <span>Contact · {entry.contact}</span>}
                      {entry.table_label && <span>Table · {entry.table_label}</span>}
                      {entry.review_prompted && <span className="review-prompt-badge">Review prompt shown</span>}
                    </div>
                  </div>
                  <div className="feedback-admin-status">
                    <span className={entry.resolved_at ? "resolved-badge" : "unresolved-badge"}>
                      {entry.resolved_at ? "Resolved" : "Unresolved"}
                    </span>
                    <button
                      className="admin-button secondary"
                      disabled={busyId === entry.id}
                      onClick={() => void toggleResolved(entry)}
                      type="button"
                    >
                      {busyId === entry.id ? "Saving..." : entry.resolved_at ? "Reopen" : "Mark resolved"}
                    </button>
                  </div>
                </article>
              ))}
            </div>
            <Pagination page={page} total={total} pageSize={50} onPageChange={setPage} />
          </>
        ) : (
          <p className="admin-empty-message">No feedback matches this filter.</p>
        )}
      </section>
    </>
  );
}

export function LoyaltyAdminSection({ restaurantId }: { restaurantId: string }) {
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [members, setMembers] = useState<LoyaltyMember[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadMembers = useCallback(async (signal?: AbortSignal) => {
    setIsLoading(true);
    setError("");
    try {
      const response = await fetch(
        `/api/admin/${restaurantId}/loyalty?page=${page}&search=${encodeURIComponent(search.trim())}`,
        { cache: "no-store", signal },
      );
      const result = await responseData(response) as {
        members: LoyaltyMember[];
        total: number;
      };
      setMembers(result.members);
      setTotal(result.total);
    } catch (loadError) {
      if (!signal?.aborted) setError(loadError instanceof Error ? loadError.message : "Could not load members.");
    } finally {
      if (!signal?.aborted) setIsLoading(false);
    }
  }, [page, restaurantId, search]);

  useEffect(() => {
    const controller = new AbortController();
    void loadMembers(controller.signal);
    return () => controller.abort();
  }, [loadMembers]);

  async function addStamp(member: LoyaltyMember) {
    setBusyId(member.id);
    setError("");
    setMessage("");
    try {
      const response = await fetch(`/api/admin/${restaurantId}/loyalty`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId: member.id }),
      });
      await responseData(response);
      trackProductEvent("manual_loyalty_stamp_awarded");
      setMessage(`Added a stamp to ${member.full_name}'s card.`);
      await loadMembers();
    } catch (stampError) {
      setError(stampError instanceof Error ? stampError.message : "Could not add a stamp.");
    } finally {
      setBusyId("");
    }
  }

  return (
    <>
      <PageHeading eyebrow="Your regulars" title="Loyalty members" />
      <section className="admin-panel loyalty-admin-panel">
        <div className="admin-panel-heading">
          <div><span className="eyebrow">Members</span><h3>{total} enrolled</h3></div>
        </div>
        <label className="admin-field loyalty-member-search">
          Search by phone number
          <input
            autoComplete="off"
            inputMode="tel"
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(0);
            }}
            placeholder="Search Indian mobile numbers"
            type="search"
            value={search}
          />
        </label>
        {error && <p aria-live="assertive" className="admin-inline-error">{error}</p>}
        {message && <p aria-live="polite" className="admin-inline-success">{message}</p>}
        {isLoading ? (
          <LoadingRows count={4} />
        ) : members.length ? (
          <>
            <div className="loyalty-members-list">
              {members.map((member) => (
                <article className="loyalty-member-row" key={member.id}>
                  <div className="member-initial" aria-hidden="true">
                    {member.full_name.trim().slice(0, 1).toUpperCase()}
                  </div>
                  <div className="loyalty-member-info">
                    <strong>{member.full_name}</strong>
                    {member.phone && <a href={`tel:${member.phone}`}>{member.phone}</a>}
                    <time dateTime={member.created_at}>
                      Joined {new Date(member.created_at).toLocaleDateString()}
                    </time>
                  </div>
                  <div className="member-stamp-progress">
                    <div aria-label={`${member.stamps} of ${member.reward_goal} stamps`} className="mini-stamps">
                      {Array.from({ length: member.reward_goal }, (_, index) => (
                        <span className={index < member.stamps ? "earned" : ""} key={index} />
                      ))}
                    </div>
                    <span>{member.stamps} / {member.reward_goal} stamps</span>
                  </div>
                  <button
                    className="admin-button secondary"
                    disabled={busyId === member.id || member.stamps >= member.reward_goal}
                    onClick={() => void addStamp(member)}
                    type="button"
                  >
                    {busyId === member.id ? "Adding..." : member.stamps >= member.reward_goal ? "Reward reached" : "Add stamp"}
                  </button>
                </article>
              ))}
            </div>
            <Pagination page={page} total={total} pageSize={50} onPageChange={setPage} />
          </>
        ) : (
          <p className="admin-empty-message">New loyalty members will show up here.</p>
        )}
      </section>
    </>
  );
}

function Pagination({
  page,
  total,
  pageSize,
  onPageChange,
}: {
  page: number;
  total: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}) {
  const pageCount = Math.ceil(total / pageSize);
  if (pageCount < 2) return null;
  return (
    <div className="admin-pagination">
      <span>Page {page + 1} of {pageCount}</span>
      <div>
        <button className="admin-button secondary" disabled={page === 0} onClick={() => onPageChange(page - 1)} type="button">
          Previous
        </button>
        <button className="admin-button secondary" disabled={page + 1 >= pageCount} onClick={() => onPageChange(page + 1)} type="button">
          Next
        </button>
      </div>
    </div>
  );
}
