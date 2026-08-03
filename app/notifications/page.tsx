"use client";

import { useState, useEffect } from "react";
import AuthGuard from "@/providers/AuthGuard";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Bell, Check, Loader2 } from "lucide-react";
import { notificationsApi, Notification } from "@/lib/api/notifications";

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    notificationsApi
      .getMyNotifications({ limit: 50 })
      .then(setNotifications)
      .catch(() => setError("Unable to load notifications"))
      .finally(() => setLoading(false));
  }, []);

  const markRead = async (id: number) => {
    await notificationsApi.markAsRead(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
  };

  return (
    <AuthGuard>
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-6 sm:px-6 sm:py-10">
        <section className="mb-6 flex items-center gap-4 rounded-3xl border border-[#D7E7F5] bg-gradient-to-br from-[#EAF4FF] to-white p-5 shadow-[0_14px_36px_rgba(137,207,240,.08)] sm:p-7">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#89CFF0] text-white shadow-[0_10px_24px_rgba(137,207,240,.22)]">
            <Bell className="h-7 w-7" />
          </span>
          <div>
            <h1 className="text-2xl font-semibold sm:text-3xl">Notifications</h1>
            <p className="mt-1 text-sm text-[#5D757A]">Your latest account, order, service, and Socio updates.</p>
          </div>
        </section>

        {loading && (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
          </div>
        )}

        {error && (
          <p className="text-center text-red-500 py-10">{error}</p>
        )}

        {!loading && !error && notifications.length === 0 && (
          <p className="text-center text-gray-400 py-20">No notifications yet.</p>
        )}

        <div className="space-y-3">
          {notifications.map((n) => (
            <article
              key={n.id}
              className={`rounded-2xl border p-4 shadow-[0_8px_26px_rgba(137,207,240,.06)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_15px_34px_rgba(137,207,240,.11)] sm:p-5 ${
                n.isRead ? "border-[#D7E7F5] bg-white" : "border-[#B8E3F7] bg-[#EAF4FF]"
              }`}
            >
              <div className="flex justify-between items-start gap-4">
                <div className="flex-1">
                  <p className="font-semibold">{n.title}</p>
                  {n.body && <p className="text-sm text-gray-600 mt-1">{n.body}</p>}
                  <p className="text-xs text-gray-400 mt-2">
                    {new Date(n.createdAt).toLocaleString()}
                  </p>
                </div>
                {!n.isRead && (
                  <button
                    onClick={() => markRead(n.id)}
                    className="text-teal-600 hover:text-teal-800"
                    title="Mark as read"
                  >
                    <Check className="w-5 h-5" />
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      </main>
      <Footer />
    </div>
    </AuthGuard>
  );
}
