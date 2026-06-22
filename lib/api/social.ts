import { apiClient, PaginatedResponse } from "./client";

const BASE = "/api/v1/social";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface Post {
  id: string | number;
  userId?: string | number;
  userName?: string;
  userAvatar?: string;
  content?: string;
  imageUrl?: string;
  likeCount: number;
  commentCount: number;
  isLiked?: boolean;
  createdAt: string;
}

export interface Comment {
  id: number | string;
  postId: number | string;
  userId?: number | string;
  userName?: string;
  content: string;
  parentCommentId?: number | string;
  createdAt: string;
}

export interface UserSummary {
  id: number;
  name?: string;
  avatar?: string;
}

export interface Story {
  id: number | string;
  userId?: number | string;
  userName?: string;
  userAvatar?: string;
  mediaUrl: string;
  mediaType: string;
  viewCount: number;
  createdAt: string;
}

function mapApiPost(row: Record<string, unknown>): Post {
  const mediaUrls = (row.mediaUrls as string[] | null | undefined) ?? null;
  const firstImage = mediaUrls?.[0];
  return {
    id: (row.id as string | number) ?? "",
    userId: (row.authorId ?? row.userId) as string | number | undefined,
    userName: row.userName as string | undefined,
    userAvatar: row.userAvatar as string | undefined,
    content: (row.contentText as string) ?? (row.content as string) ?? undefined,
    imageUrl: firstImage ?? (row.imageUrl as string) ?? undefined,
    likeCount: Number(row.likeCount) || 0,
    commentCount: Number(row.commentCount) || 0,
    isLiked: row.isLiked as boolean | undefined,
    createdAt: String(row.createdAt ?? ""),
  };
}

function mapApiComment(row: Record<string, unknown>): Comment {
  return {
    id: (row.id as string | number) ?? "",
    postId: (row.postId as string | number) ?? (row.post_id as string | number) ?? "",
    userId: (row.userId ?? row.authorId) as string | number | undefined,
    userName: row.userName as string | undefined,
    content: String(row.contentText ?? row.content ?? ""),
    parentCommentId: (row.parentCommentId ?? row.parent_comment_id) as string | number | undefined,
    createdAt: String(row.createdAt ?? ""),
  };
}

function ensurePostFeedResult(
  raw: unknown,
  params?: { limit?: number; offset?: number },
): PaginatedResponse<Post> {
  if (raw && typeof raw === "object" && "data" in raw && Array.isArray((raw as PaginatedResponse<Post>).data)) {
    const p = raw as PaginatedResponse<Record<string, unknown>>;
    return {
      data: p.data.map((r) => mapApiPost(r as Record<string, unknown>)),
      total: p.total,
      limit: p.limit,
      offset: p.offset,
    };
  }
  const arr = Array.isArray(raw) ? raw : [];
  const mapped = arr.map((r) => mapApiPost(r as Record<string, unknown>));
  return {
    data: mapped,
    total: mapped.length,
    limit: params?.limit ?? 20,
    offset: params?.offset ?? 0,
  };
}

/* ------------------------------------------------------------------ */
/*  API functions                                                      */
/* ------------------------------------------------------------------ */

export const socialApi = {
  health() {
    return apiClient.get<{ status: string }>(`${BASE}/public/health`);
  },

  getFeed(params?: { limit?: number; offset?: number }) {
    return apiClient
      .get<unknown>(`${BASE}/feed`, params as Record<string, string | number | boolean>)
      .then((raw) => ensurePostFeedResult(raw, params));
  },

  getPublicFeed(params?: { limit?: number; offset?: number }) {
    return apiClient
      .get<unknown>(`${BASE}/feed/public`, params as Record<string, string | number | boolean>)
      .then((raw) => ensurePostFeedResult(raw, params));
  },

  getPost(postId: string | number) {
    return apiClient.get<Record<string, unknown>>(`${BASE}/posts/${postId}`).then(mapApiPost);
  },

  createPost(data: {
    content?: string;
    imageUrl?: string;
    contentText?: string;
    mediaUrls?: string[];
    postType?: string;
    visibility?: string;
    location?: string;
    tags?: string[];
  }) {
    const contentText = data.contentText ?? data.content ?? "";
    const mediaUrls = data.mediaUrls ?? (data.imageUrl ? [data.imageUrl] : undefined);
    return apiClient
      .post<Record<string, unknown>>(`${BASE}/posts`, {
        contentText,
        mediaUrls,
        postType: data.postType,
        visibility: data.visibility,
        location: data.location,
        tags: data.tags,
      })
      .then(mapApiPost);
  },

  getTrendingTags(params?: { limit?: number }) {
    return apiClient
      .get<{ items?: Array<{ tag: string; postCount: number }> } | Array<{ tag: string; postCount: number }>>(
        `${BASE}/explore/tags`,
        params as Record<string, string | number | boolean>,
      )
      .then((raw) => {
        if (Array.isArray(raw)) return raw;
        return raw?.items ?? [];
      });
  },

  getTrendingPlaces(params?: { limit?: number }) {
    return apiClient
      .get<{ items?: Array<{ place: string; postCount: number }> } | Array<{ place: string; postCount: number }>>(
        `${BASE}/explore/places`,
        params as Record<string, string | number | boolean>,
      )
      .then((raw) => {
        if (Array.isArray(raw)) return raw;
        return raw?.items ?? [];
      });
  },

  deletePost(postId: string | number) {
    return apiClient.delete<void>(`${BASE}/posts/${postId}`);
  },

  likePost(postId: string | number) {
    return apiClient.post<void>(`${BASE}/posts/${postId}/like`);
  },

  unlikePost(postId: string | number) {
    return apiClient.delete<void>(`${BASE}/posts/${postId}/like`);
  },

  getComments(postId: string | number) {
    return apiClient
      .get<unknown>(`${BASE}/posts/${postId}/comments`)
      .then((raw) => {
        if (Array.isArray(raw)) {
          return raw.map((r) => mapApiComment(r as Record<string, unknown>));
        }
        if (raw && typeof raw === "object" && "data" in raw && Array.isArray((raw as PaginatedResponse<unknown>).data)) {
          return (raw as PaginatedResponse<Record<string, unknown>>).data.map(mapApiComment);
        }
        return [];
      });
  },

  createComment(postId: string | number, data: { content?: string; contentText?: string; parentCommentId?: number | string }) {
    return apiClient
      .post<Record<string, unknown>>(`${BASE}/posts/${postId}/comments`, {
        contentText: data.contentText ?? data.content ?? "",
        parentCommentId: data.parentCommentId,
      })
      .then(mapApiComment);
  },

  followUser(userId: string | number) {
    return apiClient.post<void>(`${BASE}/users/${userId}/follow`);
  },

  unfollowUser(userId: string | number) {
    return apiClient.delete<void>(`${BASE}/users/${userId}/follow`);
  },

  getFollowers(userId: string | number) {
    return apiClient.get<UserSummary[]>(`${BASE}/users/${userId}/followers`).then((raw) => {
      if (Array.isArray(raw)) return raw;
      if (raw && typeof raw === "object" && "data" in raw) {
        return (raw as { data: UserSummary[] }).data ?? [];
      }
      return [];
    });
  },

  getFollowing(userId: string | number) {
    return apiClient.get<UserSummary[]>(`${BASE}/users/${userId}/following`).then((raw) => {
      if (Array.isArray(raw)) return raw;
      if (raw && typeof raw === "object" && "data" in raw) {
        return (raw as { data: UserSummary[] }).data ?? [];
      }
      return [];
    });
  },

  getSuggestions(params?: { limit?: number; offset?: number }) {
    return apiClient.get<UserSummary[]>(
      `${BASE}/users/suggestions`,
      params as Record<string, string | number | boolean> | undefined,
    );
  },

  getStoryFeed() {
    return apiClient.get<unknown[]>(`${BASE}/stories/feed`).then((rows) =>
      (Array.isArray(rows) ? rows : []).map(
        (r) =>
          ({
            id: (r as Record<string, unknown>).id,
            userId: (r as Record<string, unknown>).authorId,
            userName: (r as Record<string, unknown>).userName,
            userAvatar: (r as Record<string, unknown>).userAvatar,
            mediaUrl: String((r as Record<string, unknown>).mediaUrl ?? ""),
            mediaType: String((r as Record<string, unknown>).mediaType ?? "image"),
            viewCount: Number((r as Record<string, unknown>).viewCount) || 0,
            createdAt: String((r as Record<string, unknown>).createdAt ?? ""),
          }) as Story,
      ),
    );
  },

  getMyStories() {
    return apiClient.get<unknown[]>(`${BASE}/stories/me`).then((rows) =>
      (Array.isArray(rows) ? rows : []).map(
        (r) =>
          ({
            id: (r as Record<string, unknown>).id,
            mediaUrl: String((r as Record<string, unknown>).mediaUrl ?? ""),
            mediaType: String((r as Record<string, unknown>).mediaType ?? "image"),
            viewCount: Number((r as Record<string, unknown>).viewCount) || 0,
            createdAt: String((r as Record<string, unknown>).createdAt ?? ""),
          }) as Story,
      ),
    );
  },

  createStory(data: { mediaUrl: string; mediaType: string; textOverlay?: string }) {
    return apiClient.post<Story>(`${BASE}/stories`, data);
  },

  /**
   * Uploads an image or video to the socio service and returns the canonical URL.
   * Server detects mediaType from MIME ('image' | 'video'). Use the returned URL as
   * the `mediaUrl` for createStory or push it into createPost's `mediaUrls[]`.
   */
  async uploadMedia(file: File): Promise<{ url: string; mediaType: 'image' | 'video'; filename: string; size: number }> {
    const fd = new FormData();
    fd.append('file', file);
    const token = typeof window !== 'undefined' ? localStorage.getItem('p4u_token') : null;
    const apiBase = (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_API_GATEWAY_URL) || '';
    const res = await fetch(`${apiBase}${BASE}/upload`, {
      method: 'POST',
      body: fd,
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(text || `Upload failed (${res.status})`);
    }
    return res.json();
  },

  viewStory(storyId: string | number) {
    return apiClient.post<void>(`${BASE}/stories/${storyId}/view`);
  },
};
