"use client";

import { Bell } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  link: string | null;
  readAt: string | null;
  createdAt: string;
}

interface NotificationResponse {
  success: boolean;
  data?: {
    items: NotificationItem[];
    unreadCount: number;
  };
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const loadNotifications = async () => {
    try {
      const response = await fetch("/api/notifications?limit=12", { cache: "no-store" });
      const payload = (await response.json()) as NotificationResponse;
      if (!response.ok || !payload.success || !payload.data) return;
      setItems(payload.data.items);
      setUnreadCount(payload.data.unreadCount);
    } catch {
      // no-op
    }
  };

  useEffect(() => {
    void loadNotifications();
    const interval = setInterval(() => void loadNotifications(), 20_000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const onClickOutside = (event: MouseEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const hasUnread = unreadCount > 0;

  const onMarkAllRead = async () => {
    setIsLoading(true);
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "readAll" }),
      });
      await loadNotifications();
    } finally {
      setIsLoading(false);
    }
  };

  const relativeTime = useMemo(
    () =>
      new Intl.RelativeTimeFormat("en", {
        numeric: "auto",
      }),
    [],
  );

  const formatSince = (dateValue: string) => {
    const diffMs = new Date(dateValue).getTime() - Date.now();
    const diffMin = Math.round(diffMs / (60 * 1000));
    if (Math.abs(diffMin) < 60) return relativeTime.format(diffMin, "minute");
    const diffHours = Math.round(diffMin / 60);
    if (Math.abs(diffHours) < 24) return relativeTime.format(diffHours, "hour");
    const diffDays = Math.round(diffHours / 24);
    return relativeTime.format(diffDays, "day");
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="relative p-2 text-gray-600 hover:text-orange-500 transition-colors rounded-full hover:bg-gray-100"
        title="Notifications"
      >
        <Bell className="w-5 h-5" />
        {hasUnread && (
          <span className="absolute top-1.5 right-1.5 min-w-4 h-4 px-1 rounded-full bg-[#E67E22] text-white text-[10px] font-semibold flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-[340px] max-w-[90vw] bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <p className="text-sm font-semibold text-[#192F59]">Notifications</p>
            <button
              onClick={() => void onMarkAllRead()}
              disabled={isLoading || unreadCount === 0}
              className="text-xs text-[#E67E22] hover:underline disabled:text-gray-300"
            >
              Mark all read
            </button>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 ? (
              <div className="px-4 py-6 text-sm text-gray-500">No notifications yet.</div>
            ) : (
              items.map((item) => (
                <button
                  key={item.id}
                  onClick={async () => {
                    await fetch(`/api/notifications/${item.id}`, { method: "PATCH" });
                    void loadNotifications();
                    setExpandedId((prev) => (prev === item.id ? null : item.id));
                  }}
                  className="w-full text-left px-4 py-3 border-b border-gray-100 last:border-b-0 hover:bg-gray-50"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium text-gray-900">{item.title}</p>
                    {!item.readAt && <span className="mt-1 w-2 h-2 rounded-full bg-[#E67E22] flex-shrink-0" />}
                  </div>
                  <p className={`mt-1 text-xs text-gray-600 ${expandedId === item.id ? "" : "line-clamp-2"}`}>{item.message}</p>
                  <p className="mt-1 text-[11px] text-gray-400">{formatSince(item.createdAt)}</p>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
