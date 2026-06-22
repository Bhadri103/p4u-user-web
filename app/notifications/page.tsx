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
      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-8">
        <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
          <Bell className="w-6 h-6" /> Notifications
        </h1>

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
            <div
              key={n.id}
              className={`p-4 rounded-xl border transition ${
                n.isRead ? "bg-white border-gray-200" : "bg-teal-50 border-teal-200"
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
            </div>
          ))}
        </div>
      </main>
      <Footer />
    </div>
    </AuthGuard>
  );
}
