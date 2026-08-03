"use client";

import { useCallback, useEffect, useState } from "react";
import { socialApi, type SocialSettings } from "@/lib/api/social";

export const DEFAULT_NOTIFICATION_SETTINGS: Record<string, boolean> = {
  likes: true,
  comments: true,
  follows: true,
  messages: true,
  reposts: true,
  mentions: true,
  liveVideos: false,
  emailNotifs: false,
};

export function useSocialSettings() {
  const [settings, setSettings] = useState<SocialSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await socialApi.getMySettings();
      setSettings(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load settings.");
      setSettings(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const patch = useCallback(async (partial: Partial<SocialSettings>) => {
    const previous = settings;
    setSettings((current) => ({
      ...(current ?? {}),
      ...partial,
      notifications: {
        ...(current?.notifications ?? DEFAULT_NOTIFICATION_SETTINGS),
        ...(partial.notifications ?? {}),
      },
      privacy: { ...(current?.privacy ?? {}), ...(partial.privacy ?? {}) },
      messaging: { ...(current?.messaging ?? {}), ...(partial.messaging ?? {}) },
      security: { ...(current?.security ?? {}), ...(partial.security ?? {}) },
      closeFriends: partial.closeFriends ?? current?.closeFriends,
      blockedUsers: partial.blockedUsers ?? current?.blockedUsers,
    }));
    try {
      const next = await socialApi.updateMySettings(partial);
      setSettings(next);
      return next;
    } catch (err) {
      setSettings(previous);
      throw err;
    }
  }, [settings]);

  return { settings, loading, error, reload: load, patch };
}
