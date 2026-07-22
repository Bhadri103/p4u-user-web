import { useState, useRef, useEffect, useCallback, createContext, useContext, Fragment } from "react";
import {
  Heart, MessageCircle, Send, Bookmark, MoreHorizontal,
  Search, X, PlusCircle, Phone, Video, Info, Image as ImageIcon,
  Smile, ArrowLeft, Volume2, VolumeX,
  ChevronRight, ChevronLeft, ChevronDown, Camera, Lock, Users, Eye, Crop, Type, RotateCcw,
  Bell, Archive, Activity, Globe, Clock, Star, FileText,
  MessageSquare, Tag, Share2, UserPlus, ThumbsUp,
  ThumbsDown, UserX, Check, Edit3, Home, Compass, Film, Settings,
  User, Menu, Grid, Play, Pause, Layers, Loader2, Trash2, Mic,
  Shield, HelpCircle, Moon, LogOut, Flag, Mail, Smartphone, MapPin
} from "lucide-react";
import { socialApi, type ActivityNotification, type Conversation, type DirectMessage, type LinkedProduct, type Post, type SocioUserProfile, type SponsoredAd, type SocialCall, type Story, type UserSummary } from "@/lib/api/social";
import { apiClient } from "@/lib/api/client";
import { profileApi } from "@/lib/api/profile";
import { catalogApi, type Product } from "@/lib/api/catalog";
import { resolveMediaUrl } from "@/lib/media";
import { DEFAULT_NOTIFICATION_SETTINGS, useSocialSettings } from "@/lib/hooks/useSocialSettings";
import { clearUserAuthStorage } from "@/lib/authSession";
import { useRouter } from "next/navigation";
import type { SocioAdConfig } from "@/lib/api/social";

const TEAL = "linear-gradient(135deg, #009999, #007777)";
const TEAL_SOLID = "#009999";

const FILTER_CSS: Record<string, string> = {
  Normal:    "none",
  Clarendon: "contrast(1.2) saturate(1.35)",
  Gingham:   "brightness(1.05) hue-rotate(-10deg)",
  Moon:      "grayscale(1) contrast(1.1)",
  Lark:      "contrast(0.9) brightness(1.1) saturate(1.2)",
  Reyes:     "sepia(0.22) contrast(0.85) brightness(1.1) saturate(0.75)",
  Juno:      "sepia(0.35) contrast(1.15) brightness(1.15) saturate(1.8)",
  Slumber:   "saturate(0.66) brightness(1.05)",
  Crema:     "contrast(1.04) saturate(0.85) brightness(1.15) sepia(0.08)",
  Ludwig:    "contrast(1.05) brightness(1.05) saturate(1.1)",
};
const FILTER_NAMES = Object.keys(FILTER_CSS);
const POST_CATEGORIES = ["Lifestyle", "Shopping", "Services", "Classifieds", "Food", "Travel", "Education", "Business", "Community"];

// â”€â”€ TYPES for local UI state â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
interface StorySegment { id: number | string; mediaUrl: string; mediaType: string; createdAt: string; viewCount: number; viewed?: boolean }
interface StoryItem { id: number | string; userId?: string; mine: boolean; label: string; avatar: string | null; segments: StorySegment[]; viewed: boolean }
interface PostItem { id: number | string; userId: string; user: string; co: string; avatarA: string; avatarB: string | null; location: string; time: string; image: string; mediaUrls?: string[]; postType?: string; likes: number; comments: number; shares: number; caption: string; hashtags: string; isLiked?: boolean; isSaved?: boolean; isFollowing?: boolean; isSelf?: boolean; category?: string | null; linkedProducts?: LinkedProduct[]; hideLikeCount?: boolean; commentPermission?: "everyone" | "followers" | "none" }
interface ContactItem { id: number; name: string; avatar: string; lastMsg: string; time: string; unread: boolean }
interface NotificationItem { id: string | number; userId: string; group: string; user: string; text: string; time: string; avatar: string; action: string; type: string; createdAt: string; postId?: string | number; reelId?: string | number; storyId?: string | number; relatedThumbnail?: string | null; isRead: boolean; isFollowing?: boolean; canMarkRead?: boolean }
interface SearchItem { id: number; userId?: string; name: string; sub: string; avatar: string; verified: boolean }
interface SuggestionItem { id: string | number; userId: string; name: string; sub: string; avatar: string }
interface UserProfileData { userId: string; name: string; username: string; bio: string; website: string; posts: number; followers: number; following: number; avatar: string; images: ProfileGridMedia[]; reels: ReelItem[]; verified: boolean; isSelf: boolean; isFollowing: boolean }
interface ExplorePostItem { id: number | string; image: string; likes: number; comments: number; type: "image" | "video"; reel?: ReelItem; category?: string | null }
interface ReelItem { id: number | string; postId: string | number; userId: string; username: string; caption: string; video: string; likes: number; comments: number; shares: number; avatar: string; user: string; isLiked?: boolean; isSaved?: boolean; isFollowing?: boolean; isSelf?: boolean; createdAt?: string; views?: number; audio?: string }
interface ProfileGridMedia { id: string | number; url: string; type: "image" | "video" }

function firstAlphabet(name?: string | null): string {
  const trimmed = (name || "U").trim();
  return (trimmed[0] || "U").toUpperCase();
}

function AvatarCircle({
  src,
  name,
  size = "md",
  className = "",
}: {
  src?: string | null;
  name?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const sizeClass = size === "lg" ? "w-12 h-12 text-base" : size === "sm" ? "w-8 h-8 text-xs" : "w-10 h-10 text-sm";
  const resolved = src?.trim() ? resolveMediaUrl(src.trim()) || src.trim() : "";
  if (resolved) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={resolved} alt={name || "user"} className={`${sizeClass} rounded-full object-cover ${className}`} />
    );
  }
  return (
    <div className={`${sizeClass} rounded-full border-2 border-orange-400 bg-white flex items-center justify-center font-bold text-slate-950 ${className}`}>
      {firstAlphabet(name)}
    </div>
  );
}

/** Map an API Post to the shape our PostCard expects */
function mapApiPostToPostItem(p: { id: string | number; userId?: string | number; userName?: string; userAvatar?: string; content?: string; imageUrl?: string; mediaUrls?: string[]; postType?: string; likeCount: number; commentCount: number; shareCount?: number; isLiked?: boolean; isSaved?: boolean; isFollowing?: boolean; isSelf?: boolean; category?: string | null; linkedProducts?: LinkedProduct[]; hideLikeCount?: boolean; commentPermission?: "everyone" | "followers" | "none"; createdAt: string }): PostItem {
  const mediaUrls = (p.mediaUrls ?? []).map((u) => (u.trim() ? resolveMediaUrl(u.trim()) || u : "")).filter(Boolean);
  return {
    id: p.id,
    userId: String(p.userId ?? ""),
    user: p.userName ?? "unknown",
    co: "",
    avatarA: (() => {
      const u = p.userAvatar ?? "";
      return u.trim() ? resolveMediaUrl(u.trim()) || u : "";
    })(),
    avatarB: null,
    location: "",
    time: p.createdAt ? new Date(p.createdAt).toLocaleDateString() : "",
    image: (() => {
      const u = p.imageUrl ?? "";
      return u.trim() ? resolveMediaUrl(u.trim()) || u : mediaUrls[0] ?? "";
    })(),
    mediaUrls,
    postType: p.postType,
    likes: p.likeCount,
    comments: p.commentCount,
    shares: p.shareCount ?? 0,
    isLiked: p.isLiked ?? false,
    isSaved: p.isSaved ?? false,
    isFollowing: p.isFollowing ?? false,
    isSelf: p.isSelf ?? false,
    category: p.category ?? null,
    linkedProducts: p.linkedProducts ?? [],
    hideLikeCount: p.hideLikeCount ?? false,
    commentPermission: p.commentPermission ?? "everyone",
    caption: p.content ?? "",
    hashtags: "",
  };
}

function isStoryExpired(s: Pick<Story, "createdAt" | "expiresAt">): boolean {
  const expiresAt = s.expiresAt ? new Date(s.expiresAt).getTime() : NaN;
  if (!Number.isNaN(expiresAt)) return expiresAt <= Date.now();
  const createdAt = new Date(s.createdAt).getTime();
  return !Number.isNaN(createdAt) && Date.now() - createdAt >= 24 * 60 * 60 * 1000;
}

function isVideoStory(segment: Pick<StorySegment, "mediaType" | "mediaUrl">): boolean {
  return segment.mediaType === "video" || /\.(mp4|webm|mov|m4v)(\?|$)/i.test(segment.mediaUrl);
}

function mapStorySegment(s: Story): StorySegment | null {
  const mediaUrl = s.mediaUrl?.trim() ? resolveMediaUrl(s.mediaUrl.trim()) || s.mediaUrl.trim() : "";
  if (!mediaUrl || isStoryExpired(s)) return null;
  return {
    id: s.id,
    mediaUrl,
    mediaType: isVideoStory({ mediaType: s.mediaType, mediaUrl }) ? "video" : "image",
    createdAt: s.createdAt,
    viewCount: s.viewCount || 0,
    viewed: Boolean(s.viewed),
  };
}

function buildStoryItems(
  myStories: Story[],
  feedStories: Story[],
  me?: SocioUserProfile | null,
): StoryItem[] {
  const myUserId = me?.userId ? String(me.userId) : "";
  const myAvatarRaw = me?.userAvatar ?? "";
  const myAvatar = myAvatarRaw.trim() ? resolveMediaUrl(myAvatarRaw.trim()) || myAvatarRaw : null;
  const mySegments = myStories
    .map(mapStorySegment)
    .filter((segment): segment is StorySegment => Boolean(segment))
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  const items: StoryItem[] = [{
    id: "my",
    userId: myUserId,
    mine: true,
    label: "Your Story",
    avatar: myAvatar,
    segments: mySegments,
    viewed: mySegments.length > 0 && mySegments.every((segment) => segment.viewed),
  }];

  const grouped = new Map<string, StoryItem>();
  feedStories.forEach((story) => {
    const userId = String(story.userId ?? story.userName ?? story.id);
    if (myUserId && userId === myUserId) return;
    const segment = mapStorySegment(story);
    if (!segment) return;
    const existing = grouped.get(userId);
    if (existing) {
      existing.segments.push(segment);
      existing.viewed = existing.segments.every((row) => row.viewed);
      return;
    }
    const avatarRaw = story.userAvatar ?? "";
    grouped.set(userId, {
      id: userId,
      userId,
      mine: false,
      label: story.userName ?? "user",
      avatar: avatarRaw.trim() ? resolveMediaUrl(avatarRaw.trim()) || avatarRaw : null,
      segments: [segment],
      viewed: Boolean(segment.viewed),
    });
  });

  grouped.forEach((item) => {
    item.segments.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    item.viewed = item.segments.every((segment) => segment.viewed);
    items.push(item);
  });

  return items;
}

/** Map an API UserSummary to suggestion shape */
function mapApiSuggestion(u: { id?: string | number; userId?: string; name?: string; avatar?: string; avatarUrl?: string; userAvatar?: string }): SuggestionItem {
  const uid = String(u.userId ?? u.id ?? "");
  return { id: uid, userId: uid, name: u.name ?? "user", sub: "Suggested for you", avatar: (() => { const a = u.userAvatar ?? u.avatarUrl ?? u.avatar ?? ""; return a.trim() ? resolveMediaUrl(a.trim()) || a : ""; })() };
}

function formatRelativeTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${Math.max(mins, 1)}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d`;
  return d.toLocaleDateString();
}

function notificationGroup(iso: string): string {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const days = Math.floor(diff / 86400000);
  if (days < 7) return "This Week";
  return "Earlier";
}

const VIDEO_EXT_RE = /\.(mp4|webm|mov|m4v)(\?|$)/i;

function isVideoUrl(url?: string | null): boolean {
  return Boolean(url && VIDEO_EXT_RE.test(url));
}

function isVideoPost(p: { postType?: string; imageUrl?: string; mediaUrls?: string[] }): boolean {
  if (p.postType === "video") return true;
  const urls = [...(p.mediaUrls ?? []), p.imageUrl].filter(Boolean) as string[];
  return urls.some(isVideoUrl);
}

// â”€â”€ UTILS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function postToProfileGridMedia(p: { id: string | number; imageUrl?: string; mediaUrls?: string[]; postType?: string }): ProfileGridMedia | null {
  const urls = [...(p.mediaUrls ?? []), p.imageUrl].filter(Boolean) as string[];
  const type = isVideoPost({ postType: p.postType, imageUrl: p.imageUrl, mediaUrls: p.mediaUrls }) ? "video" : "image";
  const raw = (type === "video" ? urls.find(isVideoUrl) : null) || urls[0] || "";
  const url = raw.trim() ? resolveMediaUrl(raw.trim()) || raw : "";
  if (!url) return null;
  return {
    id: p.id,
    url,
    type,
  };
}

function postToReelItem(p: { id: string | number; userId?: string | number; userName?: string; userAvatar?: string; content?: string; imageUrl?: string; mediaUrls?: string[]; postType?: string; likeCount: number; commentCount: number; shareCount?: number; isLiked?: boolean; isSaved?: boolean; isFollowing?: boolean; isSelf?: boolean; createdAt?: string }, index = 0): ReelItem | null {
  if (!isVideoPost({ postType: p.postType, imageUrl: p.imageUrl, mediaUrls: p.mediaUrls })) return null;
  const videoRaw = p.mediaUrls?.find(isVideoUrl) ?? p.mediaUrls?.[0] ?? p.imageUrl ?? "";
  const video = videoRaw.trim() ? resolveMediaUrl(videoRaw.trim()) || videoRaw : "";
  if (!video) return null;
  const avatarRaw = p.userAvatar ?? "";
  return {
    id: p.id ?? index,
    postId: p.id,
    userId: String(p.userId ?? ""),
    username: p.userName ?? "user",
    user: p.userName ?? "user",
    caption: p.content ?? "",
    video,
    likes: p.likeCount,
    comments: p.commentCount,
    shares: p.shareCount ?? 0,
    avatar: avatarRaw.trim() ? resolveMediaUrl(avatarRaw.trim()) || avatarRaw : "",
    isLiked: p.isLiked,
    isSaved: p.isSaved,
    isFollowing: p.isFollowing,
    isSelf: p.isSelf,
    createdAt: p.createdAt,
    audio: "Original audio",
  };
}

function ProfileMediaModal({ media, onClose }: { media: ProfileGridMedia; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center px-4" onClick={onClose}>
      {media.type === "video" ? (
        <video
          src={media.url}
          className="max-w-lg w-full max-h-[80vh] rounded-2xl object-contain bg-black"
          controls
          autoPlay
          playsInline
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <img
          src={media.url}
          alt=""
          className="max-w-lg w-full max-h-[80vh] rounded-2xl object-cover"
          onClick={(e) => e.stopPropagation()}
        />
      )}
      <button onClick={onClose} className="absolute top-4 right-4 bg-white/20 rounded-full p-2">
        <X className="w-5 h-5 text-white" />
      </button>
    </div>
  );
}

function ProfileReelsViewer({ reels, initialIndex, onClose, onUserClick }: { reels: ReelItem[]; initialIndex: number; onClose: () => void; onUserClick: (userId: string) => void }) {
  const [globalMuted, setGlobalMuted] = useState(true);
  const scrollerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const child = scroller.children[Math.max(0, Math.min(initialIndex, reels.length - 1))] as HTMLElement | undefined;
    child?.scrollIntoView({ block: "start" });
  }, [initialIndex, reels.length]);

  if (reels.length === 0) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black">
      <button onClick={onClose} className="absolute right-4 top-4 z-30 rounded-full bg-black/40 p-2 text-white">
        <X className="h-6 w-6" />
      </button>
      <div ref={scrollerRef} className="h-full snap-y snap-mandatory overflow-y-auto overscroll-contain scroll-smooth" style={{ scrollbarWidth: "none" }}>
        {reels.map((reel) => (
          <ReelCard
            key={reel.id}
            reel={reel}
            globalMuted={globalMuted}
            onMuteToggle={() => setGlobalMuted((v) => !v)}
            onUserClick={onUserClick}
            mode="fullscreen"
          />
        ))}
      </div>
    </div>
  );
}

function ProfileGridCell({ media, onClick }: { media: ProfileGridMedia; onClick: () => void }) {
  return (
    <div className="relative aspect-square overflow-hidden cursor-pointer group bg-gray-100" onClick={onClick}>
      {media.type === "video" ? (
        <>
          <video
            src={media.url}
            className="block h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            muted
            playsInline
            preload="metadata"
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-black/45 text-white">
              <Play className="h-8 w-8 fill-white translate-x-0.5" />
            </div>
          </div>
        </>
      ) : (
        <img src={media.url} alt="" loading="lazy" decoding="async" className="block h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
      )}
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
    </div>
  );
}

function ExploreMediaCell({ post, onClick }: { post: ExplorePostItem; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="relative block aspect-square w-full overflow-hidden rounded-xl bg-gray-200 text-left group break-inside-avoid"
    >
      {post.type === "video" && post.image ? (
        <>
          <video src={post.image} className="block h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" muted playsInline preload="metadata" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-black/45 text-white">
              <Play className="h-7 w-7 fill-white translate-x-0.5" />
            </div>
          </div>
        </>
      ) : post.image ? (
        <img src={post.image} alt="" loading="lazy" decoding="async" className="block h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-[10px] text-gray-500">No media</div>
      )}
      <div className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/40" />
      <div className="absolute inset-0 hidden items-center justify-center gap-4 group-hover:flex">
        <div className="flex items-center gap-1 text-white"><Heart className="w-5 h-5 fill-white" /><span className="text-sm font-bold">{post.likes.toLocaleString()}</span></div>
        <div className="flex items-center gap-1 text-white"><MessageCircle className="w-5 h-5 fill-white" /><span className="text-sm font-bold">{post.comments}</span></div>
      </div>
    </button>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative h-9 w-16 shrink-0 rounded-full transition-colors duration-200 ${checked ? "bg-[#0aa39d]" : "bg-[#dfeaf0]"}`}
    >
      <span className={`absolute top-0.5 h-8 w-8 rounded-full bg-white shadow-[0_8px_18px_rgba(15,23,42,0.12)] transition-transform duration-200 ${checked ? "translate-x-[30px]" : "translate-x-[2px]"}`} />
    </button>
  );
}

// â”€â”€ STORY VIEWER â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function StoryViewer({
  story,
  storyRail,
  onClose,
  onStoryChange,
  onViewed,
  onDeleted,
}: {
  story: StoryItem;
  storyRail?: StoryItem[];
  onClose: () => void;
  onStoryChange?: (story: StoryItem) => void;
  onViewed?: (storyId: string | number) => void;
  onDeleted?: (storyId: string | number) => void;
}) {
  const [index, setIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const pointerStartY = useRef<number | null>(null);
  const nextInitialIndex = useRef(0);
  const segments = story.segments;
  const active = segments[index];
  const activeId = active?.id;
  const rail = (storyRail && storyRail.length > 0 ? storyRail : [story]).filter((item) => item.segments.length > 0);
  const railIndex = Math.max(0, rail.findIndex((item) => item.id === story.id));

  const openRailStory = useCallback((targetIndex: number, segmentIndex = 0) => {
    const nextStory = rail[targetIndex];
    if (!nextStory) return false;
    nextInitialIndex.current = Math.max(0, Math.min(segmentIndex, nextStory.segments.length - 1));
    setProgress(0);
    onStoryChange?.(nextStory);
    return true;
  }, [onStoryChange, rail]);

  const closeOrAdvance = useCallback(() => {
    setIndex((current) => {
      if (current >= segments.length - 1) {
        if (!openRailStory(railIndex + 1, 0)) onClose();
        return current;
      }
      return current + 1;
    });
  }, [onClose, openRailStory, railIndex, segments.length]);

  const goBack = useCallback(() => {
    setIndex((current) => {
      if (current > 0) return current - 1;
      const prevStory = rail[railIndex - 1];
      if (prevStory) openRailStory(railIndex - 1, prevStory.segments.length - 1);
      return current;
    });
  }, [openRailStory, rail, railIndex]);

  useEffect(() => {
    setIndex(Math.min(nextInitialIndex.current, Math.max(segments.length - 1, 0)));
    nextInitialIndex.current = 0;
    setProgress(0);
    setPaused(false);
  }, [segments.length, story.id]);

  useEffect(() => {
    setProgress(0);
    if (!activeId || story.mine) return;
    socialApi.viewStory(activeId).catch(() => {});
    onViewed?.(activeId);
  }, [activeId, onViewed, story.mine]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowRight") closeOrAdvance();
      if (event.key === "ArrowLeft") goBack();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [closeOrAdvance, goBack, onClose]);

  useEffect(() => {
    if (!active || isVideoStory(active) || paused) return;
    const interval = window.setInterval(() => {
      setProgress((current) => {
        if (current >= 100) {
          closeOrAdvance();
          return 100;
        }
        return Math.min(100, current + 2);
      });
    }, 100);
    return () => window.clearInterval(interval);
  }, [active, closeOrAdvance, paused]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !active || !isVideoStory(active)) return;
    if (paused) video.pause();
    else void video.play().catch(() => {});
  }, [active, paused]);

  const togglePaused = (event?: React.MouseEvent) => {
    event?.stopPropagation();
    setPaused((current) => !current);
  };

  const handleVideoProgress = (event: React.SyntheticEvent<HTMLVideoElement>) => {
    const video = event.currentTarget;
    if (video.duration) setProgress(Math.min(100, (video.currentTime / video.duration) * 100));
  };

  const handleDelete = async () => {
    if (!active || deleting) return;
    setDeleting(true);
    try {
      await socialApi.deleteStory(active.id);
      onDeleted?.(active.id);
      if (segments.length <= 1) onClose();
      else if (index >= segments.length - 1) setIndex((current) => Math.max(0, current - 1));
    } catch { /* ignore delete failures */ }
    finally { setDeleting(false); }
  };

  if (!active) return null;
  const isVideo = isVideoStory(active);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-[#1a1a1a] px-3 py-4 sm:px-6"
      onPointerDown={(event) => { pointerStartY.current = event.clientY; }}
      onPointerUp={(event) => {
        if (pointerStartY.current != null && event.clientY - pointerStartY.current > 80) onClose();
        pointerStartY.current = null;
      }}
    >
      {!isVideo && (
        <img
          src={active.mediaUrl}
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 h-full w-full scale-110 object-cover opacity-10 blur-3xl"
        />
      )}
      <div className="pointer-events-none absolute inset-0 bg-[#111]/80" />
      <div className="absolute left-4 top-4 z-20 hidden select-none text-[27px] font-semibold italic leading-none text-white md:block" style={{ fontFamily: "cursive" }}>
        Instagram
      </div>
      <button
        onClick={onClose}
        className="absolute right-5 top-5 z-20 rounded-full p-2 text-white/95 transition hover:bg-white/10"
        aria-label="Close story"
      >
        <X className="h-9 w-9 stroke-[2.2]" />
      </button>
      <div
        className="relative z-10 aspect-[9/16] h-[min(92dvh,875px)] max-h-[92dvh] w-auto max-w-[min(92vw,492px)] overflow-hidden rounded-[10px] bg-black shadow-2xl ring-1 ring-white/10"
        onClick={e => e.stopPropagation()}
        onMouseDown={() => setPaused(true)}
        onMouseUp={() => setPaused(false)}
        onMouseLeave={() => setPaused(false)}
        onTouchStart={() => setPaused(true)}
        onTouchEnd={() => setPaused(false)}
      >
        {isVideoStory(active) ? (
          <video
            ref={videoRef}
            key={active.id}
            src={active.mediaUrl}
            className="block h-full w-full object-cover"
            playsInline
            autoPlay
            muted
            onTimeUpdate={handleVideoProgress}
            onEnded={closeOrAdvance}
          />
        ) : (
          <img src={active.mediaUrl} alt={story.label} className="block h-full w-full object-cover" decoding="async" />
        )}

        <button type="button" aria-label="Previous story" onClick={goBack} className="absolute left-0 top-24 bottom-24 w-1/3" />
        <button type="button" aria-label="Next story" onClick={closeOrAdvance} className="absolute right-0 top-24 bottom-24 w-1/3" />

        <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/65 via-black/20 to-transparent">
          <div className="mb-3 flex gap-[2px]">
            {segments.map((segment, segmentIndex) => (
              <div key={segment.id} className="h-[2px] flex-1 overflow-hidden rounded-full bg-white/40">
                <div
                  className="h-full rounded-full bg-white transition-[width]"
                  style={{ width: `${segmentIndex < index ? 100 : segmentIndex === index ? progress : 0}%` }}
                />
              </div>
            ))}
          </div>
          <div className="flex items-start gap-3">
            <AvatarCircle src={story.avatar} name={story.label} size="sm" className="h-8 w-8 border border-white/70 text-xs" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="max-w-32 truncate text-sm font-bold text-white">{story.label}</span>
                <Check className="h-3.5 w-3.5 rounded-full bg-white text-black" />
                <span className="text-xs text-white/70">{formatRelativeTime(active.createdAt)}</span>
              </div>
              <div className="mt-0.5 flex items-center gap-1 text-[11px] font-semibold text-white">
                <Play className="h-3 w-3 fill-white" />
                <span>Watch full reel</span>
                <ChevronRight className="h-3 w-3" />
              </div>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <VolumeX className="h-4 w-4 text-white" />
              <button
                onMouseDown={(event) => event.stopPropagation()}
                onTouchStart={(event) => event.stopPropagation()}
                onClick={togglePaused}
                className="rounded-full p-0.5 text-white transition hover:bg-white/10"
                aria-label={paused ? "Play story" : "Pause story"}
              >
                {paused ? <Play className="h-5 w-5 fill-white" /> : <Pause className="h-5 w-5 fill-white" />}
              </button>
              <MoreHorizontal className="h-5 w-5 text-white" />
              {story.mine && (
                <span className="inline-flex items-center gap-1 rounded-full bg-black/35 px-2 py-1 text-[11px] font-semibold text-white">
                  <Eye className="h-3.5 w-3.5" /> {active.viewCount}
                </span>
              )}
              {story.mine && (
                <button
                  onMouseDown={(event) => event.stopPropagation()}
                  onTouchStart={(event) => event.stopPropagation()}
                  onClick={handleDelete}
                  disabled={deleting}
                  className="rounded-full bg-black/35 p-1.5 text-white disabled:opacity-60"
                >
                  {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                </button>
              )}
              <button
                onMouseDown={(event) => event.stopPropagation()}
                onTouchStart={(event) => event.stopPropagation()}
                onClick={onClose}
                className="rounded-full bg-black/35 p-1.5 sm:hidden"
              >
                <X className="w-4 h-4 text-white" />
              </button>
            </div>
          </div>
        </div>
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black/55 to-transparent" />
        <div className="absolute bottom-4 left-4 right-4 flex items-center gap-3">
          <input
            readOnly
            value=""
            placeholder={`Reply to ${story.label}...`}
            onMouseDown={(event) => event.stopPropagation()}
            onTouchStart={(event) => event.stopPropagation()}
            className="h-11 min-w-0 flex-1 rounded-full border border-white/80 bg-transparent px-5 text-sm font-medium text-white placeholder-white/90 outline-none"
          />
          <button
            type="button"
            onMouseDown={(event) => event.stopPropagation()}
            onTouchStart={(event) => event.stopPropagation()}
            className="text-white"
          >
            <Heart className="h-8 w-8" />
          </button>
          <button
            type="button"
            onMouseDown={(event) => event.stopPropagation()}
            onTouchStart={(event) => event.stopPropagation()}
            className="text-white"
          >
            <Send className="h-8 w-8" />
          </button>
        </div>
      </div>
      <button
        type="button"
        aria-label="Next story"
        onClick={closeOrAdvance}
        className="absolute left-[calc(50%+260px)] top-1/2 z-20 hidden h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-white/70 transition hover:bg-white/25 lg:flex"
      >
        <ChevronRight className="h-5 w-5" />
      </button>
    </div>
  );
}

function StoryCircle({ story, onClick, onCreate }: { story: StoryItem; onClick: () => void; onCreate?: () => void }) {
  const cover = story.segments[0]?.mediaUrl || story.avatar || "";
  const ringClass = story.segments.length === 0
    ? "border-dashed border-gray-300"
    : story.viewed ? "border-gray-300" : "border-teal-400";
  return (
    <div className="flex flex-col items-center gap-1 shrink-0 cursor-pointer" onClick={onClick}>
      <div className={`relative w-14 h-14 rounded-full flex items-center justify-center border-2 overflow-hidden transition-transform hover:scale-105 ${ringClass}`}>
        {cover
          ? isVideoStory({ mediaType: story.segments[0]?.mediaType ?? "image", mediaUrl: cover })
            ? <video src={cover} className="h-full w-full object-cover" muted playsInline preload="metadata" />
            : <img src={cover} alt={story.label} className="w-full h-full object-cover" />
          : <div className="w-full h-full bg-gray-100 flex items-center justify-center"><PlusCircle className="w-5 h-5 text-teal-400" /></div>}
        {story.mine && story.segments.length > 0 && onCreate && (
          <button
            onClick={(event) => { event.stopPropagation(); onCreate(); }}
            className="absolute bottom-0 right-0 flex h-5 w-5 items-center justify-center rounded-full bg-teal-500 text-white ring-2 ring-white"
          >
            <PlusCircle className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      <span className="text-[10px] text-gray-500 truncate w-14 text-center">{story.label}</span>
    </div>
  );
}

// â”€â”€ POST CARD â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function FeedVideo({
  src,
  postId,
}: {
  src: string;
  postId: string | number;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const key = String(postId);

    const pauseForOtherVideo = (event: Event) => {
      const detail = (event as CustomEvent<{ postId?: string }>).detail;
      if (detail?.postId !== key) video.pause();
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return;
        if (entry.isIntersecting && entry.intersectionRatio >= 0.6) {
          window.dispatchEvent(new CustomEvent("socio-video-play", { detail: { postId: key } }));
          void video.play().catch(() => {});
        } else {
          video.pause();
        }
      },
      { threshold: [0, 0.6, 1] },
    );

    observer.observe(video);
    window.addEventListener("socio-video-play", pauseForOtherVideo);
    return () => {
      observer.disconnect();
      window.removeEventListener("socio-video-play", pauseForOtherVideo);
      video.pause();
    };
  }, [postId]);

  return (
    <video
      ref={videoRef}
      src={src}
      className="block h-auto max-h-[78vh] w-full object-contain bg-black"
      controls
      muted={muted}
      playsInline
      preload="metadata"
      onVolumeChange={(event) => setMuted(event.currentTarget.muted)}
    />
  );
}

function SponsoredAdCard({ ad, compact = false }: { ad: SponsoredAd; compact?: boolean }) {
  const router = useRouter();
  const imgSource = compact ? (ad.mobileImage || ad.image) : (ad.desktopImage || ad.image);
  const img = imgSource ? resolveMediaUrl(imgSource) || imgSource : "";
  const openAd = () => {
    const target = String(ad.targetType || "").toLowerCase();
    if (target === "product" && ad.productId && ad.vendorId) {
      router.push(`/shop/${encodeURIComponent(ad.vendorId)}/${encodeURIComponent(ad.productId)}`);
      return;
    }
    if (target === "vendor" && ad.vendorId) {
      router.push(`/shop/${encodeURIComponent(ad.vendorId)}`);
      return;
    }
    if (!ad.redirectUrl) return;
    if (ad.redirectUrl.startsWith("/")) router.push(ad.redirectUrl);
    else window.open(ad.redirectUrl, "_blank", "noopener,noreferrer");
  };
  const body = (
    <div className={compact ? "w-60 shrink-0 overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm" : "mb-4 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm"}>
      <div className="flex items-center justify-between px-4 py-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-900">{ad.advertiser || ad.title}</p>
          <span className="text-[10px] font-semibold uppercase tracking-wide text-teal-600">Sponsored</span>
        </div>
        <span className="rounded-full bg-teal-50 px-2 py-0.5 text-[10px] font-bold text-teal-600">Ad</span>
      </div>
      {img ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={img} alt={ad.title} className={compact ? "h-16 w-full object-cover" : "max-h-[420px] w-full object-cover"} onError={(e) => { e.currentTarget.style.display = "none"; }} />
      ) : null}
      {(ad.title || ad.caption) ? (
        <div className="px-4 py-3">
          {ad.title ? <p className="text-sm font-semibold text-slate-900">{ad.title}</p> : null}
          {ad.caption ? <p className="mt-1 text-sm text-slate-600">{ad.caption}</p> : null}
        </div>
      ) : null}
    </div>
  );
  return ad.redirectUrl || ad.productId || ad.vendorId
    ? <button type="button" onClick={openAd} className="block w-full text-left">{body}</button>
    : body;
}

const ADSENSE_ENABLED = process.env.NEXT_PUBLIC_SOCIO_ADSENSE_ENABLED === "true";
const ADSENSE_CLIENT = process.env.NEXT_PUBLIC_SOCIO_ADSENSE_CLIENT || "";
const ADSENSE_SLOT = process.env.NEXT_PUBLIC_SOCIO_ADSENSE_SLOT || "";

function WebAdSenseCard({ compact = false }: { compact?: boolean }) {
  useEffect(() => {
    if (!ADSENSE_ENABLED || !ADSENSE_CLIENT || !ADSENSE_SLOT) return;
    const load = () => {
      try {
        const ads = window as unknown as { adsbygoogle?: unknown[] };
        (ads.adsbygoogle = ads.adsbygoogle || []).push({});
      } catch { /* a blocked ad must never break the feed */ }
    };
    const existing = document.querySelector<HTMLScriptElement>('script[data-p4u-socio-adsense]');
    if (existing) {
      if (existing.dataset.loaded === "true") load();
      else existing.addEventListener("load", load, { once: true });
      return;
    }
    const script = document.createElement("script");
    script.async = true;
    script.crossOrigin = "anonymous";
    script.dataset.p4uSocioAdsense = "true";
    script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(ADSENSE_CLIENT)}`;
    script.addEventListener("load", () => { script.dataset.loaded = "true"; load(); }, { once: true });
    document.head.appendChild(script);
  }, []);
  if (!ADSENSE_ENABLED || !ADSENSE_CLIENT || !ADSENSE_SLOT) return null;
  return (
    <div className={compact ? "w-80 shrink-0 overflow-hidden rounded-xl bg-white" : "mb-4 overflow-hidden rounded-2xl bg-white"}>
      <ins className="adsbygoogle block" data-ad-client={ADSENSE_CLIENT} data-ad-slot={ADSENSE_SLOT} data-ad-format={compact ? "horizontal" : "auto"} data-full-width-responsive="true" />
    </div>
  );
}

function HybridAdSlot({ slotIndex, ads, config, compact = false }: { slotIndex: number; ads: SponsoredAd[]; config: SocioAdConfig; compact?: boolean }) {
  const admin = ads.length ? ads[slotIndex % ads.length] : null;
  const wantsAdmin = config.mode === "admin_only"
    || config.mode === "prefer_admin_then_admob"
    || (config.mode === "alternate" && slotIndex % 2 === 0);
  if (wantsAdmin && admin) return <SponsoredAdCard ad={admin} compact={compact} />;
  if (config.mode === "admin_only") return null;
  return <WebAdSenseCard compact={compact} />;
}

function PostCard({ post: p, onUserClick, myUserId }: { post: PostItem; onUserClick: (userId: string) => void; myUserId?: string }) {
  const [liked, setLiked] = useState(p.isLiked ?? false);
  const [saved, setSaved] = useState(p.isSaved ?? false);
  const [following, setFollowing] = useState(p.isFollowing ?? false);
  const [likes, setLikes] = useState(p.likes);
  const [shares, setShares] = useState(p.shares);
  const [comment, setComment] = useState("");
  const [commentList, setCommentList] = useState<{ id: string | number; user: string; avatar?: string | null; text: string }[]>([]);
  const [commentCount, setCommentCount] = useState(p.comments);
  const [showComments, setShowComments] = useState(false);
  const [commentsLoaded, setCommentsLoaded] = useState(false);
  const [commentBusy, setCommentBusy] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [likeBusy, setLikeBusy] = useState(false);
  const [saveBusy, setSaveBusy] = useState(false);
  const [followBusy, setFollowBusy] = useState(false);

  useEffect(() => {
    setLiked(p.isLiked ?? false);
    setSaved(p.isSaved ?? false);
    setFollowing(p.isFollowing ?? false);
    setLikes(p.likes);
    setShares(p.shares);
    setCommentCount(p.comments);
  }, [p.id, p.isLiked, p.isSaved, p.isFollowing, p.likes, p.shares, p.comments]);

  useEffect(() => {
    const onFollowChanged = (event: Event) => {
      const detail = (event as CustomEvent<{ userId?: string; isFollowing?: boolean }>).detail;
      if (!detail?.userId || String(detail.userId) !== String(p.userId)) return;
      setFollowing(Boolean(detail.isFollowing));
    };
    window.addEventListener("p4u:socio-follow-changed", onFollowChanged);
    return () => window.removeEventListener("p4u:socio-follow-changed", onFollowChanged);
  }, [p.userId]);

  const isSelfPost = Boolean(p.isSelf || (myUserId && p.userId && String(myUserId) === String(p.userId)));
  const canComment = p.commentPermission !== "none" && (p.commentPermission !== "followers" || following || isSelfPost);
  const showLikeTotal = !p.hideLikeCount || isSelfPost;
  const videoUrl = isVideoPost({ postType: p.postType, imageUrl: p.image, mediaUrls: p.mediaUrls })
    ? (p.mediaUrls?.find(isVideoUrl) || p.mediaUrls?.[0] || p.image)
    : "";

  const toggleLike = async () => {
    if (likeBusy) return;
    const next = !liked;
    setLiked(next);
    setLikes(v => (next ? v + 1 : Math.max(0, v - 1)));
    setLikeBusy(true);
    try {
      if (next) await socialApi.likePost(p.id);
      else await socialApi.unlikePost(p.id);
    } catch {
      setLiked(!next);
      setLikes(v => (next ? Math.max(0, v - 1) : v + 1));
    } finally {
      setLikeBusy(false);
    }
  };

  const toggleSave = async () => {
    if (saveBusy) return;
    const next = !saved;
    setSaved(next);
    setSaveBusy(true);
    try {
      if (next) await socialApi.savePost(p.id);
      else await socialApi.unsavePost(p.id);
    } catch {
      setSaved(!next);
    } finally {
      setSaveBusy(false);
    }
  };

  const handleShare = async () => {
    try {
      await socialApi.sharePost(p.id);
      setShares((v) => v + 1);
      const url = window.location.href;
      if (navigator.share) {
        await navigator.share({ title: "P4U Socio", text: p.caption, url }).catch(() => {});
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(url);
      }
    } catch { /* ignore */ }
  };

  const loadComments = async () => {
    try {
      const rows = await socialApi.getComments(p.id);
      setCommentList(rows.map(c => ({ id: c.id, user: c.userName ?? "user", avatar: c.userAvatar ?? null, text: c.content })));
      setCommentCount(prev => Math.max(prev, rows.length));
    } catch { /* feed may be unreachable */ }
    setCommentsLoaded(true);
  };

  const toggleComments = () => {
    if (!canComment) return;
    setShowComments(v => {
      const next = !v;
      if (next && !commentsLoaded) void loadComments();
      return next;
    });
  };

  const toggleFollow = async () => {
    if (!p.userId || isSelfPost || followBusy) return;
    const next = !following;
    setFollowing(next);
    setFollowBusy(true);
    try {
      if (next) await socialApi.followUser(p.userId);
      else await socialApi.unfollowUser(p.userId);
    } catch {
      setFollowing(!next);
    } finally {
      setFollowBusy(false);
    }
  };

  const submitComment = async () => {
    const text = comment.trim();
    if (!text || commentBusy) return;
    setComment("");
    setShowComments(true);
    const tempId = `temp-${Date.now()}`;
    setCommentList(list => [...list, { id: tempId, user: "You", text }]);
    setCommentCount(c => c + 1);
    setCommentBusy(true);
    try {
      const saved = await socialApi.createComment(p.id, { contentText: text });
      setCommentList(list => list.map(c => (c.id === tempId ? { id: saved.id, user: saved.userName ?? "You", avatar: saved.userAvatar ?? null, text: saved.content || text } : c)));
    } catch {
      setCommentList(list => list.filter(c => c.id !== tempId));
      setCommentCount(c => Math.max(0, c - 1));
      setComment(text);
    } finally {
      setCommentBusy(false);
    }
  };

  const addEmoji = (emoji: string) => setComment((value) => `${value}${emoji}`);
  const commentEmojis = ["😊", "🎉", "🔥", "💯", "👏", "💖", "🥳", "🫶", "💐", "🌟"];

  return (
    <div className="bg-white shadow-sm border border-gray-100 overflow-hidden mb-4">
      <div className="flex items-center gap-4 px-5 py-4">
        <button onClick={() => p.userId && onUserClick(p.userId)} className="relative shrink-0">
          <AvatarCircle src={p.avatarA} name={p.user} size="lg" className="border-2 border-orange-400 hover:border-teal-600 transition" />
        </button>
        <div className="flex-1 min-w-0">
          <button onClick={() => p.userId && onUserClick(p.userId)} className="text-[20px] font-bold text-slate-950 truncate hover:text-teal-600 transition text-left leading-tight">
            {p.user} {p.co && <span className="font-normal text-gray-500 text-xs">{p.co}</span>}
          </button>
          <p className="text-[12px] text-slate-500">{p.time}</p>
        </div>
        {!isSelfPost && (
          <button
            type="button"
            onClick={toggleFollow}
            disabled={followBusy}
            className={`rounded-full px-5 py-2 text-sm font-bold transition disabled:opacity-60 ${
              following ? "bg-slate-100 text-slate-800" : "bg-[#009999] text-white hover:bg-[#007f7f]"
            }`}
          >
            {following ? "Following" : "Follow"}
          </button>
        )}
        <div className="relative">
          <button onClick={() => setShowMenu(true)} className="p-1 text-slate-950 hover:text-gray-700"><MoreHorizontal className="w-5 h-5" /></button>
          {showMenu && (
            <div className="fixed inset-0 flex items-center justify-center bg-black/40 z-50" onClick={() => setShowMenu(false)}>
              <div className="bg-white rounded-2xl shadow-2xl w-72 overflow-hidden" onClick={e => e.stopPropagation()}>
                {["Report", "Go to post", "Share to...", "Copy link", "Embed", "About this account"].map(item => (
                  <button key={item} onClick={() => setShowMenu(false)} className="w-full px-4 py-3.5 text-center border-b last:border-b-0 hover:bg-gray-50 text-sm text-gray-700">{item}</button>
                ))}
                <button onClick={() => setShowMenu(false)} className="w-full px-4 py-3.5 text-center text-red-500 hover:bg-gray-50 text-sm font-semibold">Cancel</button>
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="relative flex w-full items-center justify-center overflow-hidden bg-gray-100">
        {videoUrl ? (
        <FeedVideo src={videoUrl} postId={p.id} />
        ) : p.image ? (
        <img src={p.image} alt="post" loading="lazy" decoding="async" className="block h-auto max-h-[78vh] w-full object-contain" />
        ) : (
        <div className="flex min-h-64 w-full items-center justify-center text-xs text-gray-400">No media</div>
        )}
      </div>
      <div className="px-5 py-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-4">
            <button onClick={toggleLike} disabled={likeBusy} className="flex items-center gap-1 group disabled:opacity-60">
              <Heart className={`w-8 h-8 transition-all ${liked ? "fill-red-500 text-red-500 scale-110" : "text-slate-950 group-hover:text-red-400"}`} />
              {showLikeTotal && <span className="text-lg text-slate-950">{likes.toLocaleString()}</span>}
            </button>
            <button onClick={toggleComments} disabled={!canComment} className="flex items-center gap-1 group disabled:opacity-40">
              <MessageCircle className="w-8 h-8 text-slate-950 group-hover:text-teal-500 transition" />
              <span className="text-lg text-slate-950">{commentCount}</span>
            </button>
            <button onClick={handleShare} className="flex items-center gap-1 group">
              <Send className="w-8 h-8 text-slate-950 group-hover:text-blue-500 transition" />
              <span className="text-lg text-slate-950">{shares}</span>
            </button>
          </div>
          <button onClick={toggleSave} disabled={saveBusy}>
            <Bookmark className={`w-8 h-8 transition ${saved ? "fill-teal-500 text-teal-500" : "text-slate-950 hover:text-teal-500"}`} />
          </button>
        </div>
        <p className="text-[20px] text-slate-950 mb-1 leading-snug"><span className="font-bold">{p.user}</span> {p.caption}</p>
        {p.category && <p className="text-sm font-semibold text-slate-500 mb-2">Category: {p.category}</p>}
        <p className="text-[20px] text-[#009999]">{p.hashtags}</p>
        {p.linkedProducts && p.linkedProducts.length > 0 && (
          <div className="mt-3 flex gap-3 overflow-x-auto pb-1">
            {p.linkedProducts.map((product) => (
              <div key={product.id} className="flex min-w-48 items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 p-2">
                {product.image ? (
                  <img src={resolveMediaUrl(product.image) || product.image} alt={product.name} className="h-12 w-12 rounded-lg object-cover" />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-white text-xs font-bold text-slate-400">P</div>
                )}
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-slate-950">{product.name}</p>
                  {product.price != null && <p className="text-xs text-slate-500">₹{product.price}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
        {showComments && (
          <div className="mt-4">
            <textarea
              value={comment}
              onChange={e => setComment(e.target.value)}
              placeholder="Add a comment..."
              rows={4}
              className="w-full resize-none rounded-3xl border border-slate-200 bg-slate-50 px-4 py-4 text-lg text-slate-900 outline-none placeholder:text-slate-400 focus:border-teal-400"
            />
            <div className="mt-4 flex flex-wrap items-center gap-4">
              {commentEmojis.map((emoji) => (
                <button key={emoji} type="button" onClick={() => addEmoji(emoji)} className="text-2xl leading-none hover:scale-110 transition">
                  {emoji}
                </button>
              ))}
              <button type="button" className="rounded-full border border-teal-200 px-4 py-2 text-sm text-[#009999]">
                😊 More
              </button>
            </div>
            <div className="mt-4 flex justify-end gap-4">
              <button type="button" onClick={() => { setComment(""); setShowComments(false); }} className="rounded-full border border-slate-200 px-5 py-2 text-base font-semibold text-slate-950">
                Cancel
              </button>
              <button type="button" onClick={submitComment} disabled={!comment.trim() || commentBusy} className="rounded-full bg-[#7fd3d0] px-6 py-2 text-base font-bold text-white disabled:opacity-50">
                Post
              </button>
            </div>
            {commentList.length > 0 && (
              <div className="mt-4 space-y-3">
                {commentList.map((c) => (
                  <div key={c.id} className="flex items-start gap-3 text-sm text-slate-800">
                    <AvatarCircle src={c.avatar} name={c.user} size="sm" />
                    <p><span className="font-semibold">{c.user} </span>{c.text}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Post card end
function CreateStoryModal({ onClose, onCreated }: { onClose: () => void; onCreated?: () => void }) {
  const [preview, setPreview] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [filter, setFilter] = useState("Normal");
  const [showImageEditor, setShowImageEditor] = useState(false);
  const [caption, setCaption] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      setPreview(URL.createObjectURL(f));
      setPendingFile(f);
      setError(null);
    }
  };

  const handleShare = async () => {
    if (!pendingFile || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const uploaded = await socialApi.uploadMedia(pendingFile);
      await socialApi.createStory({
        mediaUrl: uploaded.url,
        mediaType: uploaded.mediaType,
        textOverlay: caption.trim() || undefined,
      });
      onCreated?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to share story");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
      <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">Create Story</h2>
          <button onClick={onClose} disabled={submitting}><X className="w-5 h-5 text-gray-500" /></button>
        </div>
        {!preview ? (
          <div onClick={() => fileRef.current?.click()} className="flex flex-col items-center justify-center py-20 cursor-pointer hover:bg-gray-50 transition">
            <div className="w-16 h-16 rounded-2xl border-2 border-dashed border-teal-300 flex items-center justify-center mb-3">
              <ImageIcon className="w-7 h-7 text-teal-400" />
            </div>
            <p className="text-sm text-gray-500">Click to upload a photo or video</p>
            <p className="text-[10px] text-gray-400 mt-1">Story expires after 24 hours</p>
            <input ref={fileRef} type="file" accept="image/*,video/*" className="hidden" onChange={handleFile} />
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row gap-0">
            <div className="flex-1 bg-black aspect-[9/16] max-h-64 relative overflow-hidden">
              {pendingFile?.type.startsWith("video/") ? (
                <video src={preview} className="w-full h-full object-cover" controls />
              ) : (
                <img src={preview} alt="story" className="w-full h-full object-cover" style={{ filter: FILTER_CSS[filter] }} />
              )}
              <div className="absolute bottom-3 left-3 right-3">
                <input value={caption} onChange={e => setCaption(e.target.value)} placeholder="Add captionâ€¦"
                  className="w-full text-xs bg-black/40 text-white placeholder-white/60 rounded-lg px-3 py-2 outline-none border border-white/20 backdrop-blur" />
              </div>
            </div>
            <div className="w-full sm:w-44 p-3 overflow-y-auto max-h-64 bg-gray-50">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-2">Filters</p>
              <div className="grid grid-cols-4 sm:grid-cols-2 gap-1.5">
                {FILTER_NAMES.map(f => (
                  <button key={f} onClick={() => setFilter(f)}
                    className={`flex flex-col items-center gap-1 p-1.5 rounded-lg border transition ${filter === f ? "border-teal-400 bg-teal-50" : "border-transparent hover:bg-white"}`}>
                    <div className="w-10 h-10 rounded overflow-hidden">
                      <img src={preview} alt={f} className="w-full h-full object-cover" style={{ filter: FILTER_CSS[f] }} />
                    </div>
                    <span className="text-[8px] text-gray-500 font-medium">{f}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
        {error && <p className="px-5 pt-2 text-xs text-red-600">{error}</p>}
        <div className="flex gap-3 px-5 py-4 border-t border-gray-100">
          <button onClick={onClose} disabled={submitting} className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200 transition disabled:opacity-50">Cancel</button>
          {preview && (
            <button onClick={handleShare} disabled={submitting} className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white shadow transition hover:opacity-90 disabled:opacity-60" style={{ background: TEAL }}>
              {submitting ? "Sharingâ€¦" : "Share to Story"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// â”€â”€ USER PROFILE PAGE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function UserProfilePage({ userId, onBack, onUserClick, onMessage }: { userId: string; onBack: () => void; onUserClick: (userId: string) => void; onMessage: (userId: string) => void }) {
  const [profile, setProfile] = useState<UserProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState(false);
  const [followBusy, setFollowBusy] = useState(false);
  const [followList, setFollowList] = useState<FollowListTab | null>(null);
  const [selectedMedia, setSelectedMedia] = useState<ProfileGridMedia | null>(null);
  const [selectedReelIndex, setSelectedReelIndex] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState("Posts");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      socialApi.getUserProfile(userId),
      socialApi.getUserPosts(userId, { limit: 30 }),
    ])
      .then(([prof, postRes]) => {
        if (cancelled) return;
        const images = postRes.data
          .map(postToProfileGridMedia)
          .filter((item): item is ProfileGridMedia => Boolean(item));
        const reels = postRes.data
          .map(postToReelItem)
          .filter((item): item is ReelItem => Boolean(item));
        setProfile({
          userId: prof.userId,
          name: prof.userName,
          username: prof.userName,
          bio: prof.bio ?? "",
          website: "",
          posts: prof.postCount,
          followers: prof.followerCount,
          following: prof.followingCount,
          avatar: prof.userAvatar ? resolveMediaUrl(prof.userAvatar) || prof.userAvatar : "",
          images,
          reels,
          verified: false,
          isSelf: prof.isSelf,
          isFollowing: prof.isFollowing,
        });
        setFollowing(prof.isFollowing);
      })
      .catch(() => {
        if (!cancelled) setProfile(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [userId]);

  useEffect(() => {
    const onFollowChanged = (event: Event) => {
      const detail = (event as CustomEvent<{ userId?: string; isFollowing?: boolean; delta?: number }>).detail;
      if (!detail?.userId || String(detail.userId) !== String(userId)) return;
      const next = Boolean(detail.isFollowing);
      setFollowing(next);
      setProfile((current) => {
        if (!current) return current;
        if (current.isFollowing === next) return current;
        const delta = typeof detail.delta === "number" ? detail.delta : next ? 1 : -1;
        return {
          ...current,
          followers: Math.max(0, current.followers + delta),
          isFollowing: next,
        };
      });
    };
    window.addEventListener("p4u:socio-follow-changed", onFollowChanged);
    return () => window.removeEventListener("p4u:socio-follow-changed", onFollowChanged);
  }, [userId]);

  const toggleFollow = async () => {
    if (!profile || profile.isSelf || followBusy) return;
    const next = !following;
    setFollowing(next);
    setProfile((current) => current ? { ...current, followers: Math.max(0, current.followers + (next ? 1 : -1)), isFollowing: next } : current);
    setFollowBusy(true);
    try {
      if (next) await socialApi.followUser(userId);
      else await socialApi.unfollowUser(userId);
    } catch {
      setFollowing(!next);
      setProfile((current) => current ? { ...current, followers: Math.max(0, current.followers + (next ? -1 : 1)), isFollowing: !next } : current);
    } finally {
      setFollowBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-20 px-4">
        <Loader2 className="w-8 h-8 text-teal-500 animate-spin mb-4" />
        <p className="text-gray-400 text-sm">Loading profile...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-20 px-4">
        <User className="w-16 h-16 text-gray-300 mb-4" />
        <p className="text-gray-500 text-sm">Profile not found</p>
        <button onClick={onBack} className="mt-4 text-teal-500 text-sm font-semibold">â† Go back</button>
      </div>
    );
  }

  const TABS = ["Posts", "Reels", "Tagged"];
  const openProfileMedia = (media: ProfileGridMedia) => {
    if (media.type === "video") {
      const index = profile.reels.findIndex((reel) => String(reel.postId) === String(media.id));
      if (index >= 0) {
        setSelectedReelIndex(index);
        return;
      }
    }
    setSelectedMedia(media);
  };

  if (followList) {
    return (
      <FollowListScreen
        ownerId={profile.userId}
        initialTab={followList}
        onBack={() => setFollowList(null)}
        onUserClick={(nextUserId) => {
          setFollowList(null);
          onUserClick(nextUserId);
        }}
        onRelationshipChange={({ targetUserId, isFollowing, delta }) => {
          if (targetUserId === profile.userId) {
            setFollowing(isFollowing);
            setProfile((current) => current ? { ...current, followers: Math.max(0, current.followers + delta), isFollowing } : current);
          }
        }}
      />
    );
  }

  return (
    <div className="min-h-full max-w-3xl bg-white">
      {selectedMedia && <ProfileMediaModal media={selectedMedia} onClose={() => setSelectedMedia(null)} />}
      {selectedReelIndex != null && (
        <ProfileReelsViewer
          reels={profile.reels}
          initialIndex={selectedReelIndex}
          onClose={() => setSelectedReelIndex(null)}
          onUserClick={onUserClick}
        />
      )}

      <div className="px-9 pb-5 pt-5">
        <button onClick={onBack} className="mb-2 -ml-2 inline-flex items-center rounded-xl p-2 text-slate-950 hover:bg-slate-50">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="mb-5 grid grid-cols-[128px_1fr] items-center gap-6">
          <AvatarCircle src={profile.avatar} name={profile.name} className="h-28 w-28 text-3xl border-white shadow-sm" />
          <div className="grid grid-cols-3 gap-3 text-center">
            {[[profile.posts,"Posts"],[profile.followers,"Followers"],[profile.following,"Following"]].map(([v,l]) => {
              const clickable = l === "Followers" || l === "Following";
              return (
                <button
                  key={l}
                  type="button"
                  disabled={!clickable}
                  onClick={() => setFollowList(l === "Followers" ? "followers" : "following")}
                  className="disabled:cursor-default"
                >
                  <p className="text-2xl font-bold text-slate-950">{v}</p>
                  <p className="mt-1 text-base text-slate-500">{l}</p>
                </button>
              );
            })}
          </div>
        </div>

        <h1 className="mb-4 text-xl font-bold text-slate-950">{profile.name}</h1>

        <div className="mb-5 flex items-center gap-3 rounded-full bg-[#fff9f2] px-3 py-3 text-base text-slate-500">
          <div className="flex -space-x-2">
            <AvatarCircle src={profile.avatar} name={profile.name} size="sm" className="border-2 border-white bg-slate-100" />
            <span className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-teal-50 text-xs font-bold text-slate-500">+</span>
          </div>
          <span className="min-w-0 truncate">
            Followed by <b className="text-slate-950">{profile.name}</b>
          </span>
        </div>

        <div className="grid grid-cols-[1fr_1fr_52px] gap-3">
          {!profile.isSelf && (
          <button onClick={toggleFollow} disabled={followBusy}
            className={`flex items-center justify-center gap-2 rounded-2xl py-3 text-lg font-bold transition disabled:opacity-60 ${following ? "bg-teal-50 text-slate-950" : "text-white"}`}
            style={following ? {} : { background: TEAL }}>
            {following ? "Following" : "Follow"}
            {following && <ChevronDown className="h-5 w-5" />}
          </button>
          )}
          <button onClick={() => !profile.isSelf && onMessage(profile.userId)} className="rounded-2xl bg-teal-50 py-3 text-lg font-bold text-slate-950">Message</button>
          <button className="flex items-center justify-center rounded-2xl bg-teal-50 text-slate-950">
            <UserPlus className="h-6 w-6" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 border-t border-slate-100">
        {TABS.map(t => (
          <button key={t} onClick={() => setActiveTab(t)}
            className={`py-5 border-b-2 transition flex items-center justify-center ${activeTab === t ? "text-slate-950 border-slate-950" : "text-slate-500 border-transparent"}`}>
            {t === "Posts" && <Grid className="w-6 h-6" />}
            {t === "Reels" && <Film className="w-6 h-6" />}
            {t === "Tagged" && <Users className="w-6 h-6" />}
          </button>
        ))}
      </div>

      {activeTab === "Reels" ? (
        profile.reels.length === 0 ? (
          <div className="text-center py-16 text-gray-400 text-sm">No reels yet.</div>
        ) : (
          <div className="grid grid-cols-3 gap-0.5">
            {profile.reels.map((reel, index) => (
              <ProfileGridCell key={reel.id} media={{ id: reel.id, url: reel.video, type: "video" }} onClick={() => setSelectedReelIndex(index)} />
            ))}
          </div>
        )
      ) : activeTab === "Tagged" ? (
        <div className="text-center py-16 text-gray-400 text-sm">No tagged posts yet.</div>
      ) : profile.images.length === 0 ? (
        <div className="text-center py-16 text-gray-400 text-sm">No posts yet.</div>
      ) : (
        <div className="grid grid-cols-3 gap-0.5">
          {profile.images.map((media) => (
            <ProfileGridCell key={media.id} media={media} onClick={() => openProfileMedia(media)} />
          ))}
        </div>
      )}
    </div>
  );
}

// â”€â”€ HOME SECTION â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function HomeSection({ onUserClick }: { onUserClick: (userId: string) => void }) {
  const [stories, setStories] = useState<StoryItem[]>([{ id: "my", mine: true, label: "Your Story", avatar: null, segments: [], viewed: false }]);
  const [posts, setPosts] = useState<PostItem[]>([]);
  const [sponsoredAds, setSponsoredAds] = useState<SponsoredAd[]>([]);
  const [adConfig, setAdConfig] = useState<SocioAdConfig>({ adEveryN: 5, mode: "prefer_admin_then_admob" });
  const [myUserId, setMyUserId] = useState("");
  const [searches, setSearches] = useState<SearchItem[]>([]);
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([]);
  const [followedIds, setFollowedIds] = useState<Record<string, boolean>>({});
  const [followBusyId, setFollowBusyId] = useState<string | null>(null);
  const [loadingFeed, setLoadingFeed] = useState(true);
  const [q, setQ] = useState("");
  const [storyView, setStoryView] = useState<{ open: boolean; story: StoryItem | null }>({ open: false, story: null });
  const [showCreateStory, setShowCreateStory] = useState(false);
  const filtered = q ? searches.filter(s => s.name.toLowerCase().includes(q.toLowerCase())) : searches;

  const handleFollowSuggestion = async (userId: string) => {
    if (!userId || followBusyId) return;
    const already = followedIds[userId];
    setFollowBusyId(userId);
    try {
      if (already) {
        await socialApi.unfollowUser(userId);
        setFollowedIds((p) => ({ ...p, [userId]: false }));
      } else {
        await socialApi.followUser(userId);
        setFollowedIds((p) => ({ ...p, [userId]: true }));
      }
    } catch { /* ignore */ }
    finally { setFollowBusyId(null); }
  };

  const loadFeed = useCallback(async () => {
    try {
      setLoadingFeed(true);
      const [feedRes, storyRes, suggestionsRes, meRes, myStoriesRes, adsRes, adConfigRes] = await Promise.allSettled([
        socialApi.getPublicFeed({ limit: 20 }),
        socialApi.getStoryFeed(),
        socialApi.getSuggestions(),
        socialApi.getMyProfile(),
        socialApi.getMyStories(),
        socialApi.getSocioAds({ limit: 5 }),
        socialApi.getSocioAdConfig(),
      ]);
      if (feedRes.status === "fulfilled") {
        setPosts(feedRes.value.data.map(mapApiPostToPostItem));
      }
      if (adsRes.status === "fulfilled" && Array.isArray(adsRes.value)) {
        setSponsoredAds(adsRes.value);
      }
      if (adConfigRes.status === "fulfilled") setAdConfig(adConfigRes.value);
      if (meRes.status === "fulfilled") {
        setMyUserId(meRes.value.userId);
      }
      if (storyRes.status === "fulfilled" || myStoriesRes.status === "fulfilled" || meRes.status === "fulfilled") {
        setStories(buildStoryItems(
          myStoriesRes.status === "fulfilled" ? myStoriesRes.value : [],
          storyRes.status === "fulfilled" ? storyRes.value : [],
          meRes.status === "fulfilled" ? meRes.value : null,
        ));
      }
      if (suggestionsRes.status === "fulfilled" && Array.isArray(suggestionsRes.value)) {
        setSuggestions(suggestionsRes.value.map(mapApiSuggestion));
      }
    } catch { /* API may be unreachable */ }
    setLoadingFeed(false);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await loadFeed();
      if (cancelled) return;
    })();
    return () => { cancelled = true; };
  }, [loadFeed]);

  useEffect(() => {
    const onFollowChanged = (event: Event) => {
      const detail = (event as CustomEvent<{ userId?: string; isFollowing?: boolean }>).detail;
      if (!detail?.userId) return;
      setPosts((current) => current.map((post) =>
        String(post.userId) === String(detail.userId)
          ? { ...post, isFollowing: Boolean(detail.isFollowing) }
          : post,
      ));
      setFollowedIds((current) => ({ ...current, [String(detail.userId)]: Boolean(detail.isFollowing) }));
    };
    window.addEventListener("p4u:socio-follow-changed", onFollowChanged);
    return () => window.removeEventListener("p4u:socio-follow-changed", onFollowChanged);
  }, []);

  const markStoryViewed = useCallback((storyId: string | number) => {
    setStories((current) => current.map((item) => {
      const segments = item.segments.map((segment) => segment.id === storyId ? { ...segment, viewed: true } : segment);
      return { ...item, segments, viewed: segments.length > 0 && segments.every((segment) => segment.viewed) };
    }));
  }, []);

  const removeStorySegment = useCallback((storyId: string | number) => {
    const removeFromItem = (item: StoryItem): StoryItem => {
      const segments = item.segments.filter((segment) => segment.id !== storyId);
      return { ...item, segments, viewed: segments.length > 0 && segments.every((segment) => segment.viewed) };
    };
    setStories((current) => current
      .map(removeFromItem)
      .filter((item) => item.mine || item.segments.length > 0));
    setStoryView((current) => current.story ? { ...current, story: removeFromItem(current.story) } : current);
  }, []);

  return (
    <div className="w-full bg-[#F9FAFB] px-3 py-4 sm:px-4">
      {storyView.open && storyView.story && (
        <StoryViewer
          story={storyView.story}
          storyRail={stories}
          onClose={() => setStoryView({ open: false, story: null })}
          onStoryChange={(nextStory) => setStoryView({ open: true, story: nextStory })}
          onViewed={markStoryViewed}
          onDeleted={removeStorySegment}
        />
      )}
      {showCreateStory && <CreateStoryModal onClose={() => setShowCreateStory(false)} onCreated={loadFeed} />}

      <div className="mx-auto flex max-w-[980px] items-start gap-6 xl:mx-0">
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Stories */}
        <div className="shrink-0 bg-white rounded-2xl shadow-sm border border-gray-100 px-4 py-4 mb-5">
          <p className="text-xs font-semibold tracking-widest uppercase text-gray-400 mb-3">Stories</p>
          <div className="flex gap-3 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
            {stories.map((s, index) => (
              <Fragment key={s.id}>
                <StoryCircle story={s}
                  onCreate={() => setShowCreateStory(true)}
                  onClick={() => s.mine && s.segments.length === 0 ? setShowCreateStory(true) : setStoryView({ open: true, story: s })} />
                {(index + 1) % adConfig.adEveryN === 0
                  ? <HybridAdSlot slotIndex={(index + 1) / adConfig.adEveryN - 1} ads={sponsoredAds} config={adConfig} compact />
                  : null}
              </Fragment>
            ))}
          </div>
        </div>
        <div className="shrink-0 mb-5">
          <h2 className="mb-4 text-lg font-bold text-slate-950">People You May Know</h2>
          <div className="flex gap-4 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
            {suggestions.slice(0, 8).map((s) => (
              <div key={s.id} className="w-40 shrink-0 rounded-2xl border border-gray-100 bg-white p-4 text-center shadow-sm">
                <button onClick={() => onUserClick(s.userId)} className="mx-auto mb-3 block">
                  <AvatarCircle src={s.avatar} name={s.name} className="h-20 w-20 border-teal-200 text-2xl" />
                </button>
                <button onClick={() => onUserClick(s.userId)} className="block w-full truncate text-sm font-bold text-slate-950">{s.name}</button>
                <p className="mt-2 text-[11px] text-slate-500">1 mutual</p>
                <button
                  onClick={() => handleFollowSuggestion(s.userId)}
                  disabled={followBusyId === s.userId}
                  className={`mt-3 w-full rounded-full px-4 py-2 text-sm font-bold transition ${followedIds[s.userId] ? "bg-gray-100 text-gray-700" : "text-white"}`}
                  style={followedIds[s.userId] ? {} : { background: TEAL }}
                >
                  {followedIds[s.userId] ? "Following" : "Follow"}
                </button>
              </div>
            ))}
          </div>
        </div>
        <div className="pr-1">
          {loadingFeed && posts.length === 0 && (
            <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 text-teal-500 animate-spin" /></div>
          )}
          {!loadingFeed && posts.length === 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center mb-4">
              <p className="text-sm text-gray-400">No posts yet. Create a post to start the global feed.</p>
            </div>
          )}
          {posts.map((post, i) => {
            const showAdAfter = (i + 1) % adConfig.adEveryN === 0;
            return (
              <Fragment key={post.id}>
                <PostCard post={post} onUserClick={onUserClick} myUserId={myUserId} />
                {showAdAfter
                  ? <HybridAdSlot slotIndex={(i + 1) / adConfig.adEveryN - 1} ads={sponsoredAds} config={adConfig} />
                  : null}
              </Fragment>
            );
          })}
        </div>
      </div>

      {/* Sidebar */}
      <aside className="hidden w-72 shrink-0 space-y-6 self-start xl:block">
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <p className="mb-4 text-lg font-bold text-slate-950">Search</p>
          <div className="mb-5 flex items-center gap-3 rounded-2xl bg-gray-50 px-4 py-3">
            <Search className="h-5 w-5 shrink-0 text-slate-500" />
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search" className="min-w-0 flex-1 bg-transparent text-sm outline-none text-gray-700 placeholder:text-slate-500" />
          </div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-bold text-slate-500">Recent</span>
            {filtered.length > 0 && <button onClick={() => setSearches([])} className="text-[11px] text-teal-500 hover:underline">Clear all</button>}
          </div>
          <div className="space-y-2.5">
            {filtered.length === 0 ? (
              <p className="py-5 text-center text-[11px] text-slate-400">No recent searches</p>
            ) : filtered.map(r => (
              <div key={r.id} className="flex items-center gap-2.5">
                <button onClick={() => onUserClick(r.userId ?? r.name)}>
                  <AvatarCircle src={r.avatar} name={r.name} size="md" className="shrink-0 hover:ring-2 ring-teal-400 transition" />
                </button>
                <div className="flex-1 min-w-0">
                  <button onClick={() => onUserClick(r.userId ?? r.name)} className="text-xs font-semibold text-gray-800 flex items-center gap-1 hover:text-teal-600 transition">
                    {r.name}{r.verified && <span className="text-teal-500 text-[10px]">âœ“</span>}
                  </button>
                  {r.sub && <p className="text-[10px] text-gray-400 truncate">{r.sub}</p>}
                </div>
                <button onClick={() => setSearches(p => p.filter(x => x.id !== r.id))}><X className="w-3.5 h-3.5 text-gray-400 hover:text-gray-700" /></button>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-lg font-bold leading-tight text-slate-500">Suggestions for<br />you</span>
            <button className="text-sm font-bold text-teal-600 hover:underline">See<br />All</button>
          </div>
          <div className="space-y-3">
            {suggestions.map(s => (
              <div key={s.id} className="flex items-center gap-2.5">
                <button onClick={() => onUserClick(s.userId)}>
                  <AvatarCircle src={s.avatar} name={s.name} size="md" className="shrink-0 hover:ring-2 ring-teal-400 transition" />
                </button>
                <div className="flex-1 min-w-0">
                  <button onClick={() => onUserClick(s.userId)} className="text-xs font-semibold text-gray-800 truncate hover:text-teal-600 transition block">{s.name}</button>
                  <p className="text-[10px] text-gray-400">{s.sub}</p>
                </div>
                <button
                  onClick={() => handleFollowSuggestion(s.userId)}
                  disabled={followBusyId === s.userId}
                  className={`text-[11px] font-bold transition ${followedIds[s.userId] ? "text-gray-500" : "text-teal-500 hover:text-teal-700"}`}
                >
                  {followedIds[s.userId] ? "Following" : "Follow"}
                </button>
              </div>
            ))}
          </div>
        </div>
      </aside>
      </div>
    </div>
  );
}

// â”€â”€ EXPLORE SECTION â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function ExploreSection({ onUserClick }: { onUserClick: (userId: string) => void }) {
  const [tab, setTab] = useState("Top");
  const [activeCategory, setActiveCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [explorePosts, setExplorePosts] = useState<ExplorePostItem[]>([]);
  const [selectedMedia, setSelectedMedia] = useState<ProfileGridMedia | null>(null);
  const [selectedReelIndex, setSelectedReelIndex] = useState<number | null>(null);
  const [people, setPeople] = useState<{ userId: string; username: string; name: string; avatar: string; posts: number }[]>([]);
  const [followedIds, setFollowedIds] = useState<Record<string, boolean>>({});
  const [tags, setTags] = useState<{ tag: string; postCount: number }[]>([]);
  const [places, setPlaces] = useState<{ place: string; postCount: number }[]>([]);
  const [loadingExplore, setLoadingExplore] = useState(true);
  const categoryTabs = ["All", ...Array.from(new Map(
    explorePosts
      .map((post) => (post.category ?? "").trim())
      .filter(Boolean)
      .map((category) => [category.toLowerCase(), category] as const),
  ).values())];
  const filteredExplorePosts = activeCategory === "All"
    ? explorePosts
    : explorePosts.filter((post) => (post.category ?? "").trim().toLowerCase() === activeCategory.toLowerCase());
  const visibleExplorePosts = filteredExplorePosts;
  const exploreReels = filteredExplorePosts
    .map((post) => post.reel)
    .filter((reel): reel is ReelItem => Boolean(reel));

  const handleFollowPerson = async (userId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const already = followedIds[userId];
    try {
      if (already) {
        await socialApi.unfollowUser(userId);
        setFollowedIds((p) => ({ ...p, [userId]: false }));
      } else {
        await socialApi.followUser(userId);
        setFollowedIds((p) => ({ ...p, [userId]: true }));
      }
    } catch { /* ignore */ }
  };

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [feedRes, sugRes, tagsRes, placesRes] = await Promise.allSettled([
          socialApi.getPublicFeed({ limit: 18 }),
          socialApi.getSuggestions(),
          socialApi.getTrendingTags({ limit: 20 }),
          socialApi.getTrendingPlaces({ limit: 20 }),
        ]);
        if (cancelled) return;
        if (feedRes.status === "fulfilled") {
          setExplorePosts(feedRes.value.data.map((p, i) => {
            const reel = postToReelItem(p, i);
            const raw = reel?.video ?? p.imageUrl ?? p.mediaUrls?.[0] ?? "";
            const image = raw.trim() ? resolveMediaUrl(raw.trim()) || raw : "";
            return {
              id: p.id ?? i + 1,
              image,
              likes: p.likeCount,
              comments: p.commentCount,
              type: reel ? "video" : "image",
              reel: reel ?? undefined,
              category: p.category ?? null,
            };
          }));
        }
        if (sugRes.status === "fulfilled" && Array.isArray(sugRes.value)) {
          setPeople(
            sugRes.value.map((u) => {
              const uid = String(u.userId ?? u.id ?? "");
              const avatarRaw = u.userAvatar ?? u.avatarUrl ?? u.avatar ?? "";
              return {
                userId: uid,
                username: (u.name ?? "user").toLowerCase().replace(/\s+/g, "_"),
                name: u.name ?? "user",
                avatar: avatarRaw.trim() ? resolveMediaUrl(avatarRaw.trim()) || avatarRaw : "",
                posts: u.postCount ?? 0,
              };
            }),
          );
        }
        if (tagsRes.status === "fulfilled" && Array.isArray(tagsRes.value)) {
          setTags(tagsRes.value);
        }
        if (placesRes.status === "fulfilled" && Array.isArray(placesRes.value)) {
          setPlaces(placesRes.value);
        }
      } catch { /* API may be unreachable */ }
      if (!cancelled) setLoadingExplore(false);
    }
    load();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="mx-auto max-w-[680px] px-3 py-6 sm:px-4">
      {selectedMedia && <ProfileMediaModal media={selectedMedia} onClose={() => setSelectedMedia(null)} />}
      {selectedReelIndex != null && (
        <ProfileReelsViewer
          reels={exploreReels}
          initialIndex={selectedReelIndex}
          onClose={() => setSelectedReelIndex(null)}
          onUserClick={onUserClick}
        />
      )}
      <div className="mb-4 flex h-14 items-center gap-3 rounded-2xl bg-slate-100 px-5">
        <Search className="h-6 w-6 shrink-0 text-slate-500" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search" className="min-w-0 flex-1 bg-transparent text-xl outline-none text-slate-700 placeholder:text-slate-500" />
        {search && <button onClick={() => setSearch("")}><X className="w-4 h-4 text-gray-400" /></button>}
      </div>
      <div className="mb-4 -mx-3 overflow-x-auto px-3 pb-1 sm:-mx-4 sm:px-4" style={{ scrollbarWidth: "none" }}>
        <div className="flex min-w-max gap-3">
          {categoryTabs.map((category) => {
            const active = activeCategory === category;
            const label = category === "All" ? "For You" : category;
            return (
              <button
                key={category}
                onClick={() => {
                  setActiveCategory(category);
                  setTab("Top");
                }}
                className={`rounded-full px-6 py-2.5 text-base font-bold transition whitespace-nowrap ${active ? "bg-slate-950 text-white shadow-sm" : "bg-slate-100 text-slate-950 hover:bg-slate-200"}`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>
      {false && <div />}
      {tab === "People" ? (
        people.length === 0 ? <div className="text-center py-12 text-gray-400 text-sm">No suggestions available.</div> :
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
          {        people.map((p) => (
            <div key={p.userId} className="bg-white rounded-2xl p-4 flex flex-col items-center gap-2 border border-gray-100 shadow-sm hover:shadow-md transition cursor-pointer" onClick={() => onUserClick(p.userId)}>
              <AvatarCircle src={p.avatar} name={p.name} className="w-16 h-16 text-xl border-teal-300" />
              <p className="text-sm font-bold text-gray-900 text-center truncate w-full">{p.name}</p>
              <p className="text-xs text-gray-400">{p.posts} posts</p>
              <button
                onClick={(e) => handleFollowPerson(p.userId, e)}
                className={`text-xs font-bold px-4 py-1.5 rounded-full shadow ${followedIds[p.userId] ? "bg-gray-100 text-gray-700" : "text-white"}`}
                style={followedIds[p.userId] ? {} : { background: TEAL }}
              >
                {followedIds[p.userId] ? "Following" : "Follow"}
              </button>
            </div>
          ))}
        </div>
      ) : tab === "Tags" ? (
        tags.length === 0 ? (
          <div className="text-center py-12 text-gray-400 text-sm">No trending tags yet.</div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {tags
              .filter((t) => !search.trim() || t.tag.toLowerCase().includes(search.toLowerCase()))
              .map((t) => (
                <span
                  key={t.tag}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-gray-200 text-sm font-semibold text-teal-700 shadow-sm"
                >
                  #{t.tag}
                  <span className="text-xs text-gray-400 font-normal">{t.postCount} posts</span>
                </span>
              ))}
          </div>
        )
      ) : tab === "Places" ? (
        places.length === 0 ? (
          <div className="text-center py-12 text-gray-400 text-sm">No places yet.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {places
              .filter((p) => !search.trim() || p.place.toLowerCase().includes(search.toLowerCase()))
              .map((p) => (
                <div key={p.place} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-gray-900">{p.place}</p>
                    <p className="text-xs text-gray-400">{p.postCount} posts</p>
                  </div>
                  <span className="text-lg">ðŸ“</span>
                </div>
              ))}
          </div>
        )
      ) : (
        <>
        {loadingExplore && explorePosts.length === 0 && <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 text-teal-500 animate-spin" /></div>}
        {!loadingExplore && explorePosts.length === 0 && <div className="text-center py-12 text-gray-400 text-sm">No posts to explore yet.</div>}
        {!loadingExplore && explorePosts.length > 0 && visibleExplorePosts.length === 0 && (
          <div className="rounded-2xl border border-gray-100 bg-white px-6 py-12 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-teal-50 text-teal-600">
              <Compass className="h-8 w-8" />
            </div>
            <p className="text-sm font-semibold text-gray-800">No posts available in this category.</p>
            <p className="mt-1 text-xs text-gray-400">Try another category or switch back to All.</p>
          </div>
        )}
        <div className="grid grid-cols-2 gap-0.5 sm:grid-cols-3">
          {visibleExplorePosts.map(post => (
            <ExploreMediaCell
              key={post.id}
              post={post}
              onClick={() => {
                if (post.reel) {
                  const reelIndex = exploreReels.findIndex((reel) => reel.postId === post.reel?.postId);
                  setSelectedReelIndex(Math.max(0, reelIndex));
                } else {
                  setSelectedMedia({ id: post.id, url: post.image, type: "image" });
                }
              }}
            />
          ))}
        </div>
        </>
      )}
    </div>
  );
}

// â”€â”€ REELS SECTION â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function ReelCard({
  reel,
  globalMuted,
  onMuteToggle,
  onUserClick,
  mode = "page",
}: {
  reel: ReelItem;
  globalMuted: boolean;
  onMuteToggle: () => void;
  onUserClick: (userId: string) => void;
  mode?: "page" | "fullscreen";
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);
  const [liked, setLiked] = useState(reel.isLiked ?? false);
  const [likes, setLikes] = useState(reel.likes);
  const [saved, setSaved] = useState(reel.isSaved ?? false);
  const [following, setFollowing] = useState(reel.isFollowing ?? false);
  const [commentCount, setCommentCount] = useState(reel.comments);
  const [shares, setShares] = useState(reel.shares);
  const [comments, setComments] = useState<{ id: string | number; user: string; avatar?: string | null; text: string }[]>([]);
  const [commentsLoaded, setCommentsLoaded] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [showComments, setShowComments] = useState(false);
  const [captionOpen, setCaptionOpen] = useState(false);
  const [progress, setProgress] = useState(0);
  const [busy, setBusy] = useState<string | null>(null);
  const [commentSheetExpanded, setCommentSheetExpanded] = useState(false);
  const [commentDragStart, setCommentDragStart] = useState<number | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    const video = videoRef.current;
    if (!el || !video) return;
    const key = String(reel.postId);
    const pauseForOther = (event: Event) => {
      const detail = (event as CustomEvent<{ postId?: string }>).detail;
      if (detail?.postId !== key) video.pause();
    };
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return;
        if (entry.isIntersecting && entry.intersectionRatio >= 0.72) {
          window.dispatchEvent(new CustomEvent("socio-reel-play", { detail: { postId: key } }));
          void video.play().catch(() => {});
        } else {
          video.pause();
        }
      },
      { threshold: [0, 0.35, 0.72, 1] },
    );
    observer.observe(el);
    window.addEventListener("socio-reel-play", pauseForOther);
    return () => {
      observer.disconnect();
      window.removeEventListener("socio-reel-play", pauseForOther);
      video.pause();
    };
  }, [reel.postId]);

  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = globalMuted;
  }, [globalMuted]);

  useEffect(() => {
    const onFollowChanged = (event: Event) => {
      const detail = (event as CustomEvent<{ userId?: string; isFollowing?: boolean }>).detail;
      if (!detail?.userId || String(detail.userId) !== String(reel.userId)) return;
      setFollowing(Boolean(detail.isFollowing));
    };
    window.addEventListener("p4u:socio-follow-changed", onFollowChanged);
    return () => window.removeEventListener("p4u:socio-follow-changed", onFollowChanged);
  }, [reel.userId]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) void video.play().catch(() => {});
    else video.pause();
  };

  const toggleLike = async () => {
    if (busy === "like") return;
    const next = !liked;
    setLiked(next);
    setLikes((v) => next ? v + 1 : Math.max(0, v - 1));
    setBusy("like");
    try {
      if (next) await socialApi.likePost(reel.postId);
      else await socialApi.unlikePost(reel.postId);
    } catch {
      setLiked(!next);
      setLikes((v) => next ? Math.max(0, v - 1) : v + 1);
    } finally {
      setBusy(null);
    }
  };

  const toggleSave = async () => {
    if (busy === "save") return;
    const next = !saved;
    setSaved(next);
    setBusy("save");
    try {
      if (next) await socialApi.savePost(reel.postId);
      else await socialApi.unsavePost(reel.postId);
    } catch {
      setSaved(!next);
    } finally {
      setBusy(null);
    }
  };

  const toggleFollow = async () => {
    if (!reel.userId || reel.isSelf || busy === "follow") return;
    const next = !following;
    setFollowing(next);
    setBusy("follow");
    try {
      if (next) await socialApi.followUser(reel.userId);
      else await socialApi.unfollowUser(reel.userId);
    } catch {
      setFollowing(!next);
    } finally {
      setBusy(null);
    }
  };

  const handleShare = async () => {
    try {
      await socialApi.sharePost(reel.postId);
      setShares((v) => v + 1);
      if (navigator.share) await navigator.share({ title: "P4U Reel", text: reel.caption, url: window.location.href }).catch(() => {});
      else if (navigator.clipboard) await navigator.clipboard.writeText(window.location.href);
    } catch { /* ignore */ }
  };

  const openComments = async () => {
    setShowComments(true);
    if (commentsLoaded) return;
    try {
      const rows = await socialApi.getComments(reel.postId);
      setComments(rows.map((c) => ({ id: c.id, user: c.userName ?? "user", avatar: c.userAvatar ?? null, text: c.content })));
      setCommentCount((prev) => Math.max(prev, rows.length));
    } catch { /* ignore */ }
    setCommentsLoaded(true);
  };

  const submitComment = async () => {
    const text = commentText.trim();
    if (!text || busy === "comment") return;
    const tempId = `temp-${Date.now()}`;
    setCommentText("");
    setComments((list) => [...list, { id: tempId, user: "You", text }]);
    setCommentCount((c) => c + 1);
    setBusy("comment");
    try {
      const savedComment = await socialApi.createComment(reel.postId, { contentText: text });
      setComments((list) => list.map((c) => c.id === tempId ? { id: savedComment.id, user: savedComment.userName ?? "You", avatar: savedComment.userAvatar ?? null, text: savedComment.content || text } : c));
    } catch {
      setComments((list) => list.filter((c) => c.id !== tempId));
      setCommentCount((c) => Math.max(0, c - 1));
    } finally {
      setBusy(null);
    }
  };

  const longCaption = reel.caption.length > 95;
  const shownCaption = captionOpen || !longCaption ? reel.caption : `${reel.caption.slice(0, 95).trim()}...`;
  const isFullscreen = mode === "fullscreen";
  const closeComments = () => {
    setShowComments(false);
    setCommentSheetExpanded(false);
    setCommentDragStart(null);
  };
  const handleCommentDragEnd = (clientY: number) => {
    if (commentDragStart == null) return;
    const delta = clientY - commentDragStart;
    if (delta > 80) closeComments();
    else if (delta < -60) setCommentSheetExpanded(true);
    else if (delta > 24) setCommentSheetExpanded(false);
    setCommentDragStart(null);
  };
  const renderCommentsPanel = (variant: "desktop" | "mobile") => (
    <div
      className={
        variant === "desktop"
          ? "hidden h-[min(78vh,720px)] w-[min(33vw,460px)] min-w-[420px] translate-x-0 flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-xl transition-transform duration-300 md:flex"
          : `fixed inset-x-0 bottom-0 z-40 flex flex-col overflow-hidden rounded-t-3xl border border-slate-100 bg-white shadow-2xl transition-transform duration-300 md:hidden ${commentSheetExpanded ? "h-[88vh]" : "h-[75vh]"}`
      }
      onClick={(event) => event.stopPropagation()}
    >
      {variant === "mobile" && (
        <div
          className="flex cursor-grab justify-center px-4 pb-1 pt-3"
          onPointerDown={(event) => setCommentDragStart(event.clientY)}
          onPointerUp={(event) => handleCommentDragEnd(event.clientY)}
          onPointerCancel={() => setCommentDragStart(null)}
        >
          <span className="h-1.5 w-12 rounded-full bg-slate-300" />
        </div>
      )}
      <div className="flex shrink-0 items-center gap-3 border-b border-slate-100 px-5 py-4">
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-bold text-slate-950">Comments</h3>
          <p className="text-xs text-slate-500">{commentCount.toLocaleString()} comments</p>
        </div>
        <button className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600">Sort</button>
        <button onClick={closeComments} className="rounded-full p-1.5 hover:bg-slate-100"><X className="h-5 w-5 text-slate-950" /></button>
      </div>
      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-4">
        {comments.length === 0 ? (
          <p className="py-10 text-center text-sm text-slate-400">No comments yet.</p>
        ) : comments.map((comment) => (
          <div key={comment.id} className="flex items-start gap-3">
            <AvatarCircle src={comment.avatar} name={comment.user} size="sm" className="shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate text-sm font-bold text-slate-950">{comment.user}</p>
                <span className="text-xs text-slate-400">now</span>
                <button className="ml-auto rounded-full p-1 hover:bg-slate-100"><MoreHorizontal className="h-4 w-4 text-slate-500" /></button>
              </div>
              <p className="mt-1 text-sm leading-snug text-slate-700">{comment.text}</p>
              <div className="mt-2 flex items-center gap-4 text-xs font-semibold text-slate-500">
                <button className="inline-flex items-center gap-1 hover:text-slate-950"><ThumbsUp className="h-4 w-4" />0</button>
                <button className="hover:text-slate-950"><ThumbsDown className="h-4 w-4" /></button>
                <button className="hover:text-slate-950">Reply</button>
                <button className="text-teal-600 hover:text-teal-700">0 replies</button>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="shrink-0 border-t border-slate-100 bg-white px-4 py-3">
        <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2">
          <button onClick={() => setCommentText((value) => `${value}😊`)} className="text-slate-500"><Smile className="h-5 w-5" /></button>
          <input
            value={commentText}
            onChange={(event) => setCommentText(event.target.value)}
            onKeyDown={(event) => { if (event.key === "Enter") void submitComment(); }}
            placeholder="Add a comment..."
            className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400"
          />
          <button onClick={submitComment} disabled={!commentText.trim() || busy === "comment"} className="rounded-full px-2 py-1 text-sm font-bold text-teal-600 disabled:text-slate-300">
            <Send className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <section ref={containerRef} className={isFullscreen ? "flex h-[100dvh] w-full snap-start snap-always items-center justify-center overflow-hidden bg-black p-0" : `flex min-h-[calc(100vh-96px)] w-full snap-start snap-always items-center justify-center bg-white px-4 py-8 transition-[gap] duration-300 ${showComments ? "gap-4 lg:gap-6" : ""}`}>
      <div className={isFullscreen ? "relative h-full w-full max-w-[760px] overflow-hidden bg-black shadow-2xl sm:w-[min(76vw,760px)]" : "relative aspect-[9/16] h-[min(78vh,720px)] min-h-[560px] w-[min(430px,calc(100vw-7rem))] max-w-[430px] overflow-hidden rounded-2xl bg-black shadow-xl"}>
        <video
          ref={videoRef}
          src={reel.video}
          className="block h-full w-full object-cover"
          loop
          playsInline
          muted={globalMuted}
          preload="metadata"
          onLoadedMetadata={(event) => {
            setProgress(0);
            const next = containerRef.current?.nextElementSibling?.querySelector("video") as HTMLVideoElement | null;
            next?.load();
          }}
          onTimeUpdate={(event) => {
            const video = event.currentTarget;
            if (video.duration) setProgress((video.currentTime / video.duration) * 100);
          }}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
        />
        <button type="button" aria-label="Mute or unmute reel" onClick={onMuteToggle} onDoubleClick={(event) => { event.preventDefault(); if (!liked) void toggleLike(); }} className="absolute inset-0" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/5 to-black/25" />
        {!playing && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-black/35">
              <Play className="ml-1 h-8 w-8 fill-white text-white" />
            </div>
          </div>
        )}

      <div className={`${isFullscreen ? "absolute right-3 bottom-24 z-10 flex" : "hidden"} flex-col items-center gap-5 text-white`}>
        <button onClick={() => reel.userId && onUserClick(reel.userId)} className="overflow-hidden rounded-full border-2 border-white">
          <AvatarCircle src={reel.avatar} name={reel.username} size="md" />
        </button>
        <button onClick={toggleLike} disabled={busy === "like"} className="flex flex-col items-center gap-1 disabled:opacity-60">
          <Heart className={`h-8 w-8 ${liked ? "fill-red-500 text-red-500" : "text-white"}`} />
          <span className="text-xs font-bold">{likes.toLocaleString()}</span>
        </button>
        <button onClick={openComments} className="flex flex-col items-center gap-1">
          <MessageCircle className="h-8 w-8 text-white" />
          <span className="text-xs font-bold">{commentCount.toLocaleString()}</span>
        </button>
        <button onClick={handleShare} className="flex flex-col items-center gap-1">
          <Send className="h-8 w-8 text-white" />
          <span className="text-xs font-bold">{shares.toLocaleString()}</span>
        </button>
        <button onClick={toggleSave} disabled={busy === "save"} className="disabled:opacity-60">
          <Bookmark className={`h-8 w-8 ${saved ? "fill-white text-white" : "text-white"}`} />
        </button>
        <button onClick={onMuteToggle} className="rounded-full bg-black/35 p-2">
          {globalMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
        </button>
      </div>

      <div className="absolute bottom-8 left-4 right-20 z-10 text-white">
        <div className="mb-2 flex items-center gap-2">
          {!isFullscreen && <AvatarCircle src={reel.avatar} name={reel.username} size="sm" className="border border-white/70" />}
          <button onClick={() => reel.userId && onUserClick(reel.userId)} className="text-sm font-bold hover:underline">{reel.username}</button>
          {!reel.isSelf && (
            <button onClick={toggleFollow} disabled={busy === "follow"} className="rounded-full border border-white/70 px-3 py-1 text-xs font-bold disabled:opacity-60">
              {following ? "Following" : "Follow"}
            </button>
          )}
        </div>
        {reel.caption && (
          <p className="text-sm leading-snug text-white/95">
            {shownCaption}
            {longCaption && (
              <button onClick={() => setCaptionOpen((v) => !v)} className="ml-1 font-semibold text-white/75">
                {captionOpen ? "less" : "See more"}
              </button>
            )}
          </p>
        )}
        <div className="mt-2 flex items-center gap-2 text-xs text-white/75">
          <span>{reel.audio || `Original audio - ${reel.username}`}</span>
          {reel.createdAt && <span>• {formatRelativeTime(reel.createdAt)}</span>}
          {typeof reel.views === "number" && <span>• {reel.views.toLocaleString()} views</span>}
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/20">
        <div className="h-full bg-white" style={{ width: `${progress}%` }} />
      </div>

      </div>
      {!isFullscreen && (
        <div className="z-10 ml-2 flex shrink-0 flex-col items-center gap-5 pb-2 text-slate-950 sm:ml-3">
          <button onClick={() => reel.userId && onUserClick(reel.userId)} className="overflow-hidden rounded-full border border-slate-200 bg-white shadow-sm">
            <AvatarCircle src={reel.avatar} name={reel.username} size="md" />
          </button>
          <button onClick={toggleLike} disabled={busy === "like"} className="flex flex-col items-center gap-1 disabled:opacity-60">
            <Heart className={`h-8 w-8 ${liked ? "fill-red-500 text-red-500" : "text-slate-950"}`} />
            <span className="text-xs font-bold text-slate-700">{likes.toLocaleString()}</span>
          </button>
          <button onClick={openComments} className="flex flex-col items-center gap-1">
            <MessageCircle className="h-8 w-8 text-slate-950" />
            <span className="text-xs font-bold text-slate-700">{commentCount.toLocaleString()}</span>
          </button>
          <button onClick={handleShare} className="flex flex-col items-center gap-1">
            <Send className="h-8 w-8 text-slate-950" />
            <span className="text-xs font-bold text-slate-700">{shares.toLocaleString()}</span>
          </button>
          <button onClick={toggleSave} disabled={busy === "save"} className="disabled:opacity-60">
            <Bookmark className={`h-8 w-8 ${saved ? "fill-slate-950 text-slate-950" : "text-slate-950"}`} />
          </button>
          <button onClick={onMuteToggle} className="rounded-full bg-slate-100 p-2">
            {globalMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
          </button>
        </div>
      )}
      {showComments && !isFullscreen && renderCommentsPanel("desktop")}
      {showComments && !isFullscreen && (
        <div className="fixed inset-0 z-30 bg-black/20 md:hidden" onClick={closeComments} />
      )}
      {showComments && !isFullscreen && renderCommentsPanel("mobile")}
      {showComments && isFullscreen && renderCommentsPanel("mobile")}
    </section>
  );
}

function ReelsSection({ onUserClick }: { onUserClick: (userId: string) => void }) {
  const [globalMuted, setGlobalMuted] = useState(true);
  const [reels, setReels] = useState<ReelItem[]>([]);
  const [loadingReels, setLoadingReels] = useState(true);

  useEffect(() => {
    let cancelled = false;
    socialApi.getPublicFeed({ limit: 80 })
      .then((res) => {
        if (cancelled) return;
        setReels(res.data.filter(isVideoPost).map((p, i) => {
          const videoRaw = p.mediaUrls?.find((u) => /\.(mp4|webm|mov|m4v)(\?|$)/i.test(u)) ?? p.mediaUrls?.[0] ?? p.imageUrl ?? "";
          const avatarRaw = p.userAvatar ?? "";
          return {
            id: p.id ?? i,
            postId: p.id,
            userId: String(p.userId ?? ""),
            username: p.userName ?? "user",
            user: p.userName ?? "user",
            caption: p.content ?? "",
            video: videoRaw.trim() ? resolveMediaUrl(videoRaw.trim()) || videoRaw : "",
            likes: p.likeCount,
            comments: p.commentCount,
            shares: p.shareCount ?? 0,
            avatar: avatarRaw.trim() ? resolveMediaUrl(avatarRaw.trim()) || avatarRaw : "",
            isLiked: p.isLiked,
            isSaved: p.isSaved,
            isFollowing: p.isFollowing,
            isSelf: p.isSelf,
            createdAt: p.createdAt,
            audio: "Original audio",
          };
        }).filter((reel) => Boolean(reel.video)));
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoadingReels(false); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const onFollowChanged = (event: Event) => {
      const detail = (event as CustomEvent<{ userId?: string; isFollowing?: boolean }>).detail;
      if (!detail?.userId) return;
      setReels((current) => current.map((reel) =>
        String(reel.userId) === String(detail.userId)
          ? { ...reel, isFollowing: Boolean(detail.isFollowing) }
          : reel,
      ));
    };
    window.addEventListener("p4u:socio-follow-changed", onFollowChanged);
    return () => window.removeEventListener("p4u:socio-follow-changed", onFollowChanged);
  }, []);

  return (
    <div className="relative bg-white">
      <div className="flex items-center justify-between border-b border-slate-100 bg-white px-5 py-4 text-slate-950">
        <h1 className="text-xl font-black">Reels</h1>
        <Camera className="h-6 w-6 text-slate-700" />
      </div>
      {loadingReels && reels.length === 0 && (
        <div className="flex min-h-[calc(100vh-160px)] flex-col items-center justify-center text-slate-500">
          <Loader2 className="mb-3 h-8 w-8 animate-spin text-teal-400" />
          <p className="text-sm">Loading reels...</p>
        </div>
      )}
      {!loadingReels && reels.length === 0 && (
        <div className="flex min-h-[calc(100vh-160px)] flex-col items-center justify-center px-6 text-center text-slate-500">
          <Film className="mb-3 h-12 w-12" />
          <p className="text-sm">No video posts yet. Share a video from Create to see it here.</p>
        </div>
      )}
      <div className="snap-y snap-mandatory scroll-smooth">
        {reels.map((reel) => (
          <ReelCard
            key={reel.id}
            reel={reel}
            globalMuted={globalMuted}
            onMuteToggle={() => setGlobalMuted((v) => !v)}
            onUserClick={onUserClick}
          />
        ))}
      </div>
    </div>
  );
}

// ── MESSAGES SECTION ───────────────────────────────────────────────────────────
function MessagesSection({
  onUserClick,
  pendingUserId,
  onPendingHandled,
}: {
  onUserClick: (userId: string) => void;
  pendingUserId?: string | null;
  onPendingHandled?: () => void;
}) {
  const [tab, setTab] = useState<"primary" | "requests">("primary");
  const [query, setQuery] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [showChat, setShowChat] = useState(false);
  const [input, setInput] = useState("");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [messagesError, setMessagesError] = useState<string | null>(null);
  const [viewer, setViewer] = useState<string | null>(null);
  const [showNewChat, setShowNewChat] = useState(false);
  const [newChatSuggestions, setNewChatSuggestions] = useState<SuggestionItem[]>([]);
  const [newChatLoading, setNewChatLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesScrollRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [activeCall,setActiveCall]=useState<SocialCall|null>(null);
  const [callError,setCallError]=useState('');
  const [localCallStream,setLocalCallStream]=useState<MediaStream|null>(null);
  const [remoteCallStream,setRemoteCallStream]=useState<MediaStream|null>(null);
  const callPeerRef=useRef<RTCPeerConnection|null>(null);
  const callInitiatorRef=useRef(false);
  const localVideoRef=useRef<HTMLVideoElement>(null),remoteVideoRef=useRef<HTMLVideoElement>(null);
  const waitForIce=(pc:RTCPeerConnection)=>new Promise<void>(resolve=>{if(pc.iceGatheringState==='complete')return resolve();const done=()=>{if(pc.iceGatheringState==='complete'){pc.removeEventListener('icegatheringstatechange',done);resolve();}};pc.addEventListener('icegatheringstatechange',done);window.setTimeout(()=>{pc.removeEventListener('icegatheringstatechange',done);resolve();},2500);});
  const preparePeer=async(type:'audio'|'video')=>{const stream=await navigator.mediaDevices.getUserMedia({audio:true,video:type==='video'});const pc=new RTCPeerConnection({iceServers:[{urls:'stun:stun.l.google.com:19302'}]});stream.getTracks().forEach(track=>pc.addTrack(track,stream));pc.ontrack=e=>setRemoteCallStream(e.streams[0]||new MediaStream([e.track]));callPeerRef.current=pc;setLocalCallStream(stream);return pc;};
  const closePeer=useCallback(()=>{callPeerRef.current?.close();callPeerRef.current=null;localCallStream?.getTracks().forEach(t=>t.stop());remoteCallStream?.getTracks().forEach(t=>t.stop());setLocalCallStream(null);setRemoteCallStream(null);},[localCallStream,remoteCallStream]);
  const startCall=async(type:'audio'|'video')=>{if(!activeId)return;setCallError('');try{callInitiatorRef.current=true;const pc=await preparePeer(type);await pc.setLocalDescription(await pc.createOffer());await waitForIce(pc);setActiveCall(await socialApi.startCall(activeId,type,pc.localDescription?.sdp));}catch(e){closePeer();setCallError(e instanceof Error?e.message:'Unable to start call');}};
  const acceptIncomingCall=async()=>{if(!activeCall)return;setCallError('');try{callInitiatorRef.current=false;const pc=await preparePeer(activeCall.call_type);if(!activeCall.offer_sdp)throw new Error('Call offer is missing');await pc.setRemoteDescription({type:'offer',sdp:activeCall.offer_sdp});await pc.setLocalDescription(await pc.createAnswer());await waitForIce(pc);setActiveCall(await socialApi.acceptCall(activeCall.id,pc.localDescription?.sdp));}catch(e){closePeer();setCallError(e instanceof Error?e.message:'Unable to answer call');}};
  const finishCall=async(reject=false)=>{if(activeCall){try{await(reject?socialApi.rejectCall(activeCall.id):socialApi.endCall(activeCall.id));}catch{}}closePeer();setActiveCall(null);};
  useEffect(()=>{if(activeCall)return;const poll=async()=>{try{const calls=await socialApi.listCalls();const incoming=calls.find(c=>c.status==='ringing'&&conversations.some(x=>String(x.id)===c.conversation_id&&x.participantId===c.caller_id));if(incoming)setActiveCall(incoming);}catch{}};void poll();const timer=window.setInterval(poll,5000);return()=>window.clearInterval(timer);},[activeCall,conversations]);
  useEffect(()=>{if(!activeCall)return;let cancelled=false;const poll=async()=>{try{const next=await socialApi.getCall(activeCall.id);if(cancelled)return;setActiveCall(next);if(callInitiatorRef.current&&next.status==='accepted'&&next.answer_sdp&&callPeerRef.current&&!callPeerRef.current.remoteDescription)await callPeerRef.current.setRemoteDescription({type:'answer',sdp:next.answer_sdp});if(['rejected','ended','missed'].includes(next.status)){closePeer();setActiveCall(null);}}catch{}};const timer=window.setInterval(poll,2000);return()=>{cancelled=true;window.clearInterval(timer);};},[activeCall?.id,closePeer]);
  useEffect(()=>{if(localVideoRef.current)localVideoRef.current.srcObject=localCallStream;if(remoteVideoRef.current)remoteVideoRef.current.srcObject=remoteCallStream;},[localCallStream,remoteCallStream,activeCall]);

  const activeConversation = conversations.find((conversation) => String(conversation.id) === activeId) ?? null;
  const sortConversations = useCallback((rows: Conversation[]) => {
    return [...rows].sort((a, b) => {
      const aTime = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
      const bTime = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
      return bTime - aTime;
    });
  }, []);
  const sortMessages = useCallback((rows: DirectMessage[]) => {
    return [...rows].sort((a, b) => {
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return aTime - bTime;
    });
  }, []);
  const visibleConversations = conversations
    .filter((conversation) => (tab === "requests" ? conversation.isRequest : !conversation.isRequest))
    .filter((conversation) => {
      if (!query.trim()) return true;
      const q = query.toLowerCase();
      return (
        conversation.participantName.toLowerCase().includes(q)
        || conversation.participantId.toLowerCase().includes(q)
        || (conversation.lastMessage ?? "").toLowerCase().includes(q)
      );
    });

  const loadConversations = useCallback(async (silent = false) => {
    if (!silent) setLoadingList(true);
    setListError(null);
    try {
      apiClient.clearGetCache("/api/v1/social/messages/conversations");
      const rows = await socialApi.getConversations();
      setConversations(sortConversations(rows));
    } catch (err) {
      setListError(err instanceof Error ? err.message : "Could not load conversations.");
      if (!silent) setConversations([]);
    } finally {
      if (!silent) setLoadingList(false);
    }
  }, [sortConversations]);

  useEffect(() => {
    void loadConversations();
    const poll = window.setInterval(() => { void loadConversations(true); }, 12000);
    const onVisible = () => {
      if (document.visibilityState === "visible") void loadConversations(true);
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(poll);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [loadConversations]);

  const loadMessages = useCallback(async (conversationId: string) => {
    setLoadingMessages(true);
    setMessagesError(null);
    try {
      const rows = await socialApi.getMessages(conversationId, { limit: 100 });
      setMessages(sortMessages(rows));
    } catch (err) {
      setMessagesError(err instanceof Error ? err.message : "Could not load messages.");
      setMessages([]);
    } finally {
      setLoadingMessages(false);
    }
  }, [sortMessages]);

  useEffect(() => {
    const scroller = messagesScrollRef.current;
    if (!scroller) return;
    window.requestAnimationFrame(() => {
      scroller.scrollTo({ top: scroller.scrollHeight, behavior: "smooth" });
    });
  }, [activeId, messages]);

  useEffect(() => {
    if (!activeId) return;
    let cancelled = false;
    const poll = window.setInterval(async () => {
      try {
        const rows = await socialApi.getMessages(activeId, { limit: 100 });
        if (cancelled) return;
        setMessages((current) => {
          const pending = current.filter((message) => String(message.id).startsWith("pending-"));
          return sortMessages([...rows, ...pending]);
        });
        await socialApi.markConversationRead(activeId);
        if (!cancelled) {
          setConversations((current) =>
            current.map((row) => (String(row.id) === activeId ? { ...row, unreadCount: 0 } : row)),
          );
        }
      } catch {
        /* keep the current chat visible if background refresh fails */
      }
    }, 5000);
    return () => {
      cancelled = true;
      window.clearInterval(poll);
    };
  }, [activeId, sortMessages]);

  const openConversation = useCallback(async (conversationId: string) => {
    setActiveId(conversationId);
    setShowChat(true);
    setMessages([]);
    await loadMessages(conversationId);
    try {
      await socialApi.markConversationRead(conversationId);
      setConversations((rows) =>
        rows.map((row) => (String(row.id) === conversationId ? { ...row, unreadCount: 0, isRequest: tab === "requests" ? false : row.isRequest } : row)),
      );
    } catch {
      /* non-blocking */
    }
  }, [loadMessages, tab]);

  useEffect(() => {
    if (!pendingUserId) return;
    let cancelled = false;
    const openPendingConversation = async () => {
      setListError(null);
      setNewChatLoading(true);
      try {
        const conv = await socialApi.openConversation(pendingUserId);
        if (cancelled) return;
        setTab("primary");
        setShowNewChat(false);
        setConversations((rows) => {
          const exists = rows.some((row) => String(row.id) === String(conv.id));
          const merged = exists ? rows.map((row) => (String(row.id) === String(conv.id) ? conv : row)) : [conv, ...rows];
          return sortConversations(merged);
        });
        await openConversation(String(conv.id));
        if (!cancelled) {
          onPendingHandled?.();
          void loadConversations(true);
        }
      } catch (err) {
        if (!cancelled) {
          setListError(err instanceof Error ? err.message : "Could not open conversation.");
          onPendingHandled?.();
        }
      } finally {
        if (!cancelled) setNewChatLoading(false);
      }
    };
    void openPendingConversation();
    return () => { cancelled = true; };
  }, [loadConversations, onPendingHandled, openConversation, pendingUserId, sortConversations]);

  const startConversation = async (participantId: string) => {
    setNewChatLoading(true);
    try {
      const conv = await socialApi.openConversation(participantId);
      setConversations((rows) => {
        const exists = rows.some((row) => String(row.id) === String(conv.id));
        const merged = exists ? rows.map((row) => (String(row.id) === String(conv.id) ? conv : row)) : [conv, ...rows];
        return sortConversations(merged);
      });
      setShowNewChat(false);
      await openConversation(String(conv.id));
      void loadConversations(true);
    } catch (err) {
      setListError(err instanceof Error ? err.message : "Could not start conversation.");
    } finally {
      setNewChatLoading(false);
    }
  };

  const openNewChatModal = async () => {
    setShowNewChat(true);
    setNewChatLoading(true);
    try {
      const rows = await socialApi.getSuggestions({ limit: 12 });
      setNewChatSuggestions(rows.map(mapApiSuggestion));
    } catch {
      setNewChatSuggestions([]);
    } finally {
      setNewChatLoading(false);
    }
  };

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || !activeId || sending) return;
    await sendChatPayload({ content: text });
  };

  const sendChatPayload = async (payload: { content?: string; mediaUrl?: string; mediaType?: "image" | "video" }) => {
    if (!activeId || sending) return;
    const text = payload.content?.trim() ?? "";
    const optimisticId = `pending-${Date.now()}`;
    const optimistic: DirectMessage = {
      id: optimisticId,
      conversationId: activeId,
      senderId: "me",
      content: text || null,
      mediaUrl: payload.mediaUrl ?? null,
      mediaType: payload.mediaType ?? null,
      createdAt: new Date().toISOString(),
      isMine: true,
      status: "sending",
    };
    setMessages((rows) => [...rows, optimistic]);
    setInput("");
    setSending(true);
    try {
      const saved = await socialApi.sendMessage(activeId, payload);
      setMessages((rows) => rows.map((row) => (row.id === optimisticId ? saved : row)));
      const preview = text || (payload.mediaType === "video" ? "Video" : "Photo");
      setConversations((rows) => {
        const updated = rows.map((row) =>
          String(row.id) === activeId
            ? { ...row, lastMessage: preview, lastMessageAt: saved.createdAt, unreadCount: 0 }
            : row,
        );
        return updated.some((row) => String(row.id) === activeId)
          ? sortConversations(updated)
          : [{ id: activeId, participantId: "", participantName: "Chat", unreadCount: 0, lastMessage: preview, lastMessageAt: saved.createdAt }, ...updated];
      });
      void loadConversations(true);
    } catch (err) {
      setMessages((rows) => rows.filter((row) => row.id !== optimisticId));
      if (text) setInput(text);
      setMessagesError(err instanceof Error ? err.message : "Could not send message.");
    } finally {
      setSending(false);
    }
  };

  const sendImageMessage = async (file: File) => {
    if (!activeId || uploadingImage) return;
    setUploadingImage(true);
    setMessagesError(null);
    try {
      const uploaded = await socialApi.uploadMedia(file);
      await sendChatPayload({ mediaUrl: uploaded.url, mediaType: uploaded.mediaType });
    } catch (err) {
      setMessagesError(err instanceof Error ? err.message : "Could not send image.");
    } finally {
      setUploadingImage(false);
      if (imageInputRef.current) imageInputRef.current.value = "";
    }
  };

  const formatMessageTime = (iso: string) => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  };

  const avatarFor = (conversation: Conversation) => {
    const raw = conversation.participantAvatar?.trim() ?? "";
    return raw ? resolveMediaUrl(raw) || raw : "";
  };

  return (
    <div className="flex min-h-[calc(100vh-96px)] bg-[#fafafa]">
      {activeCall&&<div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-4"><div className="w-full max-w-xl rounded-3xl bg-slate-950 p-5 text-center text-white"><h2 className="text-xl font-bold">{activeCall.status==='ringing'?(callInitiatorRef.current?'Calling…':`Incoming ${activeCall.call_type} call`):'Call connected'}</h2><p className="mt-1 text-sm text-slate-300">{activeConversation?.participantName||'P4U Social'}</p>{activeCall.call_type==='video'&&<div className="relative mt-5 aspect-video overflow-hidden rounded-2xl bg-black"><video ref={remoteVideoRef} autoPlay playsInline className="h-full w-full object-cover"/><video ref={localVideoRef} autoPlay playsInline muted className="absolute bottom-3 right-3 h-28 w-20 rounded-xl bg-slate-800 object-cover"/></div>}{activeCall.call_type==='audio'&&<audio ref={remoteVideoRef as React.RefObject<HTMLAudioElement>} autoPlay/>}{callError&&<p className="mt-3 text-sm text-red-400">{callError}</p>}<div className="mt-6 flex justify-center gap-3">{activeCall.status==='ringing'&&!callInitiatorRef.current&&<button onClick={()=>void acceptIncomingCall()} className="rounded-full bg-emerald-600 px-6 py-3 font-bold">Accept</button>}<button onClick={()=>void finishCall(activeCall.status==='ringing'&&!callInitiatorRef.current)} className="rounded-full bg-red-600 px-6 py-3 font-bold">{activeCall.status==='ringing'&&!callInitiatorRef.current?'Decline':'End'}</button></div></div></div>}
      {viewer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 px-4" onClick={() => setViewer(null)}>
          <img src={viewer} alt="" className="max-h-[86vh] max-w-3xl rounded-2xl object-contain" onClick={(event) => event.stopPropagation()} />
          <button onClick={() => setViewer(null)} className="absolute right-4 top-4 rounded-full bg-white/20 p-2"><X className="h-5 w-5 text-white" /></button>
        </div>
      )}

      {showNewChat && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center" onClick={() => setShowNewChat(false)}>
          <div className="max-h-[80vh] w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
              <p className="text-sm font-bold text-slate-950">New message</p>
              <button onClick={() => setShowNewChat(false)} className="rounded-full p-1 hover:bg-gray-100"><X className="h-5 w-5" /></button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto p-2">
              {newChatLoading ? (
                <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-teal-500" /></div>
              ) : newChatSuggestions.length === 0 ? (
                <p className="py-10 text-center text-sm text-gray-400">No suggestions available.</p>
              ) : (
                newChatSuggestions.map((s) => (
                  <button key={s.userId} onClick={() => startConversation(s.userId)} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-gray-50">
                    <AvatarCircle src={s.avatar} name={s.name} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-gray-900">{s.name}</p>
                      <p className="truncate text-xs text-gray-400">{s.sub}</p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      <aside className={`w-full border-r border-gray-100 bg-white sm:w-80 lg:w-96 ${showChat ? "hidden sm:flex" : "flex"} min-h-0 flex-col overflow-hidden`}>
        <div className="flex items-center justify-between px-5 py-4">
          <h1 className="text-xl font-bold text-slate-950">Messages</h1>
          <button onClick={openNewChatModal} className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-950">
            <PlusCircle className="h-5 w-5" />
          </button>
        </div>
        <div className="px-5 pb-3">
          <div className="flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2.5">
            <Search className="h-4 w-4 text-slate-500" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search" className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-slate-500" />
          </div>
        </div>
        <div className="grid grid-cols-2 border-b border-slate-100 px-5">
          {[
            ["primary", "Primary"],
            ["requests", "Requests"],
          ].map(([key, label]) => (
            <button key={key} onClick={() => setTab(key as "primary" | "requests")} className={`py-3 text-sm font-bold ${tab === key ? "border-b-2 border-slate-950 text-slate-950" : "text-slate-400"}`}>
              {label}
            </button>
          ))}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto py-2">
          {loadingList ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-teal-500" /></div>
          ) : listError ? (
            <div className="px-5 py-8 text-center">
              <p className="text-sm text-red-500">{listError}</p>
              <button onClick={() => { void loadConversations(); }} className="mt-3 text-xs font-bold text-[#009999]">Try again</button>
            </div>
          ) : visibleConversations.length === 0 ? (
            <p className="px-5 py-12 text-center text-sm text-slate-400">{tab === "requests" ? "No message requests." : "No conversations yet."}</p>
          ) : (
            visibleConversations.map((conversation) => (
              <button key={conversation.id} onClick={() => openConversation(String(conversation.id))} className={`flex w-full items-center gap-3 px-5 py-3 text-left transition hover:bg-slate-50 ${activeId === String(conversation.id) ? "bg-slate-50" : ""}`}>
                <div className="relative">
                  <AvatarCircle src={avatarFor(conversation)} name={conversation.participantName} className="h-14 w-14 text-base" />
                  {conversation.isOnline && <span className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-white bg-green-500" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-bold text-slate-950">{conversation.participantName}</p>
                    <span className="ml-auto text-xs text-slate-400">{conversation.lastMessageAt ? formatRelativeTime(conversation.lastMessageAt) : ""}</span>
                  </div>
                  <p className={`truncate text-sm ${conversation.unreadCount ? "font-semibold text-slate-800" : "text-slate-500"}`}>
                    {conversation.lastMessage || (conversation.isRequest ? "wants to send you a message" : "Say hello")}
                  </p>
                </div>
                {conversation.unreadCount > 0 && <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#009999] px-1.5 text-[11px] font-bold text-white">{conversation.unreadCount}</span>}
              </button>
            ))
          )}
        </div>
      </aside>

      <main className={`min-w-0 flex-1 bg-white ${!showChat ? "hidden sm:flex" : "flex"} min-h-0 flex-col`}>
        {activeConversation ? (
          <>
            <div className="shrink-0 flex items-center gap-3 border-b border-slate-100 px-4 py-3">
              <button onClick={() => setShowChat(false)} className="rounded-full p-1 sm:hidden"><ArrowLeft className="h-6 w-6 text-slate-950" /></button>
              <button onClick={() => onUserClick(activeConversation.participantId)}>
                <AvatarCircle src={avatarFor(activeConversation)} name={activeConversation.participantName} className="h-11 w-11" />
              </button>
              <div className="min-w-0 flex-1">
                <button onClick={() => onUserClick(activeConversation.participantId)} className="block truncate text-left text-base font-bold text-slate-950">{activeConversation.participantName}</button>
                <p className="text-xs text-slate-500">{activeConversation.isOnline ? "Active now" : "Active today"}</p>
              </div>
              <button onClick={()=>void startCall("audio")} className="rounded-full p-2 hover:bg-slate-100"><Phone className="h-5 w-5 text-slate-950" /></button>
              <button onClick={()=>void startCall("video")} className="rounded-full p-2 hover:bg-slate-100"><Video className="h-5 w-5 text-slate-950" /></button>
            </div>

            <div ref={messagesScrollRef} className="min-h-0 flex-1 overflow-y-auto px-4 py-5">
              <div className="mb-6 flex flex-col items-center text-center">
                <AvatarCircle src={avatarFor(activeConversation)} name={activeConversation.participantName} className="h-20 w-20 text-2xl" />
                <p className="mt-3 text-lg font-bold text-slate-950">{activeConversation.participantName}</p>
                <p className="text-sm text-slate-500">P4U Social</p>
              </div>
              <div className="mb-5 flex items-center justify-center gap-2 text-xs text-slate-400">
                <Lock className="h-4 w-4" />
                <span>Messages are private. Only people in this chat can see them.</span>
              </div>
              {loadingMessages ? (
                <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-teal-500" /></div>
              ) : messagesError ? (
                <div className="py-6 text-center">
                  <p className="text-sm text-red-500">{messagesError}</p>
                  <button onClick={() => activeId && loadMessages(activeId)} className="mt-2 text-xs font-bold text-[#009999]">Retry</button>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((message) => {
                    const isEmoji = message.content && /^[\p{Emoji}\s]+$/u.test(message.content) && message.content.length <= 8;
                    const mediaUrl = message.mediaUrl ? resolveMediaUrl(message.mediaUrl) || message.mediaUrl : null;
                    return (
                      <div key={message.id} className={`flex items-end gap-2 ${message.isMine ? "justify-end" : "justify-start"}`}>
                        {!message.isMine && <AvatarCircle src={avatarFor(activeConversation)} name={activeConversation.participantName} size="sm" className="shrink-0" />}
                        <div className={`max-w-[72%] ${message.isMine ? "items-end" : "items-start"} flex flex-col`}>
                          {mediaUrl ? (
                            <button onClick={() => setViewer(mediaUrl)} className="overflow-hidden rounded-3xl">
                              <img src={mediaUrl} alt="" className="max-h-72 max-w-xs object-cover" />
                            </button>
                          ) : (
                            <div className={`rounded-3xl px-4 py-2.5 text-sm ${isEmoji ? "text-4xl" : message.isMine ? "text-white" : "bg-slate-100 text-slate-950"}`} style={message.isMine && !isEmoji ? { background: TEAL } : {}}>
                              {message.content}
                            </div>
                          )}
                          <span className="mt-1 text-[11px] text-slate-400">{formatMessageTime(message.createdAt)}</span>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            <div className="shrink-0 border-t border-slate-100 px-4 py-3">
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*,video/*"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void sendImageMessage(file);
                }}
              />
              <div className="flex items-center gap-2 rounded-full border border-slate-200 px-3 py-2">
                <button type="button" disabled={uploadingImage} onClick={() => imageInputRef.current?.click()} className="text-slate-500 disabled:opacity-50">
                  {uploadingImage ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImageIcon className="h-5 w-5" />}
                </button>
                <button onClick={() => setInput((value) => `${value}😊`)} className="text-slate-500"><Smile className="h-5 w-5" /></button>
                <input value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void sendMessage(); }} placeholder="Message..." className="min-w-0 flex-1 bg-transparent text-sm outline-none" />
                <button className="text-slate-500"><Mic className="h-5 w-5" /></button>
                <button onClick={() => void sendMessage()} disabled={!input.trim() || sending} className="rounded-full px-3 py-1 text-sm font-bold text-[#009999] disabled:text-slate-300">{sending ? "..." : "Send"}</button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
            <MessageCircle className="mb-4 h-16 w-16 text-slate-300" />
            <p className="text-xl font-bold text-slate-950">Your messages</p>
            <p className="mt-1 text-sm text-slate-500">Send private photos and messages to a friend or group.</p>
            <button onClick={openNewChatModal} className="mt-5 rounded-xl bg-[#009999] px-5 py-2.5 text-sm font-bold text-white">Send message</button>
          </div>
        )}
      </main>
    </div>
  );
}

// â”€â”€ NOTIFICATIONS SECTION â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function NotificationsSection({ onUserClick }: { onUserClick: (userId: string) => void }) {
  const [notifs, setNotifs] = useState<NotificationItem[]>([]);
  const [followed, setFollowed] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [limit, setLimit] = useState(40);

  const mapNotification = useCallback((n: ActivityNotification): NotificationItem => {
    const avatar = n.actorAvatar ? resolveMediaUrl(n.actorAvatar) || n.actorAvatar : "";
    const thumb = n.relatedThumbnail ? resolveMediaUrl(n.relatedThumbnail) || n.relatedThumbnail : null;
    return {
      id: n.id,
      userId: String(n.actorId || n.targetUserId || ""),
      group: notificationGroup(n.createdAt),
      user: n.actorName || "Someone",
      text: n.text,
      time: formatRelativeTime(n.createdAt),
      avatar,
      action: n.type.includes("follow") ? "Follow" : "",
      type: n.type,
      createdAt: n.createdAt,
      postId: n.postId,
      reelId: n.reelId,
      storyId: n.storyId,
      relatedThumbnail: thumb,
      isRead: Boolean(n.isRead),
      isFollowing: n.isFollowing,
      canMarkRead: n.canMarkRead,
    };
  }, []);

  const loadNotifications = useCallback(async (nextLimit: number, append = false) => {
    if (append) setLoadingMore(true);
    else setLoading(true);
    setError(null);
    try {
      const rows = await socialApi.getNotifications({ limit: nextLimit });
      const mapped = rows.map(mapNotification).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setNotifs(mapped);
      setFollowed((prev) => {
        const next = { ...prev };
        mapped.forEach((n) => {
          if (n.action === "Follow" && n.isFollowing !== undefined && next[n.userId] === undefined) {
            next[n.userId] = Boolean(n.isFollowing);
          }
        });
        return next;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load notifications.");
      if (!append) setNotifs([]);
    } finally {
      if (append) setLoadingMore(false);
      else setLoading(false);
    }
  }, [mapNotification]);

  useEffect(() => {
    let cancelled = false;
    loadNotifications(40).finally(() => {
      if (cancelled) return;
    });
    return () => { cancelled = true; };
  }, [loadNotifications]);

  const toggleFollowNotif = async (n: NotificationItem) => {
    if (!n.userId) return;
    const already = followed[n.userId] ?? Boolean(n.isFollowing);
    const next = !already;
    setFollowed((p) => ({ ...p, [n.userId]: next }));
    try {
      if (next) await socialApi.followUser(n.userId);
      else await socialApi.unfollowUser(n.userId);
    } catch {
      setFollowed((p) => ({ ...p, [n.userId]: !next }));
    }
  };

  const markRead = async (n: NotificationItem) => {
    if (n.isRead) return;
    setNotifs((prev) => prev.map((item) => (item.id === n.id ? { ...item, isRead: true } : item)));
    if (!n.canMarkRead) return;
    try {
      await socialApi.markNotificationRead(n.id);
    } catch {
      setNotifs((prev) => prev.map((item) => (item.id === n.id ? { ...item, isRead: false } : item)));
    }
  };

  const openNotification = async (n: NotificationItem) => {
    await markRead(n);
    if (n.userId) onUserClick(n.userId);
  };

  const hasMore = notifs.length >= limit;

  return (
    <div className="max-w-2xl mx-auto px-3 sm:px-4 py-6">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-lg font-semibold text-gray-900">Notifications</h1>
        <button onClick={() => loadNotifications(limit)} className="text-xs text-gray-400 hover:text-gray-700 border border-gray-200 rounded-lg px-3 py-1.5 transition">Refresh</button>
      </div>
      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-7 h-7 text-teal-500 animate-spin" /></div>
      ) : error ? (
        <div className="bg-white rounded-2xl p-10 text-center text-gray-500 shadow-sm border border-gray-100">
          <Bell className="w-10 h-10 mx-auto mb-3 text-gray-300" />
          <p className="text-sm font-semibold text-gray-800">Could not load notifications</p>
          <p className="mt-1 text-xs text-gray-400">{error}</p>
          <button onClick={() => loadNotifications(limit)} className="mt-4 rounded-xl px-4 py-2 text-xs font-bold text-white" style={{ background: TEAL }}>Try again</button>
        </div>
      ) : notifs.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center text-gray-400 shadow-sm border border-gray-100">
          <Bell className="w-10 h-10 mx-auto mb-3 text-gray-300" />
          <p className="text-sm">No notifications yet</p>
        </div>
      ) : (
        <>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {["This Week","Earlier"].map(group => {
            const items = notifs.filter(n => n.group === group);
            if (!items.length) return null;
            return (
              <div key={group}>
                <div className="px-4 pt-4 pb-2"><span className="text-xs font-semibold tracking-widest uppercase text-gray-400">{group}</span></div>
                {items.map((n, idx) => (
                  <div key={`${group}-${n.id}`} className={`flex items-center gap-3 px-4 py-3 transition ${n.isRead ? "hover:bg-gray-50" : "bg-teal-50/70 hover:bg-teal-50"} ${idx < items.length - 1 ? "border-b border-gray-50" : ""}`}>
                    <button onClick={() => openNotification(n)} className="shrink-0">
                      <AvatarCircle src={n.avatar} name={n.user} />
                    </button>
                    <button onClick={() => openNotification(n)} className="flex-1 min-w-0 text-left">
                      <p className="text-xs text-gray-800 leading-snug">
                        <span className="font-semibold">{n.user}</span>
                        {" "}<span className="text-gray-500">{n.text}</span>
                      </p>
                      <p className="text-[10px] text-gray-400 mt-0.5">{n.time}</p>
                    </button>
                    {n.relatedThumbnail && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={n.relatedThumbnail} alt="" className="h-11 w-11 shrink-0 rounded-lg object-cover border border-gray-100" />
                    )}
                    {n.action === "Follow" ? (
                      <button onClick={(event) => { event.stopPropagation(); toggleFollowNotif(n); }}
                        className={`shrink-0 text-xs font-bold px-3 py-1.5 rounded-xl transition ${(followed[n.userId] ?? Boolean(n.isFollowing)) ? "bg-gray-100 text-gray-700" : "text-white hover:opacity-90"}`}
                        style={!(followed[n.userId] ?? Boolean(n.isFollowing)) ? { background: TEAL } : {}}>
                        {(followed[n.userId] ?? Boolean(n.isFollowing)) ? "Following" : "Follow"}
                      </button>
                    ) : (
                      !n.isRead && <span className="h-2 w-2 shrink-0 rounded-full bg-teal-500" />
                    )}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
        {hasMore && (
          <div className="mt-4 flex justify-center">
            <button
              onClick={() => { const next = limit + 40; setLimit(next); loadNotifications(next, true); }}
              disabled={loadingMore}
              className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-50 disabled:opacity-60"
            >
              {loadingMore ? "Loading..." : "Load more"}
            </button>
          </div>
        )}
        </>
      )}
    </div>
  );
}

// â”€â”€ CREATE SECTION â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function CreateSection({ onPosted }: { onPosted?: () => void } = {}) {
  const [step, setStep] = useState("upload");
  const [preview, setPreview] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [filter, setFilter] = useState("Normal");
  const [showImageEditor, setShowImageEditor] = useState(false);
  const [caption, setCaption] = useState("");
  const [location, setLocation] = useState("");
  const [tags, setTags] = useState("");
  const [category, setCategory] = useState("");
  const [audience, setAudience] = useState<"public" | "private">("public");
  const [hideLikeCount, setHideLikeCount] = useState(false);
  const [commentPermission, setCommentPermission] = useState<"everyone" | "followers" | "none">("everyone");
  const [productQuery, setProductQuery] = useState("");
  const [productResults, setProductResults] = useState<Product[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<LinkedProduct[]>([]);
  const [productLoading, setProductLoading] = useState(false);
  const [shared, setShared] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) { setPreview(URL.createObjectURL(f)); setPendingFile(f); setStep("details"); setError(null); }
  };
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) { setPreview(URL.createObjectURL(f)); setPendingFile(f); setStep("details"); setError(null); }
  };
  const reset = () => {
    setStep("upload"); setPreview(null); setPendingFile(null); setFilter("Normal");
    setCaption(""); setLocation(""); setTags(""); setCategory(""); setAudience("public");
    setHideLikeCount(false); setCommentPermission("everyone"); setProductQuery("");
    setProductResults([]); setSelectedProducts([]); setShared(false); setError(null); setShowImageEditor(false);
  };

  useEffect(() => {
    if (step !== "details" || !productQuery.trim()) {
      setProductResults([]);
      return;
    }
    let cancelled = false;
    setProductLoading(true);
    catalogApi.search(productQuery.trim(), { limit: 8 })
      .then((res) => {
        if (cancelled) return;
        setProductResults(res.products ?? []);
      })
      .catch(() => {
        if (!cancelled) setProductResults([]);
      })
      .finally(() => {
        if (!cancelled) setProductLoading(false);
      });
    return () => { cancelled = true; };
  }, [productQuery, step]);

  const toLinkedProduct = (product: Product): LinkedProduct => ({
    id: String(product.id),
    name: product.name,
    image: product.thumbnailUrl ?? product.image ?? product.metadata?.imageUrl ?? null,
    price: product.finalPrice ?? product.sellPrice ?? product.price ?? null,
    vendorId: product.vendorId ?? null,
  });

  const pendingIsVideo = Boolean(pendingFile?.type.startsWith("video/"));

  const toggleLinkedProduct = (product: Product) => {
    const linked = toLinkedProduct(product);
    setSelectedProducts((items) =>
      items.some((item) => item.id === linked.id)
        ? items.filter((item) => item.id !== linked.id)
        : [...items, linked],
    );
  };

  const handleShare = async () => {
    if (!pendingFile || submitting) return;
    if (!category) {
      setError("Please select a category before sharing.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const uploaded = await socialApi.uploadMedia(pendingFile);
      const tagList = tags
        .split(/[,\s#]+/)
        .map((t) => t.trim())
        .filter(Boolean);
      await socialApi.createPost({
        contentText: caption.trim() || undefined,
        mediaUrls: [uploaded.url],
        postType: uploaded.mediaType,
        visibility: audience,
        location: location.trim() || undefined,
        tags: tagList.length ? tagList : undefined,
        category,
        linkedProducts: selectedProducts,
        hideLikeCount,
        commentPermission,
      });
      setShared(true);
      onPosted?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to share post");
    } finally {
      setSubmitting(false);
    }
  };

  if (shared) return (
    <div className="max-w-md mx-auto px-4 py-20 flex flex-col items-center gap-4">
      <div className="w-16 h-16 rounded-full bg-teal-100 flex items-center justify-center">
        <Check className="w-8 h-8 text-teal-600" />
      </div>
      <h2 className="text-lg font-semibold text-gray-900">Post Shared!</h2>
      <p className="text-sm text-gray-500 text-center">Your post has been shared to everyone.</p>
      <button onClick={reset} className="text-white font-bold px-6 py-2.5 rounded-xl shadow" style={{ background: TEAL }}>Create another</button>
    </div>
  );

  if (step === "upload") return (
    <div className="min-h-[calc(100vh-160px)] bg-slate-50">
      <div className="flex items-center justify-center border-b border-slate-100 bg-white px-6 py-5">
        <button onClick={reset} className="absolute left-6 rounded-full p-1 hover:bg-slate-100"><ArrowLeft className="h-7 w-7 text-slate-950" /></button>
        <h1 className="text-2xl font-bold text-slate-950">New Post</h1>
      </div>
      <div onDrop={handleDrop} onDragOver={e => e.preventDefault()} className="flex min-h-[720px] flex-col items-center justify-center px-5 py-12">
        <div className="mb-7 flex h-28 w-28 items-center justify-center rounded-full bg-orange-50">
          <Camera className="h-12 w-12 text-slate-500" />
        </div>
        <h2 className="text-3xl font-bold text-slate-950">Create a new post</h2>
        <p className="mt-4 text-xl text-slate-500">Share photos &amp; videos with your followers</p>
        <p className="mt-10 text-base text-slate-500">Videos up to 45 sec / 100MB • Images up to 10MB</p>
        <div className="mt-6 flex items-center gap-4">
          <button onClick={() => fileRef.current?.click()} className="inline-flex items-center gap-3 rounded-2xl px-6 py-4 text-lg font-bold text-white" style={{ background: TEAL_SOLID }}>
            <ImageIcon className="h-6 w-6" /> Gallery
          </button>
          <button onClick={() => fileRef.current?.click()} className="inline-flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-6 py-4 text-lg font-bold text-slate-950">
            <Video className="h-6 w-6" /> Video
          </button>
        </div>
        <div className="mt-28 grid w-full grid-cols-1 gap-4 md:grid-cols-3">
          {[
            { label: "Photo", icon: ImageIcon, accept: "image/*" },
            { label: "Video", icon: Video, accept: "video/*" },
            { label: "Camera", icon: Camera, accept: "image/*,video/*" },
          ].map(({ label, icon: Icon }) => (
            <button key={label} onClick={() => fileRef.current?.click()} className="flex min-h-28 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-200 bg-white text-slate-950 hover:border-teal-300">
              <Icon className="h-8 w-8 text-slate-500" />
              <span className="text-lg font-medium">{label}</span>
            </button>
          ))}
        </div>
        <input ref={fileRef} type="file" accept="image/*,video/*" className="hidden" onChange={handleFile} />
      </div>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto px-3 sm:px-4 py-6 sm:py-8">
      {showImageEditor && preview && !pendingIsVideo && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black text-white">
          <div className="flex h-20 shrink-0 items-center justify-center px-5">
            <button onClick={() => setShowImageEditor(false)} className="absolute left-5 rounded-full p-1 hover:bg-white/10">
              <X className="h-8 w-8" />
            </button>
            <h2 className="text-lg font-bold">Edit Image</h2>
            <button onClick={() => setShowImageEditor(false)} className="absolute right-4 inline-flex items-center gap-2 rounded-full px-5 py-3 text-base font-bold text-white" style={{ background: TEAL_SOLID }}>
              <Check className="h-5 w-5" /> Done
            </button>
          </div>
          <div className="flex min-h-0 flex-1 items-center justify-center px-6">
            <img src={preview} alt="Edit preview" className="max-h-full max-w-[78vw] object-contain" style={{ filter: FILTER_CSS[filter] }} />
          </div>
          <div className="grid h-24 shrink-0 grid-cols-4 border-t border-white/10 text-white/80">
            <button className="flex flex-col items-center justify-center gap-1 text-xs"><Crop className="h-7 w-7" />Crop</button>
            <button className="flex flex-col items-center justify-center gap-1 text-xs"><Type className="h-7 w-7" />Text</button>
            <button onClick={() => setFilter(filter === "Normal" ? "Juno" : "Normal")} className="flex flex-col items-center justify-center gap-1 text-xs"><Smile className="h-7 w-7" />Emoji</button>
            <button onClick={() => setFilter("Normal")} className="flex flex-col items-center justify-center gap-1 text-xs"><RotateCcw className="h-7 w-7" />Reset</button>
          </div>
        </div>
      )}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          {step !== "upload"
            ? <button onClick={reset}><ChevronLeft className="w-5 h-5 text-gray-500" /></button>
            : <div />}
          <h2 className="text-sm font-semibold text-gray-900">{step === "upload" ? "Create new post" : step === "edit" ? "Edit" : "New post"}</h2>
          {step === "edit"
            ? <button onClick={() => setStep("details")} className="text-xs font-bold text-teal-500 hover:text-teal-700">Next</button>
            : step === "details"
            ? <button onClick={handleShare} disabled={submitting} className="text-xs font-bold text-teal-500 hover:text-teal-700 disabled:opacity-50">{submitting ? "Sharingâ€¦" : "Share"}</button>
            : <div />}
        </div>
        {step === "upload" && (
          <div onDrop={handleDrop} onDragOver={e => e.preventDefault()} onClick={() => fileRef.current?.click()}
            className="flex flex-col items-center justify-center py-16 sm:py-24 px-8 cursor-pointer hover:bg-gray-50 transition">
            <div className="w-20 h-20 rounded-2xl border-2 border-dashed border-gray-300 flex items-center justify-center mb-4 hover:border-teal-400 transition">
              <ImageIcon className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-sm text-gray-500 mb-1 text-center">Drag photos and videos here</p>
            <p className="text-xs text-gray-400 mb-4">Supports JPG, PNG, MP4, MOV</p>
            <button className="text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow" style={{ background: TEAL }}>Select from Computer</button>
            <input ref={fileRef} type="file" accept="image/*,video/*" className="hidden" onChange={handleFile} />
          </div>
        )}
        {step === "edit" && preview && (
          <div className="flex flex-col sm:flex-row">
            <div className="flex-1 bg-black">
              {pendingIsVideo ? (
                <video src={preview} className="w-full aspect-square object-cover" controls muted playsInline preload="metadata" />
              ) : (
                <img src={preview} alt="preview" className="w-full aspect-square object-cover" style={{ filter: FILTER_CSS[filter] }} />
              )}
            </div>
            <div className="sm:w-52 p-4 bg-gray-50">
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">Filters</p>
              {pendingIsVideo ? (
                <p className="text-xs text-gray-500">Video posts use the original media.</p>
              ) : (
              <div className="grid grid-cols-5 sm:grid-cols-2 gap-2 overflow-y-auto max-h-80">
                {FILTER_NAMES.map(f => (
                  <button key={f} onClick={() => setFilter(f)} className={`flex flex-col items-center gap-1.5 p-2 rounded-xl border transition ${filter === f ? "border-teal-400 bg-teal-50" : "border-transparent hover:bg-white"}`}>
                    <div className="w-10 h-10 rounded-lg overflow-hidden">
                      <img src={preview} alt={f} className="w-full h-full object-cover" style={{ filter: FILTER_CSS[f] }} />
                    </div>
                    <span className="text-[9px] font-semibold text-gray-600 hidden sm:block">{f}</span>
                  </button>
                ))}
              </div>
              )}
            </div>
          </div>
        )}
        {step === "details" && preview && (
          <div className="flex flex-col sm:flex-row">
            <div className="relative sm:w-64 bg-black shrink-0">
              {pendingIsVideo ? (
                <video src={preview} className="w-full aspect-square object-cover" controls muted playsInline preload="metadata" />
              ) : (
                <img src={preview} alt="preview" className="w-full aspect-square object-cover" style={{ filter: FILTER_CSS[filter] }} />
              )}
              {!pendingIsVideo && (
                <button onClick={() => setShowImageEditor(true)} className="absolute right-3 top-3 rounded-full bg-black/60 px-4 py-2 text-xs font-bold text-white backdrop-blur hover:bg-black/75">
                  Edit
                </button>
              )}
            </div>
            <div className="flex-1 p-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center shrink-0"><User className="w-4 h-4 text-gray-500" /></div>
                <span className="text-sm font-bold text-gray-800">You</span>
              </div>
              <textarea value={caption} onChange={e => setCaption(e.target.value)} placeholder="Write a captionâ€¦" rows={4}
                className="w-full text-sm text-gray-700 bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-200 outline-none focus:border-teal-400 resize-none" />
              <div className="flex items-center gap-3 border-b border-gray-100 pb-3">
                <Tag className="h-5 w-5 text-slate-500" />
                <span className="flex-1 text-sm font-semibold text-slate-950">Category <span className="text-red-500">*</span></span>
                <select value={category} onChange={(e) => setCategory(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none">
                  <option value="">Select</option>
                  {POST_CATEGORIES.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </div>
              <input value={location} onChange={e => setLocation(e.target.value)} placeholder="Add location"
                className="w-full text-sm text-gray-700 bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-200 outline-none focus:border-teal-400" />
              <input value={tags} onChange={e => setTags(e.target.value)} placeholder="Tag people (@username)"
                className="w-full text-sm text-gray-700 bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-200 outline-none focus:border-teal-400" />
              <div className="rounded-xl border border-gray-100 p-3">
                <div className="mb-2 flex items-center gap-3">
                  <Bookmark className="h-5 w-5 text-slate-500" />
                  <span className="text-sm font-semibold text-slate-950">Link Product</span>
                </div>
                <input value={productQuery} onChange={(e) => setProductQuery(e.target.value)} placeholder="Search products..."
                  className="mb-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-teal-400" />
                {selectedProducts.length > 0 && (
                  <div className="mb-2 flex flex-wrap gap-2">
                    {selectedProducts.map((product) => (
                      <button key={product.id} onClick={() => setSelectedProducts((items) => items.filter((item) => item.id !== product.id))} className="rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-700">
                        {product.name} ×
                      </button>
                    ))}
                  </div>
                )}
                {productLoading && <p className="text-xs text-slate-400">Searching...</p>}
                {productResults.length > 0 && (
                  <div className="max-h-40 overflow-y-auto rounded-xl border border-slate-100">
                    {productResults.map((product) => {
                      const selected = selectedProducts.some((item) => item.id === String(product.id));
                      return (
                        <button key={product.id} onClick={() => toggleLinkedProduct(product)} className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm ${selected ? "bg-teal-50 text-teal-700" : "hover:bg-slate-50"}`}>
                          <span className="truncate">{product.name}</span>
                          <span className="text-xs font-semibold">{selected ? "Selected" : "Add"}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-3 border-b border-gray-100 pb-3">
                <Eye className="h-5 w-5 text-slate-500" />
                <span className="flex-1 text-sm font-semibold text-slate-950">Audience</span>
                <select value={audience} onChange={(e) => setAudience(e.target.value as "public" | "private")} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none">
                  <option value="public">Public</option>
                  <option value="private">Private</option>
                </select>
              </div>
              <div className="flex items-center gap-3 border-b border-gray-100 pb-3">
                <Heart className="h-5 w-5 text-slate-500" />
                <span className="flex-1 text-sm font-semibold text-slate-950">Hide like count</span>
                <Toggle checked={hideLikeCount} onChange={setHideLikeCount} />
              </div>
              <div className="flex items-center gap-3 border-b border-gray-100 pb-3">
                <MessageCircle className="h-5 w-5 text-slate-500" />
                <span className="flex-1 text-sm font-semibold text-slate-950">Comments</span>
                <select value={commentPermission} onChange={(e) => setCommentPermission(e.target.value as "everyone" | "followers" | "none")} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none">
                  <option value="everyone">Everyone</option>
                  <option value="followers">Followers Only</option>
                  <option value="none">No One</option>
                </select>
              </div>
              {error && <p className="text-xs text-red-600">{error}</p>}
              <button onClick={handleShare} disabled={submitting} className="w-full text-white text-sm font-bold py-3 rounded-xl shadow transition hover:opacity-90 disabled:opacity-60" style={{ background: TEAL }}>{submitting ? "Sharingâ€¦" : "Share"}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// â”€â”€ MY PROFILE SECTION â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const PROFILE_TABS_LIST = ["Posts","Reels","Saved","Tagged"];

type FollowListTab = "followers" | "following";
type FollowListUser = {
  userId: string;
  username: string;
  name: string;
  avatar: string;
  isFollowing: boolean;
  isSelf: boolean;
};

function normalizeFollowUser(u: UserSummary, followingIds: Set<string>, myUserId: string, forceFollowing = false): FollowListUser {
  const userId = String(u.userId ?? u.id ?? "");
  const name = u.name?.trim() || "P4U User";
  const avatarRaw = u.userAvatar ?? u.avatarUrl ?? u.avatar ?? "";
  return {
    userId,
    username: name.toLowerCase().replace(/\s+/g, "_"),
    name,
    avatar: avatarRaw.trim() ? resolveMediaUrl(avatarRaw.trim()) || avatarRaw : "",
    isFollowing: forceFollowing || followingIds.has(userId),
    isSelf: Boolean(myUserId && userId === myUserId),
  };
}

function ProfileEditModal({
  profile,
  onClose,
  onSaved,
}: {
  profile: SocioUserProfile | null;
  onClose: () => void;
  onSaved: (profile: SocioUserProfile) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(profile?.userName ?? "");
  const [bio, setBio] = useState(profile?.bio ?? "");
  const [preview, setPreview] = useState<string | null>(profile?.userAvatar ?? null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      let avatarUrl = profile?.userAvatar ?? "";
      if (pendingFile) {
        const uploaded = await socialApi.uploadMedia(pendingFile);
        avatarUrl = uploaded.url;
      }
      await profileApi.updateMe({
        name: name.trim() || profile?.userName || "",
        bio: bio.trim(),
        avatar: avatarUrl,
      });
      socialApi.getMyProfile()
        .then((fresh) => {
          onSaved(fresh);
          onClose();
        })
        .catch(() => {
          if (profile) onSaved({ ...profile, userName: name.trim() || profile.userName, bio: bio.trim(), userAvatar: avatarUrl });
          onClose();
        });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save profile.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <h2 className="text-base font-bold text-slate-950">Edit Profile</h2>
          <button onClick={onClose} disabled={saving}><X className="h-5 w-5 text-slate-500" /></button>
        </div>
        <div className="px-5 py-5">
          <div className="mb-5 flex items-center gap-4">
            <button type="button" onClick={() => fileRef.current?.click()} className="relative">
              <AvatarCircle src={preview} name={name || "Profile"} className="h-20 w-20 text-2xl border-teal-400" />
              <span className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-[#009999] text-white ring-2 ring-white">
                <Camera className="h-4 w-4" />
              </span>
            </button>
            <div>
              <p className="text-sm font-bold text-slate-950">{name || "Your profile"}</p>
              <button type="button" onClick={() => fileRef.current?.click()} className="mt-1 text-xs font-semibold text-[#009999]">
                Change profile photo
              </button>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setPendingFile(file);
                setPreview(URL.createObjectURL(file));
              }}
            />
          </div>
          <label className="mb-1 block text-xs font-semibold text-slate-600">Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className="mb-4 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-teal-400" />
          <label className="mb-1 block text-xs font-semibold text-slate-600">Bio</label>
          <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} maxLength={150} className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-teal-400" />
          {error && <p className="mt-3 text-xs text-red-500">{error}</p>}
        </div>
        <div className="flex justify-end gap-3 border-t border-gray-100 px-5 py-4">
          <button onClick={onClose} disabled={saving} className="rounded-full border border-slate-200 px-5 py-2 text-sm font-semibold text-slate-950">Cancel</button>
          <button onClick={save} disabled={saving} className="rounded-full bg-[#009999] px-6 py-2 text-sm font-bold text-white disabled:opacity-60">
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

function FollowListScreen({
  ownerId,
  initialTab,
  onBack,
  onUserClick,
  onRelationshipChange,
}: {
  ownerId: string;
  initialTab: FollowListTab;
  onBack: () => void;
  onUserClick: (userId: string) => void;
  onRelationshipChange?: (change: { targetUserId: string; isFollowing: boolean; delta: number }) => void;
}) {
  const [tab, setTab] = useState<FollowListTab>(initialTab);
  const [rows, setRows] = useState<FollowListUser[]>([]);
  const [myUserId, setMyUserId] = useState("");
  const [q, setQ] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const isOwnerList = Boolean(myUserId && ownerId === myUserId);

  const loadRows = useCallback(async () => {
    setLoading(true);
    try {
      const me = await socialApi.getMyProfile();
      const myFollowing = await socialApi.getFollowing(me.userId);
      const followingIds = new Set(myFollowing.map((u) => String(u.userId ?? u.id ?? "")));
      const list = tab === "followers"
        ? await socialApi.getFollowers(ownerId)
        : await socialApi.getFollowing(ownerId);
      setMyUserId(me.userId);
      setRows(list.map((u) => normalizeFollowUser(u, followingIds, me.userId, tab === "following" && ownerId === me.userId)));
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [ownerId, tab]);

  useEffect(() => {
    void loadRows();
  }, [loadRows]);

  useEffect(() => {
    const onFollowChanged = (event: Event) => {
      const detail = (event as CustomEvent<{ userId?: string; isFollowing?: boolean }>).detail;
      if (!detail?.userId) return;
      setRows((prev) => prev.map((row) =>
        String(row.userId) === String(detail.userId)
          ? { ...row, isFollowing: Boolean(detail.isFollowing) }
          : row,
      ));
    };
    window.addEventListener("p4u:socio-follow-changed", onFollowChanged);
    return () => window.removeEventListener("p4u:socio-follow-changed", onFollowChanged);
  }, []);

  const toggleFollow = async (user: FollowListUser) => {
    if (user.isSelf || busyId) return;
    const next = !user.isFollowing;
    setBusyId(user.userId);
    setRows((prev) => prev.map((row) => row.userId === user.userId ? { ...row, isFollowing: next } : row));
    onRelationshipChange?.({ targetUserId: user.userId, isFollowing: next, delta: next ? 1 : -1 });
    try {
      if (next) await socialApi.followUser(user.userId);
      else await socialApi.unfollowUser(user.userId);
    } catch {
      setRows((prev) => prev.map((row) => row.userId === user.userId ? { ...row, isFollowing: !next } : row));
      onRelationshipChange?.({ targetUserId: user.userId, isFollowing: !next, delta: next ? -1 : 1 });
    } finally {
      setBusyId(null);
    }
  };

  const filtered = rows.filter((row) => {
    const needle = q.trim().toLowerCase();
    return !needle || row.username.toLowerCase().includes(needle) || row.name.toLowerCase().includes(needle);
  });
  const hasSearch = q.trim().length > 0;
  const clearSearch = () => {
    setQ("");
    requestAnimationFrame(() => searchInputRef.current?.focus());
  };

  return (
    <div className="min-h-full bg-white">
      <div className="sticky top-0 z-10 flex items-center gap-4 bg-white px-6 py-5">
        <button onClick={onBack} className="p-1"><ArrowLeft className="h-6 w-6 text-slate-950" /></button>
        <h1 className="text-2xl font-bold text-slate-950">Profile</h1>
      </div>
      <div className="grid grid-cols-2 border-b border-slate-100">
        {(["followers", "following"] as FollowListTab[]).map((item) => (
          <button
            key={item}
            onClick={() => setTab(item)}
            className={`py-4 text-base font-bold capitalize ${tab === item ? "border-b-2 border-slate-950 text-slate-950" : "text-slate-500"}`}
          >
            {item}
          </button>
        ))}
      </div>
      <div className="px-6 py-5">
        <div className="mb-5 flex items-center gap-3 rounded-2xl bg-slate-50 px-5 py-3 focus-within:ring-2 focus-within:ring-teal-500">
          <Search className="h-5 w-5 text-slate-500" />
          <input
            ref={searchInputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search"
            className="min-w-0 flex-1 bg-transparent text-base text-slate-700 outline-none placeholder:text-slate-500"
          />
          {hasSearch && (
            <button type="button" onClick={clearSearch} className="shrink-0 rounded-full p-1 text-slate-500 hover:text-slate-900" aria-label="Clear search">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        {loading ? (
          <div className="flex justify-center py-14"><Loader2 className="h-7 w-7 animate-spin text-teal-500" /></div>
        ) : hasSearch && filtered.length === 0 ? (
          <div className="flex min-h-[280px] items-center justify-center text-sm text-slate-500">
            No results found
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filtered.map((user) => (
              <div key={user.userId} className="flex items-center gap-5 py-5">
                <button onClick={() => onUserClick(user.userId)} className="shrink-0">
                  <AvatarCircle src={user.avatar} name={user.name} className="h-16 w-16 text-lg border-0 bg-slate-100" />
                </button>
                <button onClick={() => onUserClick(user.userId)} className="min-w-0 flex-1 text-left">
                  <p className="truncate text-base font-bold text-slate-950">{user.username}</p>
                  <p className="truncate text-sm text-slate-500">{user.name}</p>
                </button>
                {!user.isSelf && (
                  <button
                    onClick={() => toggleFollow(user)}
                    disabled={busyId === user.userId}
                    className={`rounded-full px-6 py-3 text-base font-bold disabled:opacity-60 ${
                      user.isFollowing ? "bg-teal-50 text-slate-950" : "bg-[#009999] text-white"
                    }`}
                  >
                    {user.isFollowing ? "Following" : "Follow"}
                  </button>
                )}
                {isOwnerList && tab === "followers" && user.userId !== myUserId && (
                  <button onClick={() => setRows((prev) => prev.filter((row) => row.userId !== user.userId))} className="p-2">
                    <X className="h-5 w-5 text-slate-500" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function MyProfileSection({ onUserClick }: { onUserClick: (userId: string) => void }) {
  const [activeTab, setActiveTab] = useState("Posts");
  const [selectedMedia, setSelectedMedia] = useState<ProfileGridMedia | null>(null);
  const [selectedReelIndex, setSelectedReelIndex] = useState<number | null>(null);
  const [profile, setProfile] = useState<SocioUserProfile | null>(null);
  const [gridImages, setGridImages] = useState<ProfileGridMedia[]>([]);
  const [savedImages, setSavedImages] = useState<ProfileGridMedia[]>([]);
  const [gridReels, setGridReels] = useState<ReelItem[]>([]);
  const [followList, setFollowList] = useState<FollowListTab | null>(null);
  const [showEdit, setShowEdit] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    socialApi.getMyProfile()
      .then(async (prof) => {
        if (cancelled) return;
        setProfile(prof);
        const [userPosts, savedPosts] = await Promise.all([
          socialApi.getUserPosts(prof.userId, { limit: 30 }),
          socialApi.getSavedPosts({ limit: 30 }),
        ]);
        if (cancelled) return;
        setGridImages(userPosts.data.map(postToProfileGridMedia).filter((item): item is ProfileGridMedia => Boolean(item)));
        setSavedImages(savedPosts.data.map(postToProfileGridMedia).filter((item): item is ProfileGridMedia => Boolean(item)));
        setGridReels(userPosts.data.map(postToReelItem).filter((item): item is ReelItem => Boolean(item)));
      })
      .catch(() => { if (!cancelled) setError("Could not load your profile."); })
      .finally(() => { if (!cancelled) setLoadingProfile(false); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const onFollowChanged = (event: Event) => {
      const detail = (event as CustomEvent<{ userId?: string; isFollowing?: boolean; delta?: number }>).detail;
      if (!detail?.userId) return;
      setProfile((current) => {
        if (!current || String(current.userId) === String(detail.userId)) return current;
        const delta = typeof detail.delta === "number" ? detail.delta : detail.isFollowing ? 1 : -1;
        return { ...current, followingCount: Math.max(0, current.followingCount + delta) };
      });
    };
    window.addEventListener("p4u:socio-follow-changed", onFollowChanged);
    return () => window.removeEventListener("p4u:socio-follow-changed", onFollowChanged);
  }, []);

  const displayImages = activeTab === "Saved" ? savedImages : gridImages;
  const avatar = profile?.userAvatar ? resolveMediaUrl(profile.userAvatar) || profile.userAvatar : null;
  const openProfileMedia = (media: ProfileGridMedia) => {
    if (media.type === "video") {
      const index = gridReels.findIndex((reel) => String(reel.postId) === String(media.id));
      if (index >= 0) {
        setSelectedReelIndex(index);
        return;
      }
    }
    setSelectedMedia(media);
  };

  if (followList && profile) {
    return (
      <FollowListScreen
        ownerId={profile.userId}
        initialTab={followList}
        onBack={() => setFollowList(null)}
        onUserClick={onUserClick}
      />
    );
  }

  return (
    <div className="min-h-full max-w-3xl bg-white">
      {selectedMedia && <ProfileMediaModal media={selectedMedia} onClose={() => setSelectedMedia(null)} />}
      {selectedReelIndex != null && (
        <ProfileReelsViewer
          reels={gridReels}
          initialIndex={selectedReelIndex}
          onClose={() => setSelectedReelIndex(null)}
          onUserClick={onUserClick}
        />
      )}
      {showEdit && (
        <ProfileEditModal
          profile={profile}
          onClose={() => setShowEdit(false)}
          onSaved={(fresh) => setProfile(fresh)}
        />
      )}
      <div className="px-7 pb-5 pt-5">
        <div className="mb-5 grid grid-cols-[120px_1fr] items-center gap-6">
          <button type="button" onClick={() => setShowEdit(true)} className="relative justify-self-start">
            <AvatarCircle src={avatar} name={profile?.userName ?? "Profile"} className="h-28 w-28 text-3xl border-white shadow-sm" />
            <span className="absolute bottom-1 right-1 flex h-8 w-8 items-center justify-center rounded-full bg-[#009999] text-white ring-2 ring-white">
              <PlusCircle className="h-5 w-5" />
            </span>
          </button>
          <div className="grid grid-cols-3 gap-3 text-center">
            {[
              [profile?.postCount?.toLocaleString() ?? "0", "Posts"],
              [profile?.followerCount?.toLocaleString() ?? "0", "Followers"],
              [profile?.followingCount?.toLocaleString() ?? "0", "Following"],
            ].map(([v, l]) => {
              const clickable = l === "Followers" || l === "Following";
              return (
                <button
                  key={l}
                  type="button"
                  disabled={!clickable}
                  onClick={() => setFollowList(l === "Followers" ? "followers" : "following")}
                  className="disabled:cursor-default"
                >
                  <p className="text-2xl font-bold text-slate-950">{v}</p>
                  <p className="mt-1 text-base text-slate-500">{l}</p>
                </button>
              );
            })}
          </div>
        </div>
        <h1 className="mb-6 text-xl font-bold text-slate-950">{profile?.userName ?? "Your profile"}</h1>
        {profile?.bio && <p className="mb-4 text-sm text-slate-600">{profile.bio}</p>}
        {error && <p className="mb-3 text-xs text-red-500">{error}</p>}
        <div className="grid grid-cols-[1fr_1fr_52px] gap-3">
          <button onClick={() => setShowEdit(true)} className="rounded-2xl bg-teal-50 py-3 text-lg font-bold text-slate-950">Edit Profile</button>
          <button
            onClick={() => {
              const url = typeof window !== "undefined" ? window.location.href : "";
              if (navigator.share) void navigator.share({ title: "P4U Socio Profile", url }).catch(() => {});
              else if (navigator.clipboard) void navigator.clipboard.writeText(url);
            }}
            className="rounded-2xl bg-teal-50 py-3 text-lg font-bold text-slate-950"
          >
            Share Profile
          </button>
          <button className="flex items-center justify-center rounded-2xl bg-teal-50 text-slate-950">
            <UserPlus className="h-6 w-6" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-4 border-t border-slate-100">
        {PROFILE_TABS_LIST.map(t => (
          <button key={t} onClick={() => setActiveTab(t)}
            className={`py-5 border-b-2 transition-all flex items-center justify-center ${activeTab === t ? "text-slate-950 border-slate-950" : "text-slate-500 border-transparent"}`}>
            {t === "Posts" && <Grid className="w-6 h-6" />}
            {t === "Reels" && <Film className="w-6 h-6" />}
            {t === "Tagged" && <Users className="w-6 h-6" />}
            {t === "Saved" && <Bookmark className="w-6 h-6" />}
          </button>
        ))}
      </div>

      {loadingProfile ? (
        <div className="flex justify-center py-16"><Loader2 className="w-7 h-7 text-teal-500 animate-spin" /></div>
      ) : activeTab === "Reels" ? (
        gridReels.length === 0 ? (
          <div className="text-center py-16 text-gray-400 text-sm">No reels yet.</div>
        ) : (
          <div className="grid grid-cols-3 gap-0.5">
            {gridReels.map((reel, index) => (
              <ProfileGridCell key={reel.id} media={{ id: reel.id, url: reel.video, type: "video" }} onClick={() => setSelectedReelIndex(index)} />
            ))}
          </div>
        )
      ) : activeTab === "Tagged" ? (
        <div className="text-center py-16 text-gray-400 text-sm">No tagged posts yet.</div>
      ) : displayImages.length === 0 ? (
        <div className="text-center py-16 text-gray-400 text-sm">
          {activeTab === "Saved" ? "No saved posts yet." : "No posts yet. Create your first post from the Create tab."}
        </div>
      ) : (
      <div className="grid grid-cols-3 gap-0.5">
        {displayImages.map((media) => (
          <ProfileGridCell key={media.id} media={media} onClick={() => openProfileMedia(media)} />
        ))}
      </div>
      )}
    </div>
  );
}

// â”€â”€ SETTINGS SECTION â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const SETTINGS_NAV = [
  { heading: "How you use", items: [
    { key: "edit_profile", label: "Edit profile", icon: Edit3 },
    { key: "saved", label: "Saved", icon: Bookmark },
    { key: "archive", label: "Archive", icon: Archive },
    { key: "activity", label: "Your activity", icon: Activity },
    { key: "notification_settings", label: "Notification", icon: Bell },
    { key: "language", label: "Select language", icon: Globe },
    { key: "time", label: "Time management", icon: Clock },
    { key: "rewards", label: "Reward points", icon: Star },
    { key: "create_page", label: "Create your page", icon: FileText },
  ]},
  { heading: "Privacy", items: [
    { key: "privacy", label: "Account privacy", icon: Lock },
    { key: "close_friends", label: "Close friends", icon: Heart },
    { key: "blocked", label: "Blocked", icon: UserX },
  ]},
  { heading: "How others can interact", items: [
    { key: "message_replies", label: "Message and story replies", icon: MessageSquare },
    { key: "tags", label: "Tag and mention", icon: Tag },
    { key: "comments", label: "Comments", icon: MessageCircle },
    { key: "sharing", label: "Sharing", icon: Share2 },
    { key: "invite", label: "Invite friends", icon: UserPlus },
  ]},
  { heading: "What you see", items: [
    { key: "favorites", label: "Your favorites", icon: ThumbsUp },
    { key: "mutual", label: "Mutual accounts", icon: Users },
    { key: "content", label: "Content preference", icon: Eye },
  ]},
];

function EditProfilePanel() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [avatar, setAvatar] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [form, setForm] = useState<Record<string, string | boolean>>({ name:"", username:"", website:"", bio:"", email:"", phone:"", gender:"", showSuggestions: true });
  const upd = (k: string, v: string | boolean) => setForm(p => ({ ...p, [k]: v }));
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.allSettled([profileApi.getMe(), socialApi.getMyProfile()])
      .then(([profileRes, socioRes]) => {
        if (cancelled) return;
        if (profileRes.status === "fulfilled") {
          setForm((prev) => ({
            ...prev,
            name: profileRes.value.name ?? "",
            email: profileRes.value.email ?? "",
            phone: profileRes.value.phone ?? "",
            gender: profileRes.value.gender ?? "",
            bio: profileRes.value.bio ?? "",
          }));
          if (profileRes.value.avatar) setAvatar(profileRes.value.avatar);
        }
        if (socioRes.status === "fulfilled") {
          setForm((prev) => ({
            ...prev,
            name: prev.name || socioRes.value.userName,
            username: socioRes.value.userName,
            bio: prev.bio || socioRes.value.bio || "",
          }));
          if (socioRes.value.userAvatar) {
            const socioAvatar = resolveMediaUrl(socioRes.value.userAvatar) || socioRes.value.userAvatar;
            setAvatar((current) => current || socioAvatar);
          }
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const saveProfile = async () => {
    if (saving) return;
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      let avatarUrl = avatar ?? "";
      if (pendingFile) {
        const uploaded = await socialApi.uploadMedia(pendingFile);
        avatarUrl = uploaded.url;
      }
      const savedProfile = await profileApi.updateMe({
        name: String(form.name || "").trim(),
        email: String(form.email || "").trim(),
        phone: String(form.phone || "").trim(),
        gender: String(form.gender || "").trim(),
        bio: String(form.bio || "").trim(),
        avatar: avatarUrl,
      });
      setAvatar(savedProfile.avatar ?? avatarUrl);
      setPendingFile(null);
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save profile.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-xl px-4 py-6 sm:py-8">
        {saved && <div className="mb-4 bg-teal-50 border border-teal-200 rounded-xl px-4 py-3 text-sm text-teal-700 font-medium flex items-center gap-2"><Check className="w-4 h-4" />Profile updated!</div>}
        <div className="flex items-center gap-4 mb-6 sm:mb-8">
          <div className="relative cursor-pointer" onClick={() => fileRef.current?.click()}>
            {avatar ? (
            <img src={avatar} alt="avatar" className="w-16 h-16 rounded-2xl object-cover" />
            ) : (
            <div className="w-16 h-16 rounded-2xl bg-gray-200 flex items-center justify-center"><User className="w-7 h-7 text-gray-500" /></div>
            )}
            <div className="absolute inset-0 rounded-2xl bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition">
              <Camera className="w-5 h-5 text-white" />
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) { setPendingFile(f); setAvatar(URL.createObjectURL(f)); } }} />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-800">{String(form.name || form.username || "Profile")}</p>
            <button onClick={() => fileRef.current?.click()} className="text-xs text-teal-500 font-semibold hover:underline mt-0.5">Change profile photo</button>
          </div>
        </div>
        {error && <p className="mb-3 text-xs text-red-500">{error}</p>}
        {[
          { label:"Name", key:"name", placeholder:"Planext4U", hint:"Help people discover your account." },
          { label:"Username", key:"username", placeholder:"Planext4U", hint:"You can change username back within 14 days." },
          { label:"Website", key:"website", placeholder:"https://", hint:"Editing links is available on mobile." },
          { label:"Bio", key:"bio", placeholder:"Tell your storyâ€¦", hint:`${String(form.bio).length}/150`, multi: true },
          { label:"Email", key:"email", placeholder:"email@example.com" },
          { label:"Phone", key:"phone", placeholder:"+91 97100 00000" },
          { label:"Gender", key:"gender", placeholder:"Prefer not to say" },
        ].map(({ label, key, placeholder, hint, multi }) => (
          <div key={key} className="flex flex-col sm:grid sm:grid-cols-3 gap-1 sm:gap-4 mb-4 sm:items-start">
            <label className="text-sm font-semibold text-gray-700 sm:pt-2 sm:text-right sm:pr-2 col-span-1">{label}</label>
            <div className="col-span-2">
              {multi
                ? <textarea value={String(form[key] ?? "")} onChange={e => upd(key, e.target.value)} placeholder={placeholder} rows={3} maxLength={150} className="w-full text-sm bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-teal-400 resize-none transition" />
                : <input type="text" value={String(form[key] ?? "")} onChange={e => upd(key, e.target.value)} placeholder={placeholder} className="w-full text-sm bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-teal-400 transition" />}
              {hint && <p className="text-[11px] text-gray-400 mt-1">{hint}</p>}
            </div>
          </div>
        ))}
        <div className="flex gap-3 mt-6">
          <button className="text-xs text-red-400 hover:text-red-600 underline underline-offset-2">Deactivate account</button>
          <button onClick={saveProfile} disabled={saving} className="ml-auto text-white text-sm font-bold px-5 py-2 rounded-xl shadow hover:opacity-90 transition disabled:opacity-60" style={{ background: TEAL }}>{saving ? "Saving..." : "Save"}</button>
        </div>
      </div>
    </div>
  );
}

function PrivacyPanel() {
  const { settings, loading, patch } = useSettingsContext();
  const priv = settings?.privateAccount ?? false;
  const actStatus = settings?.showActivityStatus ?? true;
  const messageAllow = settings?.messageAllowFrom ?? "Everyone";
  const commentAllow = settings?.commentsAllowFrom ?? "Everyone";
  const restrictComments = settings?.filterOffensiveComments ?? false;
  const [hideLikeCounts, setHideLikeCounts] = useState(false);

  const save = (partial: Parameters<typeof patch>[0]) => {
    void patch(partial).catch(() => {});
  };

  if (loading && !settings) {
    return <div className="flex flex-1 items-center justify-center p-8"><Loader2 className="h-7 w-7 animate-spin text-teal-500" /></div>;
  }

  return (
    <div className="min-h-full bg-[#F9FAFB] px-4 py-6 sm:px-8">
      <div className="w-full max-w-[830px] space-y-10">
        <section>
          <h2 className="mb-4 text-sm font-bold uppercase tracking-widest text-slate-500">Account Privacy</h2>
          <div className="overflow-hidden rounded-2xl bg-white ring-1 ring-slate-100">
            <div className="flex items-center gap-6 border-b border-slate-100 px-7 py-6">
              <div className="min-w-0 flex-1">
                <p className="text-lg font-bold text-slate-950">Private Account</p>
                <p className="mt-1 max-w-2xl text-base leading-snug text-slate-500">When enabled, only people you approve can see your posts, stories, and profile</p>
              </div>
              <Toggle checked={priv} onChange={(v) => save({ privateAccount: v })} />
            </div>
            <div className="flex items-center gap-6 px-7 py-6">
              <div className="min-w-0 flex-1">
                <p className="text-lg font-bold text-slate-950">Activity Status</p>
                <p className="mt-1 text-base text-slate-500">Show when you&apos;re active on the app</p>
              </div>
              <Toggle checked={actStatus} onChange={(v) => save({ showActivityStatus: v })} />
            </div>
          </div>
        </section>

        <section>
          <h2 className="mb-4 text-sm font-bold uppercase tracking-widest text-slate-500">Interactions</h2>
          <div className="overflow-hidden rounded-2xl bg-white ring-1 ring-slate-100">
            <div className="flex items-center gap-6 border-b border-slate-100 px-7 py-6">
              <p className="min-w-0 flex-1 text-lg font-bold text-slate-950">Who can message you</p>
              <button type="button" onClick={() => save({ messageAllowFrom: messageAllow === "Everyone" ? "People you follow" : "Everyone" })} className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-5 py-2.5 text-base text-slate-700">
                {messageAllow}<ChevronDown className="h-5 w-5" />
              </button>
            </div>
            <div className="flex items-center gap-6 px-7 py-6">
              <p className="min-w-0 flex-1 text-lg font-bold text-slate-950">Who can comment</p>
              <button type="button" onClick={() => save({ commentsAllowFrom: commentAllow === "Everyone" ? "People you follow" : "Everyone" })} className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-5 py-2.5 text-base text-slate-700">
                {commentAllow}<ChevronDown className="h-5 w-5" />
              </button>
            </div>
          </div>
        </section>

        <section>
          <h2 className="mb-4 text-sm font-bold uppercase tracking-widest text-slate-500">Content</h2>
          <div className="overflow-hidden rounded-2xl bg-white ring-1 ring-slate-100">
            <div className="flex items-center gap-6 border-b border-slate-100 px-7 py-6">
              <div className="min-w-0 flex-1">
                <p className="text-lg font-bold text-slate-950">Hide Like Counts</p>
                <p className="mt-1 text-base text-slate-500">Others won&apos;t be able to see likes on your posts</p>
              </div>
              <Toggle checked={hideLikeCounts} onChange={setHideLikeCounts} />
            </div>
            <div className="flex items-center gap-6 px-7 py-6">
              <div className="min-w-0 flex-1">
                <p className="text-lg font-bold text-slate-950">Restrict Comments</p>
                <p className="mt-1 text-base text-slate-500">Filter offensive comments automatically</p>
              </div>
              <Toggle checked={restrictComments} onChange={(v) => save({ filterOffensiveComments: v })} />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function NotificationSettingsPanel() {
  const { settings, loading, patch } = useSettingsContext();
  const notifSettings = { ...DEFAULT_NOTIFICATION_SETTINGS, ...(settings?.notifications ?? {}) };
  const toggle = (k: string) => {
    void patch({ notifications: { [k]: !notifSettings[k] } }).catch(() => {});
  };

  if (loading && !settings) {
    return <div className="flex flex-1 items-center justify-center p-8"><Loader2 className="h-7 w-7 animate-spin text-teal-500" /></div>;
  }

  return (
    <div className="min-h-full bg-[#F9FAFB] px-4 py-6 sm:px-8">
      <div className="w-full max-w-[668px] space-y-10">
        <section>
          <h2 className="mb-4 text-sm font-bold uppercase tracking-widest text-slate-500">Channels</h2>
          <div className="overflow-hidden rounded-2xl bg-white ring-1 ring-slate-100">
            {[
              { key:"pushNotifs", label:"Push Notifications", desc:"Receive notifications on your device", fallback: true },
              { key:"emailNotifs", label:"Email Notifications", desc:"Get email updates for important activity" },
            ].map(({ key, label, desc, fallback }, i) => (
              <div key={key} className={`flex items-center gap-6 px-6 py-5 ${i === 0 ? "border-b border-slate-100" : ""}`}>
                <div className="min-w-0 flex-1"><p className="text-lg font-bold text-slate-950">{label}</p><p className="mt-1 text-base text-slate-500">{desc}</p></div>
                <Toggle checked={Boolean(notifSettings[key] ?? fallback)} onChange={() => toggle(key)} />
              </div>
            ))}
          </div>
        </section>
        <section>
          <h2 className="mb-4 text-sm font-bold uppercase tracking-widest text-slate-500">Activity Alerts</h2>
          <div className="overflow-hidden rounded-2xl bg-white ring-1 ring-slate-100">
            {[
              { key:"likes", label:"Likes", desc:"When someone likes your post" },
              { key:"comments", label:"Comments", desc:"When someone comments on your post" },
              { key:"follows", label:"New Followers", desc:"When someone follows you" },
              { key:"messages", label:"Messages", desc:"When you receive a direct message" },
              { key:"mentions", label:"Mentions", desc:"When someone mentions you" },
              { key:"liveVideos", label:"Live Videos", desc:"When someone you follow goes live" },
              { key:"productUpdates", label:"Product Updates", desc:"Offers & deals from shops you follow", fallback: true },
            ].map(({ key, label, desc, fallback }, i, arr) => (
          <div key={key} className={`flex items-center gap-6 px-6 py-5 ${i < arr.length - 1 ? "border-b border-slate-100" : ""}`}>
            <div className="min-w-0 flex-1"><p className="text-lg font-bold text-slate-950">{label}</p><p className="mt-1 text-base text-slate-500">{desc}</p></div>
            <Toggle checked={Boolean(notifSettings[key] ?? fallback)} onChange={() => toggle(key)} />
          </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function SecurityPanel() {
  const [twoFactor, setTwoFactor] = useState(false);
  const [loginAlerts, setLoginAlerts] = useState(true);

  return (
    <div className="min-h-full bg-[#F9FAFB] px-4 py-6 sm:px-8">
      <div className="w-full max-w-[760px] space-y-10">
        <section>
          <h2 className="mb-4 text-sm font-bold uppercase tracking-widest text-slate-500">Two-Factor Authentication</h2>
          <div className="rounded-2xl bg-white px-7 py-6 ring-1 ring-slate-100">
            <div className="flex items-center gap-6">
              <div className="min-w-0 flex-1"><p className="text-lg font-bold text-slate-950">Enable 2FA</p><p className="mt-1 text-base text-slate-500">Add an extra layer of security to your account</p></div>
              <Toggle checked={twoFactor} onChange={setTwoFactor} />
            </div>
          </div>
        </section>
        <section>
          <h2 className="mb-4 text-sm font-bold uppercase tracking-widest text-slate-500">Login Activity</h2>
          <div className="overflow-hidden rounded-2xl bg-white ring-1 ring-slate-100">
            <div className="flex items-center gap-6 border-b border-slate-100 px-7 py-6">
              <div className="min-w-0 flex-1"><p className="text-lg font-bold text-slate-950">Login Alerts</p><p className="mt-1 text-base text-slate-500">Get notified of new logins to your account</p></div>
              <Toggle checked={loginAlerts} onChange={setLoginAlerts} />
            </div>
            <div className="px-7 py-6">
              <p className="mb-4 text-base font-bold text-slate-500">Current Session</p>
              <div className="flex items-center gap-6 rounded-3xl bg-slate-50 px-6 py-5">
                <Smartphone className="h-8 w-8 shrink-0 text-teal-600" />
                <div className="min-w-0 flex-1">
                  <p className="text-lg font-bold text-slate-950">This Device</p>
                  <p className="mt-1 text-base text-slate-500">Web Browser · Active now</p>
                  <p className="mt-1 text-xs text-slate-500">Signed in 7/2/2026</p>
                </div>
                <span className="h-3 w-3 rounded-full bg-emerald-500" />
              </div>
            </div>
          </div>
        </section>
        <section>
          <h2 className="mb-4 text-sm font-bold uppercase tracking-widest text-slate-500">Account Protection</h2>
          <div className="overflow-hidden rounded-2xl bg-white ring-1 ring-slate-100">
            {[
              { key:"logout_other", label:"Log out of all other devices", icon: LogOut },
              { key:"ownership", label:"Account Ownership & Control", icon: MapPin },
            ].map(({ key, label, icon: Icon }, i, arr) => (
              <button key={key} type="button" className={`flex w-full items-center gap-5 px-7 py-5 text-left ${i < arr.length - 1 ? "border-b border-slate-100" : ""}`}>
                <Icon className="h-7 w-7 shrink-0 text-slate-500" />
                <span className="min-w-0 flex-1 text-lg font-bold text-slate-950">{label}</span>
                <ChevronRight className="h-6 w-6 text-slate-500" />
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function HelpCenterPanel() {
  return (
    <div className="min-h-full bg-[#F9FAFB] px-4 py-6 sm:px-8">
      <div className="mx-auto w-full max-w-[604px] space-y-8">
        <div className="flex items-center gap-3 rounded-2xl bg-slate-100 px-5 py-4">
          <Search className="h-6 w-6 text-slate-500" />
          <input placeholder="Search help articles..." className="min-w-0 flex-1 bg-transparent text-base text-slate-700 outline-none placeholder:text-slate-500" />
        </div>
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Report Issue", icon: Flag },
            { label: "Live Chat", icon: MessageCircle },
            { label: "Email Us", icon: Mail },
          ].map(({ label, icon: Icon }) => (
            <button key={label} className="flex h-24 flex-col items-center justify-center gap-2 rounded-2xl bg-white ring-1 ring-slate-100">
              <Icon className="h-7 w-7 text-slate-500" />
              <span className="text-xs font-bold text-slate-950">{label}</span>
            </button>
          ))}
        </div>
        <section>
          <h2 className="mb-4 text-sm font-bold uppercase tracking-widest text-slate-500">Frequently Asked Questions</h2>
          <div className="overflow-hidden rounded-2xl bg-white ring-1 ring-slate-100">
            {[
              "How do I make my account private?",
              "How do I report a post or user?",
              "How do I change my username?",
              "Why can't I send messages?",
              "How do I delete my account?",
              "How do I sign in with phone OTP?",
              "How do reels work?",
              "How do I earn rewards?",
            ].map((question, i, arr) => (
              <button key={question} className={`flex w-full items-center gap-3 px-5 py-4 text-left ${i < arr.length - 1 ? "border-b border-slate-100" : ""}`}>
                <span className="min-w-0 flex-1 text-base font-bold text-slate-950">{question}</span>
                <ChevronRight className="h-5 w-5 text-slate-500" />
              </button>
            ))}
          </div>
        </section>
        <div className="rounded-2xl bg-white p-6 ring-1 ring-slate-100">
          <p className="mb-4 text-lg font-bold text-slate-950">Contact Support</p>
          <p className="text-base text-slate-500">Email: <span className="text-teal-600">support@planext4u.com</span></p>
          <p className="mt-2 text-base text-slate-500">Phone: <span className="text-teal-600">+91-9787176868</span></p>
          <p className="mt-2 text-sm text-slate-500">Available Mon-Sat, 9 AM - 6 PM IST</p>
        </div>
      </div>
    </div>
  );
}

function AboutPanel() {
  return (
    <div className="min-h-full bg-[#F9FAFB] px-4 py-10 sm:px-8">
      <div className="w-full max-w-[636px] rounded-2xl bg-white p-6 ring-1 ring-slate-100">
        <p className="mb-5 text-lg font-bold text-slate-950">About Planext4U</p>
        <p className="mb-3 text-base text-slate-500"><span className="font-bold text-slate-950">App Version:</span> 1.0.0</p>
        <p className="mb-3 text-base text-slate-500"><span className="font-bold text-slate-950">Company:</span> Planext4U Technologies Pvt Ltd</p>
        <p className="mb-8 text-base text-slate-500"><span className="font-bold text-slate-950">Contact:</span> support@planext4u.com</p>
        <div className="flex gap-6">
          <button className="text-base font-bold text-teal-600">Terms of Service</button>
          <button className="text-base font-bold text-teal-600">Privacy Policy</button>
        </div>
      </div>
    </div>
  );
}

function LanguagePanel() {
  const { settings, loading, patch } = useSettingsContext();
  const lang = settings?.language ?? "English";
  const langs = ["English","Tamil","Hindi","Telugu","Malayalam","Kannada","Bengali","Marathi","Gujarati","Punjabi"];

  if (loading && !settings) {
    return <div className="flex flex-1 items-center justify-center p-8"><Loader2 className="h-7 w-7 animate-spin text-teal-500" /></div>;
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 max-w-xl">
      <h2 className="text-base font-semibold text-gray-900 mb-6">Select Language</h2>
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {langs.map((l, i) => (
          <button key={l} onClick={() => { void patch({ language: l }).catch(() => {}); }} className={`w-full flex items-center justify-between px-4 py-3.5 text-sm transition hover:bg-gray-50 ${i < langs.length - 1 ? "border-b border-gray-50" : ""} ${lang === l ? "text-teal-600 font-bold" : "text-gray-700"}`}>
            {l}{lang === l && <Check className="w-4 h-4 text-teal-500" />}
          </button>
        ))}
      </div>
    </div>
  );
}

function TimeManagementPanel() {
  const { settings, loading, patch } = useSettingsContext();
  const limit = settings?.dailyTimeLimitMinutes ?? 60;
  const reminder = settings?.dailyReminder ?? true;

  if (loading && !settings) {
    return <div className="flex flex-1 items-center justify-center p-8"><Loader2 className="h-7 w-7 animate-spin text-teal-500" /></div>;
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 max-w-xl">
      <h2 className="text-base font-semibold text-gray-900 mb-6">Time Management</h2>
      <div className="space-y-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <p className="text-sm font-semibold text-gray-900 mb-1">Daily Time Limit</p>
          <p className="text-xs text-gray-400 mb-4">Set a daily limit for time spent on this app.</p>
          <div className="flex items-center gap-4">
            <input type="range" min={15} max={240} step={15} value={limit} onChange={e => { void patch({ dailyTimeLimitMinutes: +e.target.value }).catch(() => {}); }} className="flex-1 accent-teal-500" />
            <span className="text-sm font-bold text-teal-600 w-16 shrink-0">{limit >= 60 ? `${Math.floor(limit/60)}h ${limit%60 ? `${limit%60}m` : ""}` : `${limit}m`}</span>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5 flex items-center gap-4">
          <div className="flex-1"><p className="text-sm font-semibold text-gray-900">Daily Reminder</p><p className="text-xs text-gray-400 mt-0.5">Get reminded when you approach your limit.</p></div>
          <Toggle checked={reminder} onChange={(v) => { void patch({ dailyReminder: v }).catch(() => {}); }} />
        </div>
      </div>
    </div>
  );
}

function RewardsPanel() {
  const [balance, setBalance] = useState<number | null>(null);
  const [history, setHistory] = useState<{ id: string; points: number; description: string | null; createdAt: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    profileApi.getRewardPoints()
      .then((data) => {
        if (cancelled) return;
        setBalance(data.balance ?? 0);
        setHistory((data.recentHistory ?? []).slice(0, 8).map((row) => ({
          id: row.id,
          points: row.points,
          description: row.description,
          createdAt: row.createdAt,
        })));
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Could not load reward points.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 max-w-xl">
      <h2 className="text-base font-semibold text-gray-900 mb-6">Reward Points</h2>
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-7 w-7 animate-spin text-teal-500" /></div>
      ) : error ? (
        <div className="rounded-2xl border border-gray-100 bg-white p-8 text-center">
          <p className="text-sm text-red-500">{error}</p>
        </div>
      ) : (
        <>
          <div className="rounded-2xl text-white p-6 mb-5 text-center" style={{ background: TEAL }}>
            <Star className="w-8 h-8 mx-auto mb-2 fill-white" />
            <p className="text-3xl font-semibold">{balance ?? 0}</p>
            <p className="text-sm text-white/80 mt-1">Total reward points</p>
          </div>
          {history.length === 0 ? (
            <p className="text-sm text-gray-500 text-center">No reward activity yet.</p>
          ) : (
            <div className="space-y-2">
              {history.map((row) => (
                <div key={row.id} className="flex items-center justify-between rounded-xl border border-gray-100 bg-white px-4 py-3">
                  <div className="min-w-0 flex-1 pr-3">
                    <p className="truncate text-sm font-semibold text-gray-900">{row.description || "Reward activity"}</p>
                    <p className="text-xs text-gray-400">{formatRelativeTime(row.createdAt)}</p>
                  </div>
                  <span className={`text-sm font-bold ${row.points >= 0 ? "text-teal-600" : "text-red-500"}`}>{row.points >= 0 ? "+" : ""}{row.points}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function SavedPanel() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [selectedMedia, setSelectedMedia] = useState<ProfileGridMedia | null>(null);
  const [selectedReelIndex, setSelectedReelIndex] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [unsavingId, setUnsavingId] = useState<string | number | null>(null);
  const limit = 30;

  const loadSaved = useCallback(async (offset = 0, append = false) => {
    if (append) setLoadingMore(true);
    else setLoading(true);
    setError(null);
    try {
      const result = await socialApi.getSavedPosts({ limit, offset });
      setTotal(result.total ?? result.data.length);
      setPosts((prev) => append ? [...prev, ...result.data] : result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load saved posts.");
      if (!append) setPosts([]);
    } finally {
      if (append) setLoadingMore(false);
      else setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSaved();
  }, [loadSaved]);

  useEffect(() => {
    const onSaveChanged = (event: Event) => {
      const detail = (event as CustomEvent<{ postId?: string; saved?: boolean }>).detail;
      if (!detail?.postId) return;
      if (detail.saved === false) {
        setPosts((prev) => prev.filter((post) => String(post.id) !== String(detail.postId)));
        setTotal((prev) => Math.max(0, prev - 1));
        return;
      }
      loadSaved();
    };
    window.addEventListener("p4u:socio-save-changed", onSaveChanged);
    return () => window.removeEventListener("p4u:socio-save-changed", onSaveChanged);
  }, [loadSaved]);

  const mediaItems = posts
    .map(postToProfileGridMedia)
    .filter((item): item is ProfileGridMedia => Boolean(item));
  const reels = posts
    .map(postToReelItem)
    .filter((item): item is ReelItem => Boolean(item));

  const openSavedPost = (media: ProfileGridMedia) => {
    if (media.type === "video") {
      const index = reels.findIndex((reel) => String(reel.postId) === String(media.id));
      setSelectedReelIndex(index >= 0 ? index : 0);
      return;
    }
    setSelectedMedia(media);
  };

  const unsaveFromPanel = async (postId: string | number) => {
    if (unsavingId != null) return;
    const previous = posts;
    setUnsavingId(postId);
    setPosts((prev) => prev.filter((post) => String(post.id) !== String(postId)));
    setTotal((prev) => Math.max(0, prev - 1));
    try {
      await socialApi.unsavePost(postId);
    } catch (err) {
      setPosts(previous);
      setTotal(previous.length);
      setError(err instanceof Error ? err.message : "Could not unsave this post.");
    } finally {
      setUnsavingId(null);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 max-w-xl">
      {selectedMedia && <ProfileMediaModal media={selectedMedia} onClose={() => setSelectedMedia(null)} />}
      {selectedReelIndex != null && (
        <ProfileReelsViewer
          reels={reels}
          initialIndex={selectedReelIndex}
          onClose={() => setSelectedReelIndex(null)}
          onUserClick={() => {}}
        />
      )}
      <h2 className="text-base font-semibold text-gray-900 mb-6">Saved</h2>
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-7 w-7 animate-spin text-teal-500" />
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-gray-100 bg-white p-8 text-center">
          <Bookmark className="mx-auto mb-3 h-10 w-10 text-gray-300" />
          <p className="text-sm font-semibold text-gray-900">Could not load saved posts</p>
          <p className="mt-1 text-xs text-gray-400">{error}</p>
          <button onClick={() => loadSaved()} className="mt-4 rounded-xl px-4 py-2 text-xs font-bold text-white" style={{ background: TEAL }}>Try again</button>
        </div>
      ) : mediaItems.length === 0 ? (
        <div className="rounded-2xl border border-gray-100 bg-white p-10 text-center">
          <Bookmark className="mx-auto mb-3 h-10 w-10 text-gray-300" />
          <p className="text-sm font-semibold text-gray-900">No saved posts yet</p>
          <p className="mt-1 text-xs text-gray-400">Posts you save will appear here.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-1">
            {mediaItems.map((media) => (
              <div key={media.id} className="relative group">
                <ProfileGridCell media={media} onClick={() => openSavedPost(media)} />
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    unsaveFromPanel(media.id);
                  }}
                  disabled={unsavingId === media.id}
                  className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/55 text-white opacity-100 transition hover:bg-black/75 sm:opacity-0 sm:group-hover:opacity-100 disabled:opacity-60"
                  aria-label="Unsave post"
                >
                  {unsavingId === media.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bookmark className="h-4 w-4 fill-white" />}
                </button>
              </div>
            ))}
          </div>
          {posts.length < total && (
            <div className="mt-5 flex justify-center">
              <button
                onClick={() => loadSaved(posts.length, true)}
                disabled={loadingMore}
                className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-50 disabled:opacity-60"
              >
                {loadingMore ? "Loading..." : "Load more"}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function CloseFriendsPanel() {
  const { settings, loading, patch } = useSettingsContext();
  const [cfSuggestions, setCfSuggestions] = useState<SuggestionItem[]>([]);
  const friends = settings?.closeFriends ?? [];

  useEffect(() => {
    socialApi.getSuggestions({ limit: 15 })
      .then((rows) => setCfSuggestions(rows.map(mapApiSuggestion)))
      .catch(() => {});
  }, []);

  const toggleFriend = (userId: string) => {
    const next = friends.includes(userId) ? friends.filter((id) => id !== userId) : [...friends, userId];
    void patch({ closeFriends: next }).catch(() => {});
  };

  if (loading && !settings) {
    return <div className="flex flex-1 items-center justify-center p-8"><Loader2 className="h-7 w-7 animate-spin text-teal-500" /></div>;
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 max-w-xl">
      <h2 className="text-base font-semibold text-gray-900 mb-2">Close Friends</h2>
      <p className="text-xs text-gray-400 mb-5">People on your close friends list can see your close friends stories.</p>
      <div className="space-y-2">
        {cfSuggestions.map((s) => (
          <div key={s.id} className="flex items-center gap-3 bg-white rounded-xl p-3 border border-gray-100">
            <AvatarCircle src={s.avatar} name={s.name} />
            <div className="flex-1"><p className="text-sm font-semibold text-gray-900">{s.name}</p><p className="text-xs text-gray-400">{s.sub}</p></div>
            <button onClick={() => toggleFriend(s.userId)}
              className={`text-xs font-bold px-3 py-1.5 rounded-xl transition ${friends.includes(s.userId) ? "bg-teal-500 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}>
              {friends.includes(s.userId) ? "Added" : "Add"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function BlockedPanel() {
  const { settings, loading, patch } = useSettingsContext();
  const [candidates, setCandidates] = useState<SuggestionItem[]>([]);
  const blocked = settings?.blockedUsers ?? [];

  useEffect(() => {
    socialApi.getSuggestions({ limit: 15 })
      .then((rows) => setCandidates(rows.map(mapApiSuggestion)))
      .catch(() => {});
  }, []);

  const blockUser = (userId: string) => {
    if (blocked.includes(userId)) return;
    void patch({ blockedUsers: [...blocked, userId] }).catch(() => {});
  };

  const unblockUser = (userId: string) => {
    void patch({ blockedUsers: blocked.filter((id) => id !== userId) }).catch(() => {});
  };

  const blockedProfiles = blocked.map((userId) => {
    const match = candidates.find((c) => c.userId === userId);
    return { userId, name: match?.name ?? userId, avatar: match?.avatar ?? "" };
  });

  if (loading && !settings) {
    return <div className="flex flex-1 items-center justify-center p-8"><Loader2 className="h-7 w-7 animate-spin text-teal-500" /></div>;
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 max-w-xl">
      <h2 className="text-base font-semibold text-gray-900 mb-2">Blocked</h2>
      <p className="text-xs text-gray-400 mb-5">They won&apos;t be able to find your profile or posts.</p>
      {blockedProfiles.length === 0
        ? <p className="text-sm text-gray-400 text-center py-6">No blocked accounts</p>
        : <div className="space-y-2 mb-6">
            {blockedProfiles.map((b) => (
              <div key={b.userId} className="flex items-center gap-3 bg-white rounded-xl p-3 border border-gray-100">
                <AvatarCircle src={b.avatar} name={b.name} />
                <div className="flex-1"><p className="text-sm font-semibold text-gray-900">{b.name}</p></div>
                <button onClick={() => unblockUser(b.userId)} className="text-xs font-bold px-3 py-1.5 rounded-xl bg-gray-100 text-gray-700 hover:bg-gray-200 transition">Unblock</button>
              </div>
            ))}
          </div>}
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">Block someone</p>
      <div className="space-y-2">
        {candidates.filter((c) => !blocked.includes(c.userId)).map((s) => (
          <div key={s.userId} className="flex items-center gap-3 bg-white rounded-xl p-3 border border-gray-100">
            <AvatarCircle src={s.avatar} name={s.name} />
            <div className="flex-1"><p className="text-sm font-semibold text-gray-900">{s.name}</p></div>
            <button onClick={() => blockUser(s.userId)} className="text-xs font-bold px-3 py-1.5 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 transition">Block</button>
          </div>
        ))}
      </div>
    </div>
  );
}

function MessageRepliesPanel() {
  const { settings, loading, patch } = useSettingsContext();
  const storyReplies = settings?.storyReplies ?? "Everyone";
  const messageAllow = settings?.messageAllowFrom ?? "Everyone";

  if (loading && !settings) {
    return <div className="flex flex-1 items-center justify-center p-8"><Loader2 className="h-7 w-7 animate-spin text-teal-500" /></div>;
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 max-w-xl">
      <h2 className="text-base font-semibold text-gray-900 mb-6">Message and Story Replies</h2>
      <div className="space-y-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <p className="text-sm font-semibold text-gray-900 mb-3">Story replies</p>
          {["Everyone", "People you follow", "Off"].map((opt) => (
            <label key={opt} className="flex items-center gap-3 py-2 cursor-pointer">
              <div onClick={() => { void patch({ storyReplies: opt }).catch(() => {}); }} className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition ${storyReplies === opt ? "border-teal-500" : "border-gray-300"}`}>
                {storyReplies === opt && <div className="w-2 h-2 rounded-full bg-teal-500" />}
              </div>
              <span className="text-sm text-gray-700">{opt}</span>
            </label>
          ))}
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <p className="text-sm font-semibold text-gray-900 mb-3">Allow messages from</p>
          {["Everyone", "People you follow", "Your followers", "No one"].map((opt) => (
            <label key={opt} className="flex items-center gap-3 py-2 cursor-pointer">
              <div onClick={() => { void patch({ messageAllowFrom: opt }).catch(() => {}); }} className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition ${messageAllow === opt ? "border-teal-500" : "border-gray-300"}`}>
                {messageAllow === opt && <div className="w-2 h-2 rounded-full bg-teal-500" />}
              </div>
              <span className="text-sm text-gray-700">{opt}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}

function CommentsPanel() {
  const { settings, loading, patch } = useSettingsContext();
  const allow = settings?.commentsAllowFrom ?? "Everyone";
  const filter = settings?.filterOffensiveComments ?? true;

  if (loading && !settings) {
    return <div className="flex flex-1 items-center justify-center p-8"><Loader2 className="h-7 w-7 animate-spin text-teal-500" /></div>;
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 max-w-xl">
      <h2 className="text-base font-semibold text-gray-900 mb-6">Comments</h2>
      <div className="space-y-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <p className="text-sm font-semibold text-gray-900 mb-3">Allow comments from</p>
          {["Everyone","People you follow","Your followers","People you follow and your followers"].map(opt => (
            <label key={opt} className="flex items-center gap-3 py-1.5 cursor-pointer">
              <div onClick={() => { void patch({ commentsAllowFrom: opt }).catch(() => {}); }} className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition ${allow === opt ? "border-teal-500" : "border-gray-300"}`}>
                {allow === opt && <div className="w-2 h-2 rounded-full bg-teal-500" />}
              </div>
              <span className="text-sm text-gray-700">{opt}</span>
            </label>
          ))}
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-4">
          <div className="flex-1"><p className="text-sm font-semibold text-gray-900">Filter offensive comments</p><p className="text-xs text-gray-400 mt-0.5">Automatically hide offensive comments.</p></div>
          <Toggle checked={filter} onChange={(v) => { void patch({ filterOffensiveComments: v }).catch(() => {}); }} />
        </div>
      </div>
    </div>
  );
}

function GenericPanel({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 max-w-xl">
      <h2 className="text-base font-semibold text-gray-900 mb-2">{title}</h2>
      <p className="text-sm text-gray-500">{desc}</p>
    </div>
  );
}

function SettingsLanding({ onNavigate }: { onNavigate: (key: string) => void }) {
  const { settings, loading, patch } = useSettingsContext();
  const privateAccount = settings?.privateAccount ?? false;
  const activityStatus = settings?.showActivityStatus ?? true;
  const [darkMode, setDarkMode] = useState(false);

  const saveSetting = (partial: Parameters<typeof patch>[0]) => {
    void patch(partial).catch(() => {});
  };
  const logout = () => {
    clearUserAuthStorage();
    window.dispatchEvent(new CustomEvent("p4u-token-updated"));
    window.dispatchEvent(new CustomEvent("p4u-open-auth"));
  };

  const navGroups = [
    {
      heading: "ACCOUNT",
      items: [
        { key: "edit_profile", label: "Edit Profile", icon: User },
        { key: "privacy", label: "Privacy", icon: Eye },
        { key: "security", label: "Security", icon: Shield },
      ],
    },
    {
      heading: "PREFERENCES",
      items: [
        { key: "notification_settings", label: "Notifications", icon: Bell },
      ],
    },
    {
      heading: "SUPPORT",
      items: [
        { key: "help_center", label: "Help Center", icon: HelpCircle },
        { key: "about", label: "About", icon: Info },
      ],
    },
  ];

  return (
    <div className="min-h-full bg-[#F9FAFB] px-4 py-7 sm:px-6 sm:py-8">
      <div className="w-full max-w-[636px] space-y-8">
        {navGroups.map((group) => (
          <section key={group.heading}>
            <h2 className="mb-3 px-1 text-[17px] font-semibold uppercase tracking-wide text-slate-500">{group.heading}</h2>
            <div className="overflow-hidden rounded-[16px] bg-white ring-1 ring-slate-100">
              {group.items.map(({ key, label, icon: Icon }, index) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => onNavigate(key)}
                  className={`flex h-[63px] w-full items-center gap-5 px-7 text-left transition hover:bg-slate-50 ${index < group.items.length - 1 ? "border-b border-slate-100" : ""}`}
                >
                  <Icon className="h-6 w-6 shrink-0 text-slate-500" />
                  <span className="min-w-0 flex-1 text-[20px] font-medium leading-none text-slate-950">{label}</span>
                  <ChevronRight className="h-5 w-5 shrink-0 text-slate-500" />
                </button>
              ))}
              {group.heading === "PREFERENCES" && (
                <div className="flex h-[63px] items-center gap-5 border-t border-slate-100 px-7">
                  <Moon className="h-6 w-6 shrink-0 text-slate-500" />
                  <span className="min-w-0 flex-1 text-[20px] font-medium leading-none text-slate-950">Dark Mode</span>
                  <Toggle checked={darkMode} onChange={setDarkMode} />
                </div>
              )}
            </div>
          </section>
        ))}

        <section>
          <h2 className="mb-3 px-1 text-[17px] font-semibold uppercase tracking-wide text-slate-500">PRIVACY CONTROLS</h2>
          <div className="overflow-hidden rounded-[16px] bg-white ring-1 ring-slate-100">
            <div className="flex min-h-[64px] items-center gap-5 border-b border-slate-100 px-7 py-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-950">Private Account</p>
                <p className="mt-0.5 text-[11px] text-slate-500">Only followers can see your posts</p>
              </div>
              <Toggle checked={privateAccount} onChange={(v) => saveSetting({ privateAccount: v })} />
            </div>
            <div className="flex min-h-[64px] items-center gap-5 px-7 py-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-950">Activity Status</p>
                <p className="mt-0.5 text-[11px] text-slate-500">Show when you&apos;re online</p>
              </div>
              <Toggle checked={activityStatus} onChange={(v) => saveSetting({ showActivityStatus: v })} />
            </div>
          </div>
        </section>

        {loading && !settings && (
          <div className="flex justify-center py-2">
            <Loader2 className="h-5 w-5 animate-spin text-teal-500" />
          </div>
        )}

        <button
          type="button"
          onClick={logout}
          className="flex h-[54px] w-full items-center gap-4 rounded-[16px] bg-white px-6 text-left text-sm font-semibold text-red-500 ring-1 ring-slate-100 transition hover:bg-red-50"
        >
          <LogOut className="h-5 w-5 shrink-0" />
          Log Out
        </button>
      </div>
    </div>
  );
}

const SettingsContext = createContext<ReturnType<typeof useSocialSettings> | null>(null);

function useSettingsContext() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("Settings panels must be used within SettingsSection");
  return ctx;
}

function SettingsSection() {
  const [activeMenu, setActiveMenu] = useState("settings_home");
  const settingsState = useSocialSettings();

  const handleMenu = (key: string) => { setActiveMenu(key); };

  const renderPanel = () => {
    switch (activeMenu) {
      case "settings_home": return <SettingsLanding onNavigate={handleMenu} />;
      case "edit_profile": return <EditProfilePanel />;
      case "notification_settings": return <NotificationSettingsPanel />;
      case "privacy": return <PrivacyPanel />;
      case "security": return <SecurityPanel />;
      case "help_center": return <HelpCenterPanel />;
      case "about": return <AboutPanel />;
      case "language": return <LanguagePanel />;
      case "time": return <TimeManagementPanel />;
      case "rewards": return <RewardsPanel />;
      case "saved": return <SavedPanel />;
      case "close_friends": return <CloseFriendsPanel />;
      case "blocked": return <BlockedPanel />;
      case "comments": return <CommentsPanel />;
      case "archive": return <GenericPanel title="Archive" desc="View your archived posts and stories. Archived posts are only visible to you." />;
      case "activity": return <GenericPanel title="Your Activity" desc="See a summary of your recent activity including posts, comments, likes and follows." />;
      case "create_page": return <GenericPanel title="Create Your Page" desc="Set up a page to represent your business, brand, or organisation." />;
      case "message_replies": return <MessageRepliesPanel />;
      case "tags": return <GenericPanel title="Tags and Mentions" desc="Control who can tag or mention you in their posts and stories." />;
      case "sharing": return <GenericPanel title="Sharing" desc="Control who can share your posts and stories to their feeds." />;
      case "invite": return <GenericPanel title="Invite Friends" desc="Invite your contacts to join P4U and earn reward points." />;
      case "favorites": return <GenericPanel title="Your Favorites" desc="Posts from your favorite accounts appear first in your feed." />;
      case "mutual": return <GenericPanel title="Mutual Accounts" desc="See accounts that you and your followers both follow." />;
      case "content": return <GenericPanel title="Content Preference" desc="Adjust what types of content you see more or less of in your feed." />;
      default: return <EditProfilePanel />;
    }
  };

  return (
    <SettingsContext.Provider value={settingsState}>
    <div className="min-h-[640px] bg-[#F9FAFB]">
      <div className="flex min-h-[640px] flex-col">
        {activeMenu !== "settings_home" && (
          <div className="flex items-center gap-2 border-b border-slate-100 bg-white px-4 py-3 sm:px-6">
            <button onClick={() => setActiveMenu("settings_home")} className="rounded-full p-1 hover:bg-slate-50">
              <ArrowLeft className="h-5 w-5 text-slate-700" />
            </button>
            <span className="text-sm font-bold text-slate-950 capitalize">{activeMenu?.replace(/_/g," ")}</span>
          </div>
        )}
        <div className="min-h-0 flex-1">
          {renderPanel()}
        </div>
      </div>
    </div>
    </SettingsContext.Provider>
  );
}

// â”€â”€ NAV CONFIG â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const NAV_ITEMS = [
  { key: "home", label: "Socio Home", icon: Home },
  { key: "explore", label: "Explore", icon: Compass },
  { key: "reels", label: "Reels", icon: Film },
  { key: "messages", label: "Messages", icon: MessageCircle },
  { key: "friends", label: "Friends", icon: Users },
  { key: "notifications", label: "Notification", icon: Bell },
  { key: "create", label: "Create", icon: PlusCircle },
  { key: "settings", label: "Settings", icon: Settings },
  { key: "profile", label: "Profile", icon: User },
];

// â”€â”€ MAIN APP â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export default function SocialApp() {
  const [section, setSection] = useState("home");
  const [userProfile, setUserProfile] = useState<{ userId: string } | null>(null);
  const [pendingMessageUserId, setPendingMessageUserId] = useState<string | null>(null);
  const [accountProfile, setAccountProfile] = useState<SocioUserProfile | null>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    socialApi.getMyProfile()
      .then((profile) => {
        if (!cancelled) setAccountProfile(profile);
      })
      .catch(() => {
        if (!cancelled) setAccountProfile(null);
      });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (accountProfile && userProfile && String(accountProfile.userId) === String(userProfile.userId)) {
      setUserProfile(null);
      setSection("profile");
    }
  }, [accountProfile, userProfile]);

  const handleUserClick = (userId: string) => {
    if (!userId) return;
    if (accountProfile && String(accountProfile.userId) === String(userId)) {
      setUserProfile(null);
      setSection("profile");
      setMobileNavOpen(false);
      return;
    }
    setUserProfile({ userId });
  };

  const handleBackFromProfile = () => {
    setUserProfile(null);
  };

  const handleMessageUser = (userId: string) => {
    if (!userId) return;
    if (accountProfile && String(accountProfile.userId) === String(userId)) return;
    setPendingMessageUserId(userId);
    setUserProfile(null);
    setSection("messages");
    setMobileNavOpen(false);
  };

  const handleNavClick = (key: string) => {
    setSection(key);
    setUserProfile(null);
    setMobileNavOpen(false);
  };

  const renderContent = () => {
    // User profile overlay takes priority
    if (userProfile) {
      return <UserProfilePage userId={userProfile.userId} onBack={handleBackFromProfile} onUserClick={handleUserClick} onMessage={handleMessageUser} />;
    }
    switch (section) {
      case "home": return <HomeSection onUserClick={handleUserClick} />;
      case "explore": return <ExploreSection onUserClick={handleUserClick} />;
      case "reels": return <ReelsSection onUserClick={handleUserClick} />;
      case "messages": return <MessagesSection onUserClick={handleUserClick} pendingUserId={pendingMessageUserId} onPendingHandled={() => setPendingMessageUserId(null)} />;
      case "friends": return <ExploreSection onUserClick={handleUserClick} />;
      case "notifications": return <NotificationsSection onUserClick={handleUserClick} />;
      case "create": return <CreateSection onPosted={() => setSection("home")} />;
      case "profile": return <MyProfileSection onUserClick={handleUserClick} />;
      case "settings": return <SettingsSection />;
      default: return <HomeSection onUserClick={handleUserClick} />;
    }
  };
  const isMessagesView = section === "messages" && !userProfile;

  return (
    <div className="w-full bg-[#F9FAFB]">
     <div className={`max-w-[1300px] mx-auto flex bg-[#F9FAFB] font-sans ${isMessagesView ? "" : "min-h-screen"}`}>
      {/* â”€â”€ Desktop Sidebar â”€â”€ */}
      <aside className="hidden w-64 shrink-0 flex-col gap-6 bg-[#F9FAFB] px-5 py-6 md:flex">
        <nav className="rounded-2xl border border-slate-100 bg-white px-4 py-4 shadow-sm">
          <div className="space-y-2">
            {NAV_ITEMS.map(({ key, label, icon: Icon }) => {
              const active = section === key && !userProfile;
              return (
                <button
                  key={key}
                  onClick={() => handleNavClick(key)}
                  className={`flex w-full items-center gap-4 rounded-2xl px-5 py-3.5 text-left text-lg font-medium transition ${active ? "text-white shadow-sm" : "text-slate-900 hover:bg-slate-50"}`}
                  style={active ? { background: TEAL_SOLID } : {}}
                >
                  {key === "profile" ? (
                    <AvatarCircle src={accountProfile?.userAvatar} name={accountProfile?.userName ?? "Account"} size="sm" className="shrink-0 border-slate-200" />
                  ) : (
                    <Icon className={`h-6 w-6 shrink-0 ${active ? "text-white" : "text-slate-950"}`} strokeWidth={2.25} />
                  )}
                  <span className="truncate">{label}</span>
                </button>
              );
            })}
          </div>
        </nav>
        <div className="rounded-2xl bg-gradient-to-br from-[#08a7a3] to-[#18c7bd] px-6 py-7 text-white shadow-sm">
          <h3 className="text-xl font-extrabold leading-tight">Welcome to<br />ClassiGrids</h3>
          <p className="mt-3 text-[11px] font-semibold leading-relaxed text-white/90">
            Buy And Sell Everything From Used Cars To Mobile Phones And Computers, Or Jobs And More.
          </p>
        </div>
      </aside>

      {/* â”€â”€ Main Content â”€â”€ */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Top Bar */}
        <header className="md:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-gray-100 shrink-0 z-10">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: TEAL }}>
              <span className="text-white font-black text-xs">P4</span>
            </div>
            <span className="text-sm font-black text-gray-900">P4U Social</span>
          </div>
          <div className="flex items-center gap-2">
            <button className="p-1.5 hover:bg-gray-100 rounded-lg"><Bell className="w-5 h-5 text-gray-600" /></button>
            <button onClick={() => setMobileNavOpen(v => !v)} className="p-1.5 hover:bg-gray-100 rounded-lg">
              <Menu className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </header>

        {/* Mobile Drawer */}
        {mobileNavOpen && (
          <div className="md:hidden fixed inset-0 z-50 flex">
            <div className="absolute inset-0 bg-black/40" onClick={() => setMobileNavOpen(false)} />
            <div className="relative w-64 bg-white h-full flex flex-col py-6 px-4 shadow-2xl">
              <div className="flex items-center gap-3 mb-6 px-2">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: TEAL }}>
                  <span className="text-white font-black text-sm">P4</span>
                </div>
                <span className="text-sm font-black text-gray-900">P4U Social</span>
                <button onClick={() => setMobileNavOpen(false)} className="ml-auto p-1 hover:bg-gray-100 rounded-lg"><X className="w-4 h-4 text-gray-500" /></button>
              </div>
              {NAV_ITEMS.map(({ key, label, icon: Icon }) => (
                <button key={key} onClick={() => handleNavClick(key)}
                  className={`flex items-center gap-3 px-3 py-3 rounded-xl text-left transition mb-0.5 ${section === key && !userProfile ? "text-teal-600 bg-teal-50 font-semibold" : "text-gray-600 hover:bg-gray-50"}`}>
                  <Icon className={`w-5 h-5 shrink-0 ${section === key && !userProfile ? "text-teal-500" : "text-gray-400"}`} />
                  <span className="text-sm">{label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Page Content */}
        <main className="flex-1">
          {renderContent()}
        </main>

        {/* Mobile Bottom Nav */}
        <nav className="md:hidden flex bg-white border-t border-gray-100 shrink-0 z-10">
          {NAV_ITEMS.filter(n => ["home","explore","reels","create","profile"].includes(n.key)).map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => handleNavClick(key)}
              className={`flex-1 flex flex-col items-center justify-center py-2.5 gap-0.5 transition ${section === key && !userProfile ? "text-teal-600" : "text-gray-400"}`}>
              {key === "create"
                ? <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: section === "create" ? TEAL : "#f3f4f6" }}>
                    <PlusCircle className={`w-4 h-4 ${section === "create" ? "text-white" : "text-gray-500"}`} />
                  </div>
                : <Icon className="w-5 h-5" />}
              <span className="text-[9px] font-semibold">{label}</span>
            </button>
          ))}
        </nav>
      </div>
    </div>
    </div>
  );
}

