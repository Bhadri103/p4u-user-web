import { apiClient, PaginatedResponse } from "./client";

const BASE = "/api/v1/social";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

/** A social advertisement surfaced in the feed (from the admin console). */
export interface SponsoredAd {
  id: string;
  isSponsored: true;
  title: string;
  image: string | null;
  caption: string;
  advertiser: string;
  redirectUrl: string | null;
  desktopImage?: string | null;
  mobileImage?: string | null;
  targetType?: string | null;
  productId?: string | null;
  vendorId?: string | null;
  trendingVendor?: boolean;
}

export type SocioAdMode = "prefer_admin_then_admob" | "alternate" | "admin_only" | "admob_only";
export interface SocioAdConfig {
  adEveryN: number;
  mode: SocioAdMode;
}

export interface Post {
  id: string | number;
  userId?: string | number;
  userName?: string;
  userAvatar?: string;
  content?: string;
  imageUrl?: string;
  mediaUrls?: string[];
  postType?: string;
  likeCount: number;
  commentCount: number;
  shareCount?: number;
  isLiked?: boolean;
  isSaved?: boolean;
  isFollowing?: boolean;
  isSelf?: boolean;
  category?: string | null;
  linkedProducts?: LinkedProduct[];
  hideLikeCount?: boolean;
  commentPermission?: "everyone" | "followers" | "none";
  createdAt: string;
}

export interface LinkedProduct {
  id: string;
  name: string;
  image?: string | null;
  price?: string | number | null;
  vendorId?: string | null;
}

export interface SocioUserProfile {
  userId: string;
  userName: string;
  userAvatar: string | null;
  bio: string | null;
  displayName?: string;
  username?: string;
  website?: string | null;
  pronouns?: "he/him" | "she/her" | "they/them" | "prefer_not" | "";
  location?: string | null;
  category?: string | null;
  accountType?: "personal" | "creator" | "business";
  isPrivate?: boolean;
  postCount: number;
  followerCount: number;
  followingCount: number;
  isFollowing: boolean;
  isSelf: boolean;
}

export interface UpdateSocioProfileInput {
  displayName: string;
  username: string;
  bio: string;
  website: string;
  pronouns: "he/him" | "she/her" | "they/them" | "prefer_not" | "";
  location: string;
  category: string;
  accountType: "personal" | "creator" | "business";
  avatarUrl: string;
  isPrivate: boolean;
}

export interface ActivityNotification {
  id: string | number;
  type: string;
  actorId: string;
  actorName: string;
  actorAvatar: string | null;
  text: string;
  createdAt: string;
  postId?: string | number;
  reelId?: string | number;
  storyId?: string | number;
  targetUserId?: string | number;
  relatedThumbnail?: string | null;
  isRead?: boolean;
  isFollowing?: boolean;
  source?: "social" | "notification";
  canMarkRead?: boolean;
}

export interface Comment {
  id: number | string;
  postId: number | string;
  userId?: number | string;
  userName?: string;
  userAvatar?: string | null;
  content: string;
  parentCommentId?: number | string;
  createdAt: string;
}

export interface Conversation {
  id: string | number;
  participantId: string;
  participantName: string;
  participantAvatar?: string | null;
  lastMessage?: string | null;
  lastMessageAt?: string | null;
  unreadCount: number;
  isOnline?: boolean;
  isTyping?: boolean;
  isRequest?: boolean;
}

export interface SocialCall { id:string; conversation_id:string; caller_id:string; callee_id:string; call_type:'audio'|'video'; status:'ringing'|'accepted'|'rejected'|'ended'|'missed'; offer_sdp?:string|null; answer_sdp?:string|null; created_at:string; }
export interface DirectMessage {
  id: string | number;
  conversationId: string | number;
  senderId: string;
  senderName?: string;
  senderAvatar?: string | null;
  content?: string | null;
  mediaUrl?: string | null;
  mediaType?: "image" | "video" | null;
  status?: "sending" | "sent" | "delivered" | "read";
  createdAt: string;
  isMine?: boolean;
}

export interface SocialSettings {
  privateAccount?: boolean;
  showActivityStatus?: boolean;
  storyReplies?: string;
  messageAllowFrom?: string;
  commentsAllowFrom?: string;
  filterOffensiveComments?: boolean;
  notifications?: Record<string, boolean>;
  dailyTimeLimitMinutes?: number;
  dailyReminder?: boolean;
  language?: string;
  closeFriends?: string[];
  blockedUsers?: string[];
  privacy?: {
    profileVisibility?: "public" | "followers" | "private";
    allowCommentsFrom?: "everyone" | "followers" | "nobody";
    allowTags?: boolean;
    showActivityStatus?: boolean;
    hideLikeCounts?: boolean;
  };
  messaging?: {
    allowMessagesFrom?: "everyone" | "followers" | "nobody";
  };
  security?: {
    loginAlerts?: boolean;
    unusualActivityAlerts?: boolean;
    saveLoginInfo?: boolean;
  };
}

export interface UserSummary {
  id: string | number;
  userId?: string;
  name?: string;
  avatar?: string;
  avatarUrl?: string;
  userAvatar?: string;
  postCount?: number;
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
  expiresAt?: string;
  viewed?: boolean;
}

function unwrapApiList(raw: unknown): Record<string, unknown>[] {
  if (Array.isArray(raw)) {
    return raw.filter((row): row is Record<string, unknown> => Boolean(row) && typeof row === "object");
  }
  if (raw && typeof raw === "object") {
    const obj = raw as Record<string, unknown>;
    for (const key of ["data", "items", "conversations", "messages"]) {
      const value = obj[key];
      if (Array.isArray(value)) {
        return value.filter((row): row is Record<string, unknown> => Boolean(row) && typeof row === "object");
      }
    }
  }
  return [];
}

function mediaStrings(...values: unknown[]): string[] {
  const output:string[]=[]; const add=(value:unknown)=>{if(typeof value==="string"){const item=value.trim();if(!item)return;if(item.startsWith("[")){try{const parsed=JSON.parse(item);if(Array.isArray(parsed)){parsed.forEach(add);return;}}catch{}}output.push(item);}else if(Array.isArray(value))value.forEach(add);else if(value&&typeof value==="object"){const row=value as Record<string,unknown>;add(row.url??row.mediaUrl??row.media_url??row.imageUrl??row.image_url??row.path);}}; values.forEach(add); return Array.from(new Set(output));
}

function mapApiPost(row: Record<string, unknown>): Post {
  const author = row.author && typeof row.author === "object" ? row.author as Record<string,unknown> : row.user && typeof row.user === "object" ? row.user as Record<string,unknown> : {};
  const mediaUrls = mediaStrings(row.mediaUrls,row.media_urls,row.images,row.attachments,row.media,row.imageUrl,row.image_url);
  const firstImage = mediaUrls?.[0];
  const metadata =
    row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
      ? (row.metadata as Record<string, unknown>)
      : {};
  const linkedProductsRaw = Array.isArray(metadata.linkedProducts) ? metadata.linkedProducts : [];
  const rawAvatar =
    row.userAvatar ??
    row.user_avatar ??
    row.avatarUrl ??
    row.avatar_url ??
    row.avatar ??
    row.authorAvatar ??
    row.author_avatar ??
    row.authorAvatarUrl ??
    author.avatarUrl ?? author.avatar_url ?? author.avatar;
  return {
    id: (row.id ?? row.postId ?? row.post_id) as string | number ?? "",
    userId: (row.authorId ?? row.author_id ?? row.userId ?? row.user_id ?? author.id) as string | number | undefined,
    userName: (row.userName ?? row.user_name ?? row.username ?? row.authorName ?? row.author_name ?? row.fullName ?? row.name ?? author.name ?? author.username) as string | undefined,
    userAvatar: rawAvatar == null ? undefined : String(rawAvatar),
    content: (row.caption ?? row.contentText ?? row.content_text ?? row.content ?? row.body) as string | undefined,
    imageUrl: firstImage ?? undefined,
    mediaUrls: mediaUrls.length ? mediaUrls : undefined,
    postType: (row.postType ?? row.post_type) as string | undefined,
    likeCount: Number(row.likeCount ?? row.like_count ?? row.likesCount ?? row.likes_count) || 0,
    commentCount: Number(row.commentCount ?? row.comment_count ?? row.commentsCount ?? row.comments_count) || 0,
    shareCount: Number(row.shareCount ?? row.share_count ?? row.sharesCount ?? row.shares_count) || 0,
    isLiked: Boolean(row.isLiked ?? row.is_liked ?? row.liked),
    isSaved: Boolean(row.isSaved ?? row.is_saved ?? row.saved),
    isFollowing: Boolean(row.isFollowing ?? row.isFollowingAuthor ?? row.following),
    isSelf: Boolean(row.isSelf ?? row.self),
    category: typeof (row.category ?? metadata.category) === "string" ? String(row.category ?? metadata.category) : null,
    linkedProducts: linkedProductsRaw
      .map((item): LinkedProduct | null => {
        if (!item || typeof item !== "object") return null;
        const p = item as Record<string, unknown>;
        const id = p.id ?? p.productId;
        if (id == null) return null;
        return {
          id: String(id),
          name: String(p.name ?? p.title ?? "Product"),
          image: p.image == null ? null : String(p.image),
          price: (p.price as string | number | null | undefined) ?? null,
          vendorId: p.vendorId == null ? null : String(p.vendorId),
        } satisfies LinkedProduct;
      })
      .filter((item): item is LinkedProduct => Boolean(item)),
    hideLikeCount: Boolean(metadata.hideLikeCount),
    commentPermission:
      metadata.commentPermission === "followers" || metadata.commentPermission === "none"
        ? metadata.commentPermission
        : "everyone",
    createdAt: String(row.createdAt ?? row.created_at ?? ""),
  };
}

function mapApiSocioProfile(raw: unknown): SocioUserProfile {
  let row = raw && typeof raw === "object" && !Array.isArray(raw)
    ? raw as Record<string, unknown>
    : {};
  for (let depth = 0; depth < 4; depth += 1) {
    const nested = row.profile ?? row.user ?? row.data;
    if (!nested || typeof nested !== "object" || Array.isArray(nested) || nested === row) break;
    row = nested as Record<string, unknown>;
  }
  const displayName = firstString(row.displayName, row.display_name, row.userName, row.user_name, row.name);
  const username = firstString(row.username, row.userName, row.user_name);
  const rawPronouns = firstString(row.pronouns);
  const pronouns = ["he/him", "she/her", "they/them", "prefer_not"].includes(rawPronouns)
    ? rawPronouns as SocioUserProfile["pronouns"]
    : "";
  const rawAccountType = firstString(row.accountType, row.account_type);
  const accountType = ["personal", "creator", "business"].includes(rawAccountType)
    ? rawAccountType as NonNullable<SocioUserProfile["accountType"]>
    : "personal";
  return {
    userId: firstString(row.userId, row.user_id, row.id),
    userName: username || displayName || "user",
    userAvatar: firstString(row.userAvatar, row.user_avatar, row.avatarUrl, row.avatar_url, row.avatar) || null,
    displayName: displayName || username,
    username,
    bio: firstString(row.bio) || null,
    website: firstString(row.website) || null,
    pronouns,
    location: firstString(row.location) || null,
    category: firstString(row.category) || null,
    accountType,
    isPrivate: Boolean(row.isPrivate ?? row.is_private),
    postCount: Number(row.postCount ?? row.post_count) || 0,
    followerCount: Number(row.followerCount ?? row.follower_count) || 0,
    followingCount: Number(row.followingCount ?? row.following_count) || 0,
    isFollowing: Boolean(row.isFollowing ?? row.is_following),
    isSelf: Boolean(row.isSelf ?? row.is_self),
  };
}

function mapApiConversation(row: Record<string, unknown>): Conversation {
  const participant =
    row.participant && typeof row.participant === "object"
      ? (row.participant as Record<string, unknown>)
      : {};
  const lastMessage =
    row.lastMessage && typeof row.lastMessage === "object"
      ? (row.lastMessage as Record<string, unknown>)
      : {};
  return {
    id: (row.id as string | number) ?? "",
    participantId: String(row.participantId ?? row.participant_id ?? participant.userId ?? participant.user_id ?? participant.id ?? ""),
    participantName: String(row.participantName ?? row.participant_name ?? participant.userName ?? participant.user_name ?? participant.username ?? participant.name ?? "user"),
    participantAvatar: (row.participantAvatar ?? row.participant_avatar ?? participant.userAvatar ?? participant.user_avatar ?? participant.profilePicture ?? participant.profile_picture ?? participant.avatar ?? null) as string | null,
    lastMessage: (row.lastMessageText ?? row.last_message_text ?? lastMessage.content ?? lastMessage.contentText ?? lastMessage.content_text ?? lastMessage.mediaType ?? lastMessage.media_type ?? "") as string,
    lastMessageAt: String(row.lastMessageAt ?? row.last_message_at ?? lastMessage.createdAt ?? lastMessage.created_at ?? row.updatedAt ?? row.updated_at ?? ""),
    unreadCount: Number(row.unreadCount ?? row.unread_count) || 0,
    isOnline: Boolean(row.isOnline ?? row.is_online ?? participant.isOnline ?? participant.is_online),
    isTyping: Boolean(row.isTyping ?? row.is_typing),
    isRequest: Boolean(row.isRequest ?? row.is_request),
  };
}

function mapApiDirectMessage(row: Record<string, unknown>): DirectMessage {
  return {
    id: (row.id as string | number) ?? "",
    conversationId: ((row.conversationId ?? row.conversation_id) as string | number | undefined) ?? "",
    senderId: String(row.senderId ?? row.sender_id ?? row.authorId ?? row.author_id ?? row.userId ?? row.user_id ?? ""),
    senderName: String(row.senderName ?? row.sender_name ?? row.userName ?? row.user_name ?? row.username ?? ""),
    senderAvatar: (row.senderAvatar ?? row.sender_avatar ?? row.userAvatar ?? row.user_avatar ?? row.profilePicture ?? row.profile_picture ?? null) as string | null,
    content: (row.content ?? row.contentText ?? row.content_text ?? row.text ?? row.body ?? null) as string | null,
    mediaUrl: (row.mediaUrl ?? row.media_url ?? null) as string | null,
    mediaType: (row.mediaType ?? row.media_type ?? null) as "image" | "video" | null,
    status: (row.status ?? "sent") as DirectMessage["status"],
    createdAt: String(row.createdAt ?? row.created_at ?? new Date().toISOString()),
    isMine: Boolean(row.isMine ?? row.is_mine ?? row.mine),
  };
}

function mapApiComment(row: Record<string, unknown>): Comment {
  return {
    id: (row.id as string | number) ?? "",
    postId: (row.postId as string | number) ?? (row.post_id as string | number) ?? "",
    userId: (row.userId ?? row.user_id ?? row.authorId ?? row.author_id) as string | number | undefined,
    userName: (row.userName ?? row.user_name ?? row.username ?? row.authorName ?? row.author_name ?? row.fullName ?? row.name) as string | undefined,
    userAvatar:
      row.userAvatar != null
        ? String(row.userAvatar)
        : row.avatarUrl != null
          ? String(row.avatarUrl)
          : row.avatar != null
            ? String(row.avatar)
            : null,
    content: String(row.contentText ?? row.content_text ?? row.content ?? row.body ?? ""),
    parentCommentId: (row.parentCommentId ?? row.parent_comment_id) as string | number | undefined,
    createdAt: String(row.createdAt ?? row.created_at ?? ""),
  };
}

function firstString(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number") return String(value);
  }
  return "";
}

function readNotificationMetadata(row: Record<string, unknown>): Record<string, unknown> {
  const metadata = row.metadata;
  if (metadata && typeof metadata === "object" && !Array.isArray(metadata)) {
    return metadata as Record<string, unknown>;
  }
  return {};
}

function notificationMessage(type: string, title: string, body: string): string {
  if (body) return body;
  if (title) return title;
  const normalized = type.toLowerCase();
  if (normalized.includes("comment")) return "commented on your post";
  if (normalized.includes("follow")) return "started following you";
  if (normalized.includes("mention") || normalized.includes("tag")) return "mentioned you";
  if (normalized.includes("reply")) return "replied to your comment";
  if (normalized.includes("story")) return "interacted with your story";
  if (normalized.includes("like")) return "liked your post";
  return "sent you a notification";
}

function mapApiNotification(row: Record<string, unknown>, source: "social" | "notification"): ActivityNotification {
  const metadata = readNotificationMetadata(row);
  const type = firstString(row.type, metadata.type, metadata.notificationType, metadata.eventType, row.title).toLowerCase() || "notification";
  const actorId = firstString(
    row.actorId,
    metadata.actorId,
    metadata.actorUserId,
    metadata.fromUserId,
    metadata.senderId,
    metadata.userId,
    row.targetUserId,
  );
  const actorName = firstString(
    row.actorName,
    metadata.actorName,
    metadata.actorUsername,
    metadata.fromUserName,
    metadata.senderName,
    metadata.username,
    row.title,
    "Someone",
  );
  const actorAvatar = firstString(
    row.actorAvatar,
    metadata.actorAvatar,
    metadata.actorProfilePicture,
    metadata.fromUserAvatar,
    metadata.senderAvatar,
    metadata.profilePicture,
    metadata.avatarUrl,
  );
  const title = firstString(row.title);
  const body = firstString(row.text, row.body, metadata.text, metadata.message, metadata.body);
  const createdAt = firstString(row.createdAt, metadata.createdAt) || new Date().toISOString();
  const status = firstString(row.status).toLowerCase();
  const readFlag = row.isRead ?? metadata.isRead;

  return {
    id: row.id as string | number,
    type,
    actorId,
    actorName,
    actorAvatar: actorAvatar || null,
    text: notificationMessage(type, title, body),
    createdAt,
    postId: firstString(row.postId, metadata.postId, metadata.targetPostId, metadata.entityId) || undefined,
    reelId: firstString(row.reelId, metadata.reelId) || undefined,
    storyId: firstString(row.storyId, metadata.storyId) || undefined,
    targetUserId: firstString(row.targetUserId, metadata.targetUserId, metadata.profileUserId) || undefined,
    relatedThumbnail:
      firstString(
        row.relatedThumbnail,
        row.postThumbnail,
        row.thumbnailUrl,
        metadata.relatedThumbnail,
        metadata.postThumbnail,
        metadata.thumbnailUrl,
        metadata.mediaUrl,
        metadata.imageUrl,
      ) || null,
    isRead: typeof readFlag === "boolean" ? readFlag : status === "read",
    isFollowing:
      typeof row.isFollowing === "boolean"
        ? row.isFollowing
        : typeof metadata.isFollowing === "boolean"
          ? metadata.isFollowing
          : undefined,
    source,
    canMarkRead: source === "notification",
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

  /** Active social advertisements to interleave into the feed as sponsored cards. */
  getSocioAds(params?: { limit?: number }): Promise<SponsoredAd[]> {
    return apiClient
      .get<unknown>(`${BASE}/feed/ads`, params as Record<string, string | number | boolean>)
      .then((raw) => {
        const arr = Array.isArray(raw)
          ? raw
          : raw && typeof raw === "object" && Array.isArray((raw as { data?: unknown }).data)
            ? (raw as { data: unknown[] }).data
            : [];
        return (arr as SponsoredAd[]).filter((a) => a && typeof a === "object");
      })
      .catch(() => []);
  },

  getSocioAdConfig(): Promise<SocioAdConfig> {
    return apiClient
      .get<Partial<SocioAdConfig>>(`${BASE}/feed/ad-config`)
      .then((raw) => ({
        adEveryN: Math.max(1, Math.min(100, Math.trunc(Number(raw.adEveryN) || 5))),
        mode: ["prefer_admin_then_admob", "alternate", "admin_only", "admob_only"].includes(String(raw.mode))
          ? raw.mode as SocioAdMode
          : "prefer_admin_then_admob",
      }))
      .catch(() => ({ adEveryN: 5, mode: "prefer_admin_then_admob" }));
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
    category?: string;
    linkedProducts?: LinkedProduct[];
    hideLikeCount?: boolean;
    commentPermission?: "everyone" | "followers" | "none";
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
        category: data.category,
        linkedProducts: data.linkedProducts,
        hideLikeCount: data.hideLikeCount,
        commentPermission: data.commentPermission,
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
    return apiClient.post<void>(`${BASE}/posts/${postId}/like`).then((result) => {
      apiClient.clearGetCache(`${BASE}/notifications/me`);
      apiClient.clearGetCache("/api/v1/notifications/me");
      return result;
    });
  },

  unlikePost(postId: string | number) {
    return apiClient.delete<void>(`${BASE}/posts/${postId}/like`).then((result) => {
      apiClient.clearGetCache(`${BASE}/notifications/me`);
      apiClient.clearGetCache("/api/v1/notifications/me");
      return result;
    });
  },

  sharePost(postId: string | number) {
    return apiClient.post<{ postId: string; sharedBy: string }>(`${BASE}/posts/${postId}/share`);
  },

  /** Creates a real repost on the caller's feed (not just an external share). */
  repostPost(postId: string | number, caption?: string) {
    return apiClient
      .post<Record<string, unknown>>(`${BASE}/posts/${postId}/repost`, {
        ...(caption ? { caption } : {}),
      })
      .then(mapApiPost);
  },

  savePost(postId: string | number) {
    return apiClient.post<void>(`${BASE}/posts/${postId}/save`).then((result) => {
      apiClient.clearGetCache(`${BASE}/posts/saved`);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("p4u:socio-save-changed", { detail: { postId: String(postId), saved: true } }));
      }
      return result;
    });
  },

  unsavePost(postId: string | number) {
    return apiClient.delete<void>(`${BASE}/posts/${postId}/save`).then((result) => {
      apiClient.clearGetCache(`${BASE}/posts/saved`);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("p4u:socio-save-changed", { detail: { postId: String(postId), saved: false } }));
      }
      return result;
    });
  },

  getSavedPosts(params?: { limit?: number; offset?: number }) {
    return apiClient
      .get<unknown>(`${BASE}/posts/saved`, params as Record<string, string | number | boolean>, { forceRefresh: true, cacheTtlMs: 0 })
      .then((raw) => ensurePostFeedResult(raw, params));
  },

  getMyProfile() {
    return apiClient.get<unknown>(`${BASE}/users/me/profile`).then(mapApiSocioProfile);
  },

  getUserProfile(userId: string) {
    return apiClient.get<unknown>(`${BASE}/users/${userId}/profile`).then(mapApiSocioProfile);
  },

  updateMyProfile(data: UpdateSocioProfileInput) {
    return apiClient
      .patch<unknown>(`${BASE}/users/me/profile`, data)
      .then((raw) => {
        apiClient.clearGetCache(`${BASE}/users/`);
        return mapApiSocioProfile(raw);
      });
  },

  getUserPosts(userId: string, params?: { limit?: number; offset?: number }) {
    return apiClient
      .get<unknown>(`${BASE}/users/${userId}/posts`, params as Record<string, string | number | boolean>)
      .then((raw) => ensurePostFeedResult(raw, params));
  },

  async getNotifications(params?: { limit?: number; offset?: number }) {
    const query = params as Record<string, string | number | boolean> | undefined;
    const [persisted, social] = await Promise.allSettled([
      apiClient.get<unknown>("/api/v1/notifications/me", query, { forceRefresh: true, cacheTtlMs: 0 }),
      apiClient.get<unknown>(`${BASE}/notifications/me`, query, { forceRefresh: true, cacheTtlMs: 0 }),
    ]);

    const readRows = (raw: unknown, source: "social" | "notification") => {
      const rows =
        Array.isArray(raw)
          ? raw
          : raw && typeof raw === "object" && "data" in raw && Array.isArray((raw as { data?: unknown[] }).data)
            ? ((raw as { data?: unknown[] }).data ?? [])
            : [];
      return rows
        .filter((row): row is Record<string, unknown> => Boolean(row) && typeof row === "object")
        .map((row) => mapApiNotification(row, source));
    };

    const persistedItems = persisted.status === "fulfilled" ? readRows(persisted.value, "notification") : [];
    const socialItems = social.status === "fulfilled" ? readRows(social.value, "social") : [];

    if (social.status === "rejected" && persisted.status === "rejected") {
      const socialMessage = social.reason instanceof Error ? social.reason.message : String(social.reason ?? "");
      const persistedMessage = persisted.reason instanceof Error ? persisted.reason.message : String(persisted.reason ?? "");
      throw new Error(socialMessage || persistedMessage || "Unable to load notifications.");
    }

    if (social.status === "rejected" && persistedItems.length === 0) {
      const message = social.reason instanceof Error ? social.reason.message : String(social.reason ?? "");
      throw new Error(message || "Unable to load activity notifications.");
    }

    const items = [
      ...persistedItems,
      ...socialItems,
    ];
    const seen = new Set<string>();
    return items
      .filter((item) => {
        const key = `${item.source}-${String(item.id)}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  markNotificationRead(notificationId: string | number) {
    return apiClient.post<ActivityNotification>(`/api/v1/notifications/me/${notificationId}/read`);
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
      .then((row) => {
        apiClient.clearGetCache(`${BASE}/posts/${postId}/comments`);
        apiClient.clearGetCache(`${BASE}/feed`);
        apiClient.clearGetCache(`${BASE}/notifications/me`);
        apiClient.clearGetCache("/api/v1/notifications/me");
        return mapApiComment(row);
      });
  },

  reportContent(data: { targetType: "post" | "comment"; targetId: string | number; reason: string; details?: string }) {
    return apiClient.post(`${BASE}/reports`, {
      targetType: data.targetType,
      targetId: String(data.targetId),
      reason: data.reason,
      details: data.details?.trim() || undefined,
    });
  },

  getConversations(params?: { q?: string; limit?: number; offset?: number }) {
    return apiClient
      .get<unknown>(`${BASE}/messages/conversations`, params as Record<string, string | number | boolean> | undefined, { forceRefresh: true, cacheTtlMs: 0 })
      .then((raw) => unwrapApiList(raw).map((row) => mapApiConversation(row)));
  },

  openConversation(participantId: string | number) {
    return apiClient
      .post<Record<string, unknown>>(`${BASE}/messages/conversations`, { participantId })
      .then((row) => {
        apiClient.clearGetCache(`${BASE}/messages/conversations`);
        return mapApiConversation(row);
      });
  },

  getMessages(conversationId: string | number, params?: { limit?: number; before?: string | number }) {
    return apiClient
      .get<unknown>(`${BASE}/messages/conversations/${conversationId}/messages`, params as Record<string, string | number | boolean> | undefined, { forceRefresh: true, cacheTtlMs: 0 })
      .then((raw) => unwrapApiList(raw).map((row) => mapApiDirectMessage(row)));
  },

  sendMessage(conversationId: string | number, data: { content?: string; mediaUrl?: string; mediaType?: "image" | "video" }) {
    return apiClient
      .post<Record<string, unknown>>(`${BASE}/messages/conversations/${conversationId}/messages`, data)
      .then((row) => {
        apiClient.clearGetCache(`${BASE}/messages/conversations`);
        apiClient.clearGetCache(`${BASE}/messages/conversations/${conversationId}/messages`);
        return mapApiDirectMessage(row);
      });
  },

  markConversationRead(conversationId: string | number) {
    return apiClient.post<void>(`${BASE}/messages/conversations/${conversationId}/read`).then((result) => {
      apiClient.clearGetCache(`${BASE}/messages/conversations`);
      return result;
    });
  },

  sendTyping(conversationId: string | number, isTyping: boolean) {
    return apiClient.post<void>(`${BASE}/messages/conversations/${conversationId}/typing`, { isTyping });
  },

  followUser(userId: string | number) {
    return apiClient.post<void>(`${BASE}/users/${userId}/follow`).then((result) => {
      apiClient.clearGetCache(`${BASE}/users/`);
      apiClient.clearGetCache(`${BASE}/feed`);
      apiClient.clearGetCache(`${BASE}/feed/public`);
      apiClient.clearGetCache(`${BASE}/users/suggestions`);
      apiClient.clearGetCache(`${BASE}/notifications/me`);
      apiClient.clearGetCache("/api/v1/notifications/me");
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("p4u:socio-follow-changed", { detail: { userId: String(userId), isFollowing: true, delta: 1 } }));
      }
      return result;
    });
  },

  unfollowUser(userId: string | number) {
    return apiClient.delete<void>(`${BASE}/users/${userId}/follow`).then((result) => {
      apiClient.clearGetCache(`${BASE}/users/`);
      apiClient.clearGetCache(`${BASE}/feed`);
      apiClient.clearGetCache(`${BASE}/feed/public`);
      apiClient.clearGetCache(`${BASE}/users/suggestions`);
      apiClient.clearGetCache(`${BASE}/notifications/me`);
      apiClient.clearGetCache("/api/v1/notifications/me");
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("p4u:socio-follow-changed", { detail: { userId: String(userId), isFollowing: false, delta: -1 } }));
      }
      return result;
    });
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
    return apiClient
      .get<UserSummary[] | { data?: UserSummary[] }>(
        `${BASE}/users/suggestions`,
        params as Record<string, string | number | boolean> | undefined,
      )
      .then((raw) => {
        if (Array.isArray(raw)) return raw;
        if (raw && typeof raw === "object" && "data" in raw) {
          return (raw as { data: UserSummary[] }).data ?? [];
        }
        return [];
      });
  },

  getStoryFeed() {
    return apiClient.get<unknown[]>(`${BASE}/stories/feed`, undefined, { forceRefresh: true, cacheTtlMs: 0 }).then((rows) =>
      (Array.isArray(rows) ? rows : []).map(
        (r) =>
          ({
            id: (r as Record<string, unknown>).id,
            userId: (r as Record<string, unknown>).authorId ?? (r as Record<string, unknown>).userId,
            userName: (r as Record<string, unknown>).userName,
            userAvatar: (r as Record<string, unknown>).userAvatar,
            mediaUrl: String((r as Record<string, unknown>).mediaUrl ?? ""),
            mediaType: String((r as Record<string, unknown>).mediaType ?? "image"),
            viewCount: Number((r as Record<string, unknown>).viewCount) || 0,
            createdAt: String((r as Record<string, unknown>).createdAt ?? ""),
            expiresAt: String((r as Record<string, unknown>).expiresAt ?? ""),
            viewed: Boolean((r as Record<string, unknown>).viewed ?? (r as Record<string, unknown>).isViewed),
          }) as Story,
      ),
    );
  },

  getMyStories() {
    return apiClient.get<unknown[]>(`${BASE}/stories/me`, undefined, { forceRefresh: true, cacheTtlMs: 0 }).then((rows) =>
      (Array.isArray(rows) ? rows : []).map(
        (r) =>
          ({
            id: (r as Record<string, unknown>).id,
            mediaUrl: String((r as Record<string, unknown>).mediaUrl ?? ""),
            mediaType: String((r as Record<string, unknown>).mediaType ?? "image"),
            viewCount: Number((r as Record<string, unknown>).viewCount) || 0,
            createdAt: String((r as Record<string, unknown>).createdAt ?? ""),
            expiresAt: String((r as Record<string, unknown>).expiresAt ?? ""),
            viewed: Boolean((r as Record<string, unknown>).viewed ?? (r as Record<string, unknown>).isViewed),
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

  deleteStory(storyId: string | number) {
    return apiClient.delete<void>(`${BASE}/stories/${storyId}`);
  },

  getMySettings() {
    return apiClient.get<SocialSettings>(`${BASE}/users/me/settings`, undefined, { forceRefresh: true, cacheTtlMs: 0 });
  },

  updateMySettings(data: Partial<SocialSettings>) {
    return apiClient.patch<SocialSettings>(`${BASE}/users/me/settings`, data).then((result) => {
      apiClient.clearGetCache(`${BASE}/users/me/settings`);
      return result;
    });
  },
  listCalls(){return apiClient.get<SocialCall[]>(`${BASE}/calls`,undefined,{forceRefresh:true,cacheTtlMs:0});},
  getCall(id:string){return apiClient.get<SocialCall>(`${BASE}/calls/${encodeURIComponent(id)}`,undefined,{forceRefresh:true,cacheTtlMs:0});},
  startCall(conversationId:string,type:'audio'|'video',offerSdp?:string,idempotencyKey=crypto.randomUUID()){return apiClient.post<SocialCall>(`${BASE}/calls`,{conversationId,type,offerSdp,idempotencyKey});},
  acceptCall(id:string,answerSdp?:string){return apiClient.post<SocialCall>(`${BASE}/calls/${encodeURIComponent(id)}/accept`,{answerSdp});},
  rejectCall(id:string){return apiClient.post<SocialCall>(`${BASE}/calls/${encodeURIComponent(id)}/reject`,{});},
  endCall(id:string){return apiClient.post<SocialCall>(`${BASE}/calls/${encodeURIComponent(id)}/end`,{});},
  sendCallSignal(id:string,type:string,payload:Record<string,unknown>){return apiClient.post(`${BASE}/calls/${encodeURIComponent(id)}/signals`,{type,payload});},
  callSignals(id:string,since=0){return apiClient.get<Record<string,unknown>[]>(`${BASE}/calls/${encodeURIComponent(id)}/signals`,{since}, {forceRefresh:true,cacheTtlMs:0});},};
