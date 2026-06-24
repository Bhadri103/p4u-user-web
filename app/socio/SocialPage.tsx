import { useState, useRef, useEffect, useCallback } from "react";
import {
  Heart, MessageCircle, Send, Bookmark, MoreHorizontal,
  Search, X, PlusCircle, Phone, Video, Info, Image as ImageIcon,
  Smile, ArrowLeft, Volume2, VolumeX,
  ChevronRight, ChevronLeft, Camera, Lock, Users, Eye,
  Bell, Archive, Activity, Globe, Clock, Star, FileText,
  MessageSquare, Tag, Share2, UserPlus, ThumbsUp,
  UserX, Check, Edit3, Home, Compass, Film, Settings,
  User, Menu, Grid, Play, Layers, Loader2
} from "lucide-react";
import { socialApi, type SocioUserProfile } from "@/lib/api/social";
import { resolveMediaUrl } from "@/lib/media";

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

// ── TYPES for local UI state ────────────────────────────────────────────────────
interface StoryItem { id: number | string; mine: boolean; label: string; avatar: string | null; mediaUrl?: string }
interface PostItem { id: number | string; userId: string; user: string; co: string; avatarA: string; avatarB: string | null; location: string; time: string; image: string; likes: number; comments: number; shares: number; caption: string; hashtags: string; isLiked?: boolean; isSaved?: boolean }
interface ContactItem { id: number; name: string; avatar: string; lastMsg: string; time: string; unread: boolean }
interface NotificationItem { id: string | number; userId: string; group: string; user: string; text: string; time: string; avatar: string; action: string }
interface SearchItem { id: number; name: string; sub: string; avatar: string; verified: boolean }
interface SuggestionItem { id: string | number; userId: string; name: string; sub: string; avatar: string }
interface UserProfileData { userId: string; name: string; username: string; bio: string; website: string; posts: number; followers: string; following: string; avatar: string; images: string[]; verified: boolean; isSelf: boolean; isFollowing: boolean }
interface ExplorePostItem { id: number | string; image: string; likes: number; comments: number }
interface ReelItem { id: number | string; postId: string | number; userId: string; username: string; caption: string; video: string; likes: number; comments: number; shares: number; avatar: string; user: string; isLiked?: boolean }

/** Map an API Post to the shape our PostCard expects */
function mapApiPostToPostItem(p: { id: string | number; userId?: string | number; userName?: string; userAvatar?: string; content?: string; imageUrl?: string; likeCount: number; commentCount: number; shareCount?: number; isLiked?: boolean; isSaved?: boolean; createdAt: string }): PostItem {
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
      return u.trim() ? resolveMediaUrl(u.trim()) || u : "";
    })(),
    likes: p.likeCount,
    comments: p.commentCount,
    shares: p.shareCount ?? 0,
    isLiked: p.isLiked ?? false,
    isSaved: p.isSaved ?? false,
    caption: p.content ?? "",
    hashtags: "",
  };
}

/** Map an API Story to the shape our StoryCircle expects */
function mapApiStoryToStoryItem(s: { id: string | number; userName?: string; userAvatar?: string; mediaUrl?: string }): StoryItem {
  return {
    id: s.id,
    mine: false,
    label: s.userName ?? "user",
    avatar: (() => {
      const u = s.userAvatar ?? "";
      return u.trim() ? resolveMediaUrl(u.trim()) || u : null;
    })(),
    mediaUrl: (() => {
      const u = s.mediaUrl ?? "";
      return u.trim() ? resolveMediaUrl(u.trim()) || u : undefined;
    })(),
  };
}

/** Map an API UserSummary to suggestion shape */
function mapApiSuggestion(u: { id?: string | number; userId?: string; name?: string; avatar?: string }): SuggestionItem {
  const uid = String(u.userId ?? u.id ?? "");
  return { id: uid, userId: uid, name: u.name ?? "user", sub: "Suggested for you", avatar: (() => { const a = u.avatar ?? ""; return a.trim() ? resolveMediaUrl(a.trim()) || a : ""; })() };
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
  if (days < 1) return "Yesterday";
  if (days < 7) return "This Week";
  return "Earlier";
}

function isVideoPost(p: { postType?: string; imageUrl?: string; mediaUrls?: string[] }): boolean {
  if (p.postType === "video") return true;
  const urls = [...(p.mediaUrls ?? []), p.imageUrl].filter(Boolean) as string[];
  return urls.some((u) => /\.(mp4|webm|mov|m4v)(\?|$)/i.test(u));
}

// ── UTILS ─────────────────────────────────────────────────────────────────────
function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!checked)} className={`w-11 h-6 rounded-full transition-all relative shrink-0 ${checked ? "bg-teal-500" : "bg-gray-300"}`}>
      <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${checked ? "translate-x-[22px]" : "translate-x-[2px]"}`} />
    </button>
  );
}

// ── STORY VIEWER ──────────────────────────────────────────────────────────────
function StoryViewer({ story, onClose }: { story: StoryItem; onClose: () => void }) {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    if (story.id && story.id !== "my") {
      socialApi.viewStory(story.id).catch(() => {});
    }
  }, [story.id]);
  useEffect(() => {
    const t = setInterval(() => setProgress(p => { if (p >= 100) { onClose(); return 0; } return p + 2; }), 60);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90" onClick={onClose}>
      <div className="relative w-full max-w-xs sm:max-w-sm h-[85vh] max-h-[600px] rounded-2xl overflow-hidden bg-gray-900" onClick={e => e.stopPropagation()}>
        {(story.mediaUrl || story.avatar) ? (
        <img src={story.mediaUrl || story.avatar || ""} alt={story.label} className="w-full h-full object-cover bg-gray-800" />
        ) : (
        <div className="w-full h-full bg-gray-800 flex items-center justify-center text-white text-sm">{story.label}</div>
        )}
        <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/60 to-transparent">
          <div className="h-0.5 bg-white/30 rounded-full mb-3 w-full">
            <div className="h-full bg-white rounded-full transition-all" style={{ width: `${progress}%` }} />
          </div>
          <div className="flex items-center gap-3">
            {story.avatar ? <img src={story.avatar} alt="" className="w-9 h-9 rounded-full border-2 border-teal-400 object-cover" /> : <div className="w-9 h-9 rounded-full border-2 border-teal-400 bg-gray-600" />}
            <span className="text-white text-sm font-bold">{story.label}</span>
            <span className="text-white/60 text-xs ml-auto">1h</span>
          </div>
        </div>
        <button onClick={onClose} className="absolute top-4 right-4 bg-black/40 rounded-full p-1.5"><X className="w-4 h-4 text-white" /></button>
      </div>
    </div>
  );
}

function StoryCircle({ story, onClick }: { story: StoryItem; onClick: () => void }) {
  return (
    <div className="flex flex-col items-center gap-1 shrink-0 cursor-pointer" onClick={onClick}>
      <div className={`w-14 h-14 rounded-full flex items-center justify-center border-2 overflow-hidden transition-transform hover:scale-105 ${story.mine ? "border-dashed border-gray-300" : "border-teal-400"}`}>
        {story.mine
          ? <div className="w-full h-full bg-gray-100 flex items-center justify-center"><PlusCircle className="w-5 h-5 text-teal-400" /></div>
          : story.avatar || story.mediaUrl
            ? <img src={story.avatar || story.mediaUrl} alt={story.label} className="w-full h-full object-cover" />
            : <div className="w-full h-full bg-gray-200 flex items-center justify-center text-[9px] text-gray-500 text-center px-1">{story.label}</div>}
      </div>
      <span className="text-[10px] text-gray-500 truncate w-14 text-center">{story.label}</span>
    </div>
  );
}

// ── POST CARD ─────────────────────────────────────────────────────────────────
function PostCard({ post: p, onUserClick }: { post: PostItem; onUserClick: (userId: string) => void }) {
  const [liked, setLiked] = useState(p.isLiked ?? false);
  const [saved, setSaved] = useState(p.isSaved ?? false);
  const [likes, setLikes] = useState(p.likes);
  const [shares, setShares] = useState(p.shares);
  const [comment, setComment] = useState("");
  const [commentList, setCommentList] = useState<{ id: string | number; user: string; text: string }[]>([]);
  const [commentCount, setCommentCount] = useState(p.comments);
  const [showComments, setShowComments] = useState(false);
  const [commentsLoaded, setCommentsLoaded] = useState(false);
  const [commentBusy, setCommentBusy] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [likeBusy, setLikeBusy] = useState(false);
  const [saveBusy, setSaveBusy] = useState(false);

  useEffect(() => {
    setLiked(p.isLiked ?? false);
    setSaved(p.isSaved ?? false);
    setLikes(p.likes);
    setShares(p.shares);
    setCommentCount(p.comments);
  }, [p.id, p.isLiked, p.isSaved, p.likes, p.shares, p.comments]);

  const toggleLike = async () => {
    if (likeBusy) return;
    const next = !liked;
    setLiked(next);
    setLikes(v => (next ? v + 1 : v - 1));
    setLikeBusy(true);
    try {
      if (next) await socialApi.likePost(p.id);
      else await socialApi.unlikePost(p.id);
    } catch {
      // revert optimistic update on failure
      setLiked(!next);
      setLikes(v => (next ? v - 1 : v + 1));
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
      setCommentList(rows.map(c => ({ id: c.id, user: c.userName ?? "user", text: c.content })));
      setCommentCount(prev => Math.max(prev, rows.length));
    } catch { /* feed may be unreachable */ }
    setCommentsLoaded(true);
  };

  const toggleComments = () => {
    setShowComments(v => {
      const next = !v;
      if (next && !commentsLoaded) loadComments();
      return next;
    });
  };

  const submitComment = async () => {
    const text = comment.trim();
    if (!text || commentBusy) return;
    setComment("");
    setShowComments(true);
    const tempId = `temp-${Date.now()}`;
    setCommentList(list => [...list, { id: tempId, user: "you", text }]);
    setCommentCount(c => c + 1);
    setCommentBusy(true);
    try {
      const saved = await socialApi.createComment(p.id, { contentText: text });
      setCommentList(list => list.map(c => (c.id === tempId ? { id: saved.id, user: saved.userName ?? "You", text: saved.content || text } : c)));
    } catch {
      setCommentList(list => list.filter(c => c.id !== tempId));
      setCommentCount(c => c - 1);
      setComment(text);
    } finally {
      setCommentBusy(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-4">
      <div className="flex items-center gap-3 px-4 py-3">
        <button onClick={() => p.userId && onUserClick(p.userId)} className="relative w-10 h-10 shrink-0">
          {p.avatarA ? (
          <img src={p.avatarA} alt={p.user} className="w-10 h-10 rounded-full object-cover border-2 border-teal-400 hover:border-teal-600 transition" />
          ) : (
          <div className="w-10 h-10 rounded-full border-2 border-teal-400 bg-gray-200 flex items-center justify-center text-[10px] text-gray-500 font-bold">?</div>
          )}
          {p.avatarB && <img src={p.avatarB} alt="" className="w-7 h-7 rounded-full object-cover border-2 border-white absolute -bottom-1 -right-1" />}
        </button>
        <div className="flex-1 min-w-0">
          <button onClick={() => p.userId && onUserClick(p.userId)} className="text-sm font-bold text-gray-900 truncate hover:text-teal-600 transition text-left">
            {p.user} {p.co && <span className="font-normal text-gray-500 text-xs">{p.co}</span>}
          </button>
          <p className="text-[11px] text-gray-400">{p.location} · {p.time}</p>
        </div>
        <div className="relative">
          <button onClick={() => setShowMenu(true)} className="p-1 text-gray-400 hover:text-gray-700"><MoreHorizontal className="w-4 h-4" /></button>
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
      <div className="relative w-full aspect-[4/3] bg-gray-100">
        {p.image ? (
        <img src={p.image} alt="post" className="w-full h-full object-cover" />
        ) : (
        <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">No media</div>
        )}
      </div>
      <div className="px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-4">
            <button onClick={toggleLike} disabled={likeBusy} className="flex items-center gap-1 group disabled:opacity-60">
              <Heart className={`w-5 h-5 transition-all ${liked ? "fill-red-500 text-red-500 scale-110" : "text-gray-500 group-hover:text-red-400"}`} />
              <span className="text-xs font-semibold text-gray-600">{likes.toLocaleString()}</span>
            </button>
            <button onClick={toggleComments} className="flex items-center gap-1 group">
              <MessageCircle className="w-5 h-5 text-gray-500 group-hover:text-teal-500 transition" />
              <span className="text-xs font-semibold text-gray-600">{commentCount}</span>
            </button>
            <button onClick={handleShare} className="flex items-center gap-1 group">
              <Send className="w-5 h-5 text-gray-500 group-hover:text-blue-500 transition" />
              <span className="text-xs font-semibold text-gray-600">{shares}</span>
            </button>
          </div>
          <button onClick={toggleSave} disabled={saveBusy}>
            <Bookmark className={`w-5 h-5 transition ${saved ? "fill-teal-500 text-teal-500" : "text-gray-400 hover:text-teal-500"}`} />
          </button>
        </div>
        <p className="text-xs text-gray-700 mb-1"><span className="font-semibold">{p.user}</span> {p.caption}</p>
        <p className="text-xs text-teal-600">{p.hashtags}</p>
        {showComments && commentList.length > 0 && (
          <div className="mt-2 space-y-1">
            {commentList.map((c) => <p key={c.id} className="text-xs text-gray-700"><span className="font-semibold">{c.user} </span>{c.text}</p>)}
          </div>
        )}
        <div className="mt-2 flex gap-2">
          <input value={comment} onChange={e => setComment(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") submitComment(); }}
            placeholder="Add a comment… (Enter to post)"
            className="flex-1 text-xs bg-gray-50 border border-gray-200 rounded-full px-3 py-1.5 outline-none focus:border-teal-400" />
          {comment.trim() && (
            <button onClick={submitComment} disabled={commentBusy}
              className="text-xs font-bold text-teal-500 hover:text-teal-700 px-2 disabled:opacity-60">Post</button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── CREATE STORY MODAL ────────────────────────────────────────────────────────
function CreateStoryModal({ onClose, onCreated }: { onClose: () => void; onCreated?: () => void }) {
  const [preview, setPreview] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [filter, setFilter] = useState("Normal");
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
                <input value={caption} onChange={e => setCaption(e.target.value)} placeholder="Add caption…"
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
              {submitting ? "Sharing…" : "Share to Story"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── USER PROFILE PAGE ─────────────────────────────────────────────────────────
function UserProfilePage({ userId, onBack }: { userId: string; onBack: () => void }) {
  const [profile, setProfile] = useState<UserProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState(false);
  const [followBusy, setFollowBusy] = useState(false);
  const [selectedImg, setSelectedImg] = useState<string | null>(null);
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
          .map((p) => {
            const u = p.imageUrl ?? "";
            return u.trim() ? resolveMediaUrl(u.trim()) || u : "";
          })
          .filter(Boolean);
        setProfile({
          userId: prof.userId,
          name: prof.userName,
          username: prof.userName,
          bio: prof.bio ?? "",
          website: "",
          posts: prof.postCount,
          followers: prof.followerCount.toLocaleString(),
          following: prof.followingCount.toLocaleString(),
          avatar: prof.userAvatar ? resolveMediaUrl(prof.userAvatar) || prof.userAvatar : "",
          images,
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

  const toggleFollow = async () => {
    if (!profile || profile.isSelf || followBusy) return;
    const next = !following;
    setFollowing(next);
    setFollowBusy(true);
    try {
      if (next) await socialApi.followUser(userId);
      else await socialApi.unfollowUser(userId);
    } catch {
      setFollowing(!next);
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
        <button onClick={onBack} className="mt-4 text-teal-500 text-sm font-semibold">← Go back</button>
      </div>
    );
  }

  const TABS = ["Posts", "Reels", "Tagged"];

  return (
    <div className="min-h-full bg-white">
      {selectedImg && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center px-4" onClick={() => setSelectedImg(null)}>
          <img src={selectedImg} alt="" className="max-w-full max-h-[85vh] rounded-2xl object-cover" />
          <button className="absolute top-4 right-4 bg-white/20 rounded-full p-2"><X className="w-5 h-5 text-white" /></button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 sticky top-0 bg-white z-10">
        <button onClick={onBack} className="p-1.5 hover:bg-gray-100 rounded-xl transition">
          <ArrowLeft className="w-5 h-5 text-gray-700" />
        </button>
        <div className="flex-1">
          <p className="text-sm font-bold text-gray-900">{profile.username}</p>
          <p className="text-[11px] text-gray-400">{profile.posts} posts</p>
        </div>
        <button className="p-1.5 hover:bg-gray-100 rounded-xl"><MoreHorizontal className="w-5 h-5 text-gray-600" /></button>
      </div>

      <div className="px-4 pt-5 pb-2">
        {/* Profile info row */}
        <div className="flex items-start gap-4 mb-4">
          <div className="relative shrink-0">
            {profile.avatar ? (
            <img src={profile.avatar} alt={profile.name} className="w-20 h-20 rounded-full object-cover border-3 border-teal-400 ring-2 ring-teal-100" style={{ border: "3px solid #0d9488" }} />
            ) : (
            <div className="w-20 h-20 rounded-full border-3 border-teal-400 bg-gray-200 flex items-center justify-center" style={{ border: "3px solid #0d9488" }}><User className="w-8 h-8 text-gray-400" /></div>
            )}
            {profile.verified && (
              <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-teal-500 flex items-center justify-center border-2 border-white">
                <Check className="w-3 h-3 text-white" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-base font-bold text-gray-900">{profile.name}</h1>
              {profile.verified && <span className="text-teal-500 text-xs">✓</span>}
            </div>
            {/* Stats */}
            <div className="flex gap-4 mb-3">
              {[[profile.posts.toLocaleString(),"Posts"],[profile.followers,"Followers"],[profile.following,"Following"]].map(([v,l]) => (
                <div key={l} className="text-center">
                  <p className="text-sm font-bold text-gray-900">{v}</p>
                  <p className="text-[10px] text-gray-500">{l}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bio */}
        <div className="mb-4">
          <p className="text-xs text-gray-700 leading-relaxed">{profile.bio}</p>
          {profile.website && <a href="#" className="text-xs text-teal-600 font-semibold mt-0.5 block">🔗 {profile.website}</a>}
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 mb-5">
          {!profile.isSelf && (
          <button onClick={toggleFollow} disabled={followBusy}
            className={`flex-1 py-2 rounded-xl text-sm font-bold transition ${following ? "bg-gray-100 text-gray-800 hover:bg-gray-200" : "text-white hover:opacity-90"}`}
            style={following ? {} : { background: TEAL }}>
            {following ? "Following" : "Follow"}
          </button>
          )}
          <button className="flex-1 py-2 rounded-xl text-sm font-bold bg-gray-100 text-gray-800 hover:bg-gray-200 transition" disabled>Message</button>
        </div>

      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-100">
        {TABS.map(t => (
          <button key={t} onClick={() => setActiveTab(t)}
            className={`flex-1 py-3 text-xs font-semibold border-b-2 transition flex items-center justify-center gap-1.5 ${activeTab === t ? "text-teal-600 border-teal-500" : "text-gray-400 border-transparent hover:text-gray-600"}`}>
            {t === "Posts" && <Grid className="w-4 h-4" />}
            {t === "Reels" && <Play className="w-4 h-4" />}
            {t === "Tagged" && <Tag className="w-4 h-4" />}
            <span className="hidden sm:inline">{t}</span>
          </button>
        ))}
      </div>

      {/* Grid */}
      {profile.images.length === 0 ? (
        <div className="text-center py-16 text-gray-400 text-sm">No posts yet.</div>
      ) : (
      <div className="grid grid-cols-3 gap-0.5 p-0.5">
        {profile.images.map((img, i) => (
          <div key={i} className="relative aspect-square overflow-hidden cursor-pointer group" onClick={() => setSelectedImg(img)}>
            <img src={img} alt="" className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
          </div>
        ))}
      </div>
      )}
    </div>
  );
}

// ── HOME SECTION ──────────────────────────────────────────────────────────────
function HomeSection({ onUserClick }: { onUserClick: (userId: string) => void }) {
  const [stories, setStories] = useState<StoryItem[]>([{ id: "my", mine: true, label: "Your Story", avatar: null }]);
  const [posts, setPosts] = useState<PostItem[]>([]);
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
      const [feedRes, storyRes, suggestionsRes] = await Promise.allSettled([
        socialApi.getFeed({ limit: 20 }),
        socialApi.getStoryFeed(),
        socialApi.getSuggestions(),
      ]);
      if (feedRes.status === "fulfilled") {
        setPosts(feedRes.value.data.map(mapApiPostToPostItem));
      }
      if (storyRes.status === "fulfilled") {
        setStories([{ id: "my", mine: true, label: "Your Story", avatar: null }, ...storyRes.value.map(mapApiStoryToStoryItem)]);
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

  return (
    <div className="w-full px-3 sm:px-4 py-4 flex gap-6 items-start bg-gray-50 min-h-screen">
      {storyView.open && storyView.story && <StoryViewer story={storyView.story} onClose={() => setStoryView({ open: false, story: null })} />}
      {showCreateStory && <CreateStoryModal onClose={() => setShowCreateStory(false)} onCreated={loadFeed} />}

      <div className="flex-1 min-w-0 w-full max-w-[600px] mx-auto xl:mx-0">
        {/* Stories */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-4 py-4 mb-5">
          <p className="text-xs font-semibold tracking-widest uppercase text-gray-400 mb-3">Stories</p>
          <div className="flex gap-3 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
            {stories.map(s => (
              <StoryCircle key={s.id} story={s}
                onClick={() => s.mine ? setShowCreateStory(true) : setStoryView({ open: true, story: s })} />
            ))}
          </div>
        </div>
        {loadingFeed && posts.length === 0 && (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 text-teal-500 animate-spin" /></div>
        )}
        {!loadingFeed && posts.length === 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center mb-4">
            <p className="text-sm text-gray-400">No posts yet. Follow people to see their posts here.</p>
          </div>
        )}
        {posts.map(post => <PostCard key={post.id} post={post} onUserClick={onUserClick} />)}
      </div>

      {/* Sidebar */}
      <aside className="hidden xl:block w-64 shrink-0 space-y-4 self-start sticky top-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <p className="text-xs font-semibold tracking-widest uppercase text-gray-400 mb-3">Search</p>
          <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 mb-4">
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search" className="flex-1 text-xs bg-transparent outline-none text-gray-700" />
            <Search className="w-3.5 h-3.5 text-gray-400 shrink-0" />
          </div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-gray-700">Recent</span>
            <button onClick={() => setSearches([])} className="text-[11px] text-teal-500 hover:underline">Clear all</button>
          </div>
          <div className="space-y-2.5">
            {filtered.map(r => (
              <div key={r.id} className="flex items-center gap-2.5">
                <button onClick={() => onUserClick(r.name)}>
                  <img src={r.avatar} alt={r.name} className="w-9 h-9 rounded-full object-cover shrink-0 hover:ring-2 ring-teal-400 transition" />
                </button>
                <div className="flex-1 min-w-0">
                  <button onClick={() => onUserClick(r.name)} className="text-xs font-semibold text-gray-800 flex items-center gap-1 hover:text-teal-600 transition">
                    {r.name}{r.verified && <span className="text-teal-500 text-[10px]">✓</span>}
                  </button>
                  {r.sub && <p className="text-[10px] text-gray-400 truncate">{r.sub}</p>}
                </div>
                <button onClick={() => setSearches(p => p.filter(x => x.id !== r.id))}><X className="w-3.5 h-3.5 text-gray-400 hover:text-gray-700" /></button>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-gray-700">Suggestions for you</span>
            <button className="text-[11px] text-teal-500 hover:underline">See All</button>
          </div>
          <div className="space-y-3">
            {suggestions.map(s => (
              <div key={s.id} className="flex items-center gap-2.5">
                <button onClick={() => onUserClick(s.userId)}>
                  {s.avatar ? (
                  <img src={s.avatar} alt={s.name} className="w-9 h-9 rounded-full object-cover shrink-0 hover:ring-2 ring-teal-400 transition" />
                  ) : (
                  <div className="w-9 h-9 rounded-full bg-gray-200 shrink-0 hover:ring-2 ring-teal-400 flex items-center justify-center text-[10px] text-gray-500 font-bold">?</div>
                  )}
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
  );
}

// ── EXPLORE SECTION ───────────────────────────────────────────────────────────

function ExploreSection({ onUserClick }: { onUserClick: (userId: string) => void }) {
  const [tab, setTab] = useState("Top");
  const [hover, setHover] = useState<number | string | null>(null);
  const [search, setSearch] = useState("");
  const [explorePosts, setExplorePosts] = useState<ExplorePostItem[]>([]);
  const [people, setPeople] = useState<{ userId: string; username: string; name: string; avatar: string; posts: number }[]>([]);
  const [followedIds, setFollowedIds] = useState<Record<string, boolean>>({});
  const [tags, setTags] = useState<{ tag: string; postCount: number }[]>([]);
  const [places, setPlaces] = useState<{ place: string; postCount: number }[]>([]);
  const [loadingExplore, setLoadingExplore] = useState(true);

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
            const raw = p.imageUrl ?? "";
            const image = raw.trim() ? resolveMediaUrl(raw.trim()) || raw : "";
            return {
              id: p.id ?? i + 1,
              image,
              likes: p.likeCount,
              comments: p.commentCount,
            };
          }));
        }
        if (sugRes.status === "fulfilled" && Array.isArray(sugRes.value)) {
          setPeople(
            sugRes.value.map((u) => {
              const uid = String(u.userId ?? u.id ?? "");
              const avatarRaw = u.avatar ?? "";
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
    <div className="max-w-3xl mx-auto px-3 sm:px-4 py-6">
      <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-2xl px-4 py-3 shadow-sm mb-5">
        <Search className="w-4 h-4 text-gray-400 shrink-0" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search people, tags, places…" className="flex-1 text-sm bg-transparent outline-none text-gray-700 placeholder-gray-400" />
        {search && <button onClick={() => setSearch("")}><X className="w-4 h-4 text-gray-400" /></button>}
      </div>
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6">
        {["Top","People","Tags","Places"].map(t => (
          <button key={t} onClick={() => setTab(t)} className={`flex-1 text-xs font-semibold py-2 px-2 rounded-lg transition-all ${tab === t ? "bg-white text-teal-600 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>{t}</button>
        ))}
      </div>
      {tab === "People" ? (
        people.length === 0 ? <div className="text-center py-12 text-gray-400 text-sm">No suggestions available.</div> :
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
          {        people.map((p) => (
            <div key={p.userId} className="bg-white rounded-2xl p-4 flex flex-col items-center gap-2 border border-gray-100 shadow-sm hover:shadow-md transition cursor-pointer" onClick={() => onUserClick(p.userId)}>
              {p.avatar ? (
              <img src={p.avatar} alt={p.name} className="w-16 h-16 rounded-full object-cover border-2 border-teal-300" />
              ) : (
              <div className="w-16 h-16 rounded-full border-2 border-teal-300 bg-gray-200 flex items-center justify-center text-xs text-gray-500 font-bold">?</div>
              )}
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
                  <span className="text-lg">📍</span>
                </div>
              ))}
          </div>
        )
      ) : (
        <>
        {loadingExplore && explorePosts.length === 0 && <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 text-teal-500 animate-spin" /></div>}
        {!loadingExplore && explorePosts.length === 0 && <div className="text-center py-12 text-gray-400 text-sm">No posts to explore yet.</div>}
        <div className="columns-2 sm:columns-3 gap-2 space-y-2">
          {explorePosts.map(post => (
            <div key={post.id} className="relative overflow-hidden rounded-xl cursor-pointer group break-inside-avoid"
              onMouseEnter={() => setHover(post.id)} onMouseLeave={() => setHover(null)}>
              {post.image ? (
              <img src={post.image} alt="" className="w-full aspect-square object-cover transition-transform duration-300 group-hover:scale-105" />
              ) : (
              <div className="w-full aspect-square bg-gray-200 flex items-center justify-center text-[10px] text-gray-500">No image</div>
              )}
              {hover === post.id && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center gap-4">
                  <div className="flex items-center gap-1 text-white"><Heart className="w-5 h-5 fill-white" /><span className="text-sm font-bold">{post.likes.toLocaleString()}</span></div>
                  <div className="flex items-center gap-1 text-white"><MessageCircle className="w-5 h-5 fill-white" /><span className="text-sm font-bold">{post.comments}</span></div>
                </div>
              )}
            </div>
          ))}
        </div>
        </>
      )}
    </div>
  );
}

// ── REELS SECTION ─────────────────────────────────────────────────────────────

// Single reel card with its own video ref + intersection observer
function ReelCard({ reel, globalMuted, onMuteToggle, onUserClick }: { reel: ReelItem; globalMuted: boolean; onMuteToggle: () => void; onUserClick: (userId: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [playing, setPlaying]   = useState(false);
  const [liked, setLiked]       = useState(reel.isLiked ?? false);
  const [saved, setSaved]       = useState(false);
  const [followed, setFollowed] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showComment, setShowComment] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [comments, setComments] = useState<string[]>([]);
  const [doubleTapHeart, setDoubleTapHeart] = useState(false);
  const lastTap = useRef(0);

  // Auto-play when ≥60% visible
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        const vid = videoRef.current;
        if (!vid) return;
        if (entry.intersectionRatio >= 0.6) {
          vid.play().then(() => setPlaying(true)).catch(() => {});
        } else {
          vid.pause();
          setPlaying(false);
        }
      },
      { threshold: [0, 0.6, 1] }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Sync muted state
  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = globalMuted;
  }, [globalMuted]);

  const togglePlay = () => {
    const vid = videoRef.current;
    if (!vid) return;
    if (vid.paused) { vid.play(); setPlaying(true); }
    else            { vid.pause(); setPlaying(false); }
  };

  const handleTap = () => {
    const now = Date.now();
    if (now - lastTap.current < 300) {
      setLiked(true);
      socialApi.likePost(reel.postId).catch(() => {});
      setDoubleTapHeart(true);
      setTimeout(() => setDoubleTapHeart(false), 900);
    } else {
      togglePlay();
    }
    lastTap.current = now;
  };

  const handleTimeUpdate = () => {
    const vid = videoRef.current;
    if (vid && vid.duration) {
      setProgress((vid.currentTime / vid.duration) * 100);
      setDuration(vid.duration);
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const vid = videoRef.current;
    if (!vid || !vid.duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct  = (e.clientX - rect.left) / rect.width;
    vid.currentTime = pct * vid.duration;
  };

  const fmt = (s: number) => `${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,"0")}`;

  return (
    <div
      ref={containerRef}
      className="relative bg-black overflow-hidden"
      style={{ aspectRatio: "9/16", maxHeight: "92vh", borderRadius: "1.25rem" }}
    >
      {/* VIDEO */}
      <video
        ref={videoRef}
        src={reel.video}
        className="w-full h-full object-cover"
        loop
        playsInline
        muted={globalMuted}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleTimeUpdate}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
      />

      {/* tap overlay */}
      <div className="absolute inset-0" onClick={handleTap} />

      {/* double-tap heart burst */}
      {doubleTapHeart && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <Heart className="w-24 h-24 fill-white text-white opacity-90 animate-ping" style={{ animationIterationCount: 1, animationDuration: "0.6s" }} />
        </div>
      )}

      {/* gradient */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent pointer-events-none" />

      {/* pause indicator */}
      {!playing && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-14 h-14 rounded-full bg-black/40 flex items-center justify-center">
            <Play className="w-7 h-7 text-white fill-white ml-1" />
          </div>
        </div>
      )}

      {/* TOP ROW: mute + more */}
      <div className="absolute top-4 left-0 right-0 flex items-center justify-between px-4 pointer-events-none">
        <span className="text-white/70 text-xs font-semibold bg-black/30 rounded-full px-2.5 py-1">Reels</span>
        <div className="flex items-center gap-2 pointer-events-auto">
          <button
            onClick={(e) => { e.stopPropagation(); onMuteToggle(); }}
            className="w-9 h-9 rounded-full bg-black/40 flex items-center justify-center backdrop-blur-sm"
          >
            {globalMuted ? <VolumeX className="w-4 h-4 text-white" /> : <Volume2 className="w-4 h-4 text-white" />}
          </button>
          <button
            onClick={(e) => e.stopPropagation()}
            className="w-9 h-9 rounded-full bg-black/40 flex items-center justify-center backdrop-blur-sm"
          >
            <MoreHorizontal className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>

      {/* RIGHT SIDE ACTIONS */}
      <div className="absolute right-3 bottom-28 flex flex-col items-center gap-5 pointer-events-auto">
        {/* Avatar */}
        <div className="relative">
          <button onClick={(e) => { e.stopPropagation(); reel.userId && onUserClick(reel.userId); }}>
            {reel.avatar ? (
            <img src={reel.avatar} alt={reel.username} className="w-10 h-10 rounded-full border-2 border-white object-cover" />
            ) : (
            <div className="w-10 h-10 rounded-full border-2 border-white bg-gray-600 flex items-center justify-center text-[10px] text-white font-bold">?</div>
            )}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (!reel.userId) return;
              const next = !followed;
              setFollowed(next);
              (next ? socialApi.followUser(reel.userId) : socialApi.unfollowUser(reel.userId)).catch(() => setFollowed(!next));
            }}
            className={`absolute -bottom-2 left-1/2 -translate-x-1/2 w-5 h-5 rounded-full flex items-center justify-center text-xs font-black border-2 border-black transition ${followed ? "bg-gray-400 text-white" : "text-white"}`}
            style={followed ? {} : { background: "#0d9488" }}
          >+</button>
        </div>

        {/* Like */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            const next = !liked;
            setLiked(next);
            (next ? socialApi.likePost(reel.postId) : socialApi.unlikePost(reel.postId)).catch(() => setLiked(!next));
          }}
          className="flex flex-col items-center gap-0.5"
        >
          <div className={`w-10 h-10 rounded-full flex items-center justify-center transition ${liked ? "bg-red-500/20" : "bg-black/30"} backdrop-blur-sm`}>
            <Heart className={`w-5 h-5 transition-all ${liked ? "fill-red-500 text-red-500 scale-110" : "text-white"}`} />
          </div>
          <span className="text-[10px] text-white font-semibold drop-shadow">
            {((liked ? reel.likes + 1 : reel.likes) / 1000).toFixed(1)}K
          </span>
        </button>

        {/* Comment */}
        <button
          onClick={(e) => { e.stopPropagation(); setShowComment(v => !v); }}
          className="flex flex-col items-center gap-0.5"
        >
          <div className="w-10 h-10 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center">
            <MessageCircle className="w-5 h-5 text-white" />
          </div>
          <span className="text-[10px] text-white font-semibold drop-shadow">{reel.comments + comments.length}</span>
        </button>

        {/* Share */}
        <button onClick={(e) => e.stopPropagation()} className="flex flex-col items-center gap-0.5">
          <div className="w-10 h-10 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center">
            <Send className="w-5 h-5 text-white" />
          </div>
          <span className="text-[10px] text-white font-semibold drop-shadow">{reel.shares}</span>
        </button>

        {/* Save */}
        <button
          onClick={(e) => { e.stopPropagation(); setSaved(v => !v); }}
          className="flex flex-col items-center gap-0.5"
        >
          <div className={`w-10 h-10 rounded-full flex items-center justify-center backdrop-blur-sm transition ${saved ? "bg-teal-500/30" : "bg-black/30"}`}>
            <Bookmark className={`w-5 h-5 transition ${saved ? "fill-teal-400 text-teal-400" : "text-white"}`} />
          </div>
        </button>
      </div>

      {/* BOTTOM: user info + caption */}
      <div className="absolute bottom-0 left-0 right-16 px-4 pb-14 pointer-events-auto">
        <div className="flex items-center gap-2 mb-1.5">
          <button onClick={(e) => { e.stopPropagation(); reel.userId && onUserClick(reel.userId); }}
            className="text-sm font-bold text-white hover:underline">{reel.username}</button>
          <button
            onClick={(e) => { e.stopPropagation(); setFollowed(v => !v); }}
            className={`text-[11px] font-bold border rounded-full px-2.5 py-0.5 transition ${followed ? "bg-white text-gray-800 border-white" : "border-white/70 text-white hover:bg-white/20"}`}>
            {followed ? "Following" : "Follow"}
          </button>
        </div>
        <p className="text-xs text-white/90 leading-relaxed line-clamp-2">{reel.caption}</p>

        {/* Scrolling music tag */}
        <div className="flex items-center gap-2 mt-2 overflow-hidden">
          <div className="w-4 h-4 rounded-full flex items-center justify-center shrink-0" style={{ background: TEAL }}>
            <span className="text-[8px] text-white">♪</span>
          </div>
          <div className="overflow-hidden flex-1">
            <p className="text-[10px] text-white/70 whitespace-nowrap" style={{ animation: "marquee 8s linear infinite" }}>
              Original Audio · {reel.username} · Trending · P4U Music
            </p>
          </div>
        </div>
      </div>

      {/* PROGRESS BAR */}
      <div
        className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/20 cursor-pointer pointer-events-auto"
        onClick={(e) => { e.stopPropagation(); handleSeek(e); }}
      >
        <div className="h-full bg-white transition-all" style={{ width: `${progress}%` }} />
        {/* draggable thumb */}
        <div className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white shadow-md -translate-x-1/2"
          style={{ left: `${progress}%`, transition: "left 0.1s" }} />
      </div>

      {/* time */}
      <div className="absolute bottom-2 left-4 text-[9px] text-white/50 font-mono pointer-events-none">
        {videoRef.current ? fmt(videoRef.current.currentTime) : "0:00"} / {fmt(duration)}
      </div>

      {/* COMMENT SHEET */}
      {showComment && (
        <div
          className="absolute inset-0 flex flex-col justify-end"
          style={{ background: "linear-gradient(to top, rgba(0,0,0,0.85) 50%, transparent)" }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-4 pt-4 pb-3 max-h-64 overflow-y-auto space-y-2">
            <div className="flex items-center justify-between mb-2">
              <span className="text-white text-sm font-bold">Comments</span>
              <button onClick={() => setShowComment(false)}><X className="w-4 h-4 text-white/70" /></button>
            </div>
            {comments.length === 0 && (
              <p className="text-white/40 text-xs text-center py-4">No comments yet. Be first!</p>
            )}
            {comments.map((c, i) => (
              <div key={i} className="flex items-start gap-2">
                <div className="w-6 h-6 rounded-full bg-teal-500 flex items-center justify-center shrink-0 text-[10px] font-bold text-white">Y</div>
                <p className="text-white text-xs leading-snug">{c}</p>
              </div>
            ))}
          </div>
          <div className="flex gap-2 px-4 pb-4">
            <input
              value={commentText}
              onChange={e => setCommentText(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && commentText.trim()) { setComments(p => [...p, commentText.trim()]); setCommentText(""); }}}
              placeholder="Add a comment…"
              className="flex-1 text-xs bg-white/10 backdrop-blur border border-white/20 rounded-full px-3 py-2 text-white placeholder-white/40 outline-none focus:border-teal-400 transition"
            />
            {commentText.trim() && (
              <button
                onClick={() => { setComments(p => [...p, commentText.trim()]); setCommentText(""); }}
                className="text-xs font-bold text-teal-400 px-2"
              >Post</button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ReelsSection({ onUserClick }: { onUserClick: (userId: string) => void }) {
  const [globalMuted, setGlobalMuted] = useState(true);
  const [reels, setReels] = useState<ReelItem[]>([]);
  const [loadingReels, setLoadingReels] = useState(true);

  useEffect(() => {
    let cancelled = false;
    socialApi.getPublicFeed({ limit: 50 })
      .then((res) => {
        if (cancelled) return;
        const videoPosts = res.data.filter(isVideoPost);
        setReels(videoPosts.map((p, i) => {
          const videoRaw = p.mediaUrls?.find((u) => /\.(mp4|webm|mov|m4v)/i.test(u)) ?? p.imageUrl ?? "";
          const video = videoRaw.trim() ? resolveMediaUrl(videoRaw.trim()) || videoRaw : "";
          const avatarRaw = p.userAvatar ?? "";
          const avatar = avatarRaw.trim() ? resolveMediaUrl(avatarRaw.trim()) || avatarRaw : "";
          return {
            id: p.id ?? i,
            postId: p.id,
            userId: String(p.userId ?? ""),
            username: p.userName ?? "user",
            user: p.userName ?? "user",
            caption: p.content ?? "",
            video,
            likes: p.likeCount,
            comments: p.commentCount,
            shares: p.shareCount ?? 0,
            avatar,
            isLiked: p.isLiked,
          };
        }));
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoadingReels(false); });
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="bg-black min-h-screen">
      <style>{`
        @keyframes marquee {
          0%   { transform: translateX(100%); }
          100% { transform: translateX(-100%); }
        }
      `}</style>

      {loadingReels && reels.length === 0 && (
        <div className="flex flex-col items-center justify-center h-[60vh] text-white/50">
          <Loader2 className="w-10 h-10 mb-3 animate-spin text-teal-400" />
          <p className="text-sm">Loading reels…</p>
        </div>
      )}
      {!loadingReels && reels.length === 0 && (
        <div className="flex flex-col items-center justify-center h-[60vh] text-white/50">
          <Film className="w-12 h-12 mb-3" />
          <p className="text-sm">No video posts yet. Share a video from Create to see it here.</p>
        </div>
      )}

      {/* Header */}
      <div className="sticky top-0 z-20 flex items-center justify-between px-4 py-3 bg-gradient-to-b from-black/80 to-transparent pointer-events-none">
        <span className="text-white text-base font-black tracking-tight pointer-events-auto">Reels</span>
        <div className="flex items-center gap-3 pointer-events-auto">
          <button className="text-white/80 hover:text-white transition">
            <Camera className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Reel feed — snapping scroll */}
      <div
        className="overflow-y-scroll"
        style={{
          height: "100dvh",
          scrollSnapType: "y mandatory",
          scrollbarWidth: "none",
          marginTop: "-52px",   /* pull up under header */
        }}
      >
        {reels.map((reel) => (
          <div
            key={reel.id}
            style={{ scrollSnapAlign: "start", height: "100dvh" }}
            className="flex items-center justify-center bg-black px-0 sm:px-6 md:px-16 lg:px-32"
          >
            <div className="w-full h-full sm:h-auto sm:max-w-sm sm:rounded-2xl overflow-hidden">
              <ReelCard
                reel={reel}
                globalMuted={globalMuted}
                onMuteToggle={() => setGlobalMuted(v => !v)}
                onUserClick={onUserClick}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── MESSAGES SECTION ──────────────────────────────────────────────────────────
function MessagesSection({ onUserClick }: { onUserClick: (username: string) => void }) {
  const [contacts] = useState<ContactItem[]>([]);
  const [active, setActive] = useState<number | null>(null);
  const [tab, setTab] = useState("PRIMARY");
  const [msgText, setMsgText] = useState("");
  const [showChat, setShowChat] = useState(false);
  const [messages, setMessages] = useState<{ id: number; sender: string; text?: string; image?: string }[]>([]);
  const contact = contacts.find(c => c.id === active);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const sendMsg = () => {
    if (!msgText.trim()) return;
    setMessages(p => [...p, { id: Date.now(), sender: "me", text: msgText.trim() }]);
    setMsgText("");
  };

  return (
    <div className="flex bg-gray-50" style={{ height: "calc(100vh - 120px)", minHeight: "400px" }}>
      {/* Contact list */}
      <div className={`w-full sm:w-72 bg-white border-r border-gray-100 flex flex-col shrink-0 ${showChat ? "hidden sm:flex" : "flex"}`}>
        <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-1">
            <span className="text-sm font-bold text-gray-800">Messages</span>
          </div>
          <button className="p-1 hover:bg-gray-100 rounded-lg"><Edit3 className="w-4 h-4 text-gray-500" /></button>
        </div>
        <div className="flex border-b border-gray-100 shrink-0">
          {["PRIMARY","GENERAL"].map(t => (
            <button key={t} onClick={() => setTab(t)} className={`flex-1 py-3 text-xs font-bold tracking-wide transition-all ${tab === t ? "text-teal-600 border-b-2 border-teal-500" : "text-gray-400"}`}>{t}</button>
          ))}
        </div>
        <div className="flex-1 overflow-y-auto">
          {contacts.map(c => (
            <button key={c.id} onClick={() => { setActive(c.id); setShowChat(true); }}
              className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition text-left ${active === c.id ? "bg-teal-50" : ""}`}>
              <div className="relative shrink-0">
                <img src={c.avatar} alt={c.name} className="w-10 h-10 rounded-full object-cover" />
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-400 border-2 border-white rounded-full" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800 truncate">{c.name}</p>
                <p className="text-xs text-gray-400 truncate">{c.lastMsg}</p>
              </div>
              {c.unread && <span className="w-2 h-2 bg-teal-500 rounded-full shrink-0" />}
            </button>
          ))}
        </div>
      </div>

      {/* Chat area */}
      <div className={`flex-1 flex flex-col bg-white min-w-0 ${!showChat ? "hidden sm:flex" : "flex"}`}>
        {contact ? (
          <>
            <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 shrink-0">
              <button onClick={() => setShowChat(false)} className="sm:hidden mr-1 p-1"><ArrowLeft className="w-5 h-5 text-gray-500" /></button>
              <button onClick={() => onUserClick(contact.name.toLowerCase().replace(" ","_"))}>
                <img src={contact.avatar} alt={contact.name} className="w-9 h-9 rounded-full object-cover hover:ring-2 ring-teal-400 transition" />
              </button>
              <div className="flex-1">
                <button onClick={() => onUserClick(contact.name.toLowerCase().replace(" ","_"))} className="text-sm font-bold text-gray-900 hover:text-teal-600 transition text-left">{contact.name}</button>
                <p className="text-[11px] text-green-500">Active {contact.time} ago</p>
              </div>
              <div className="flex items-center gap-1">
                {[Phone, Video, Info].map((Icon, i) => <button key={i} className="p-1.5 hover:bg-gray-100 rounded-lg transition"><Icon className="w-4 h-4 text-gray-600" /></button>)}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
              {messages.map(m => (
                <div key={m.id} className={`flex ${m.sender === "me" ? "justify-end" : "justify-start"} gap-2`}>
                  {m.sender === "them" && <img src={contact.avatar} alt="" className="w-8 h-8 rounded-full object-cover shrink-0 self-end" />}
                  <div className="max-w-[70%]">
                    {m.image && <img src={m.image} alt="shared" className="rounded-2xl w-full object-cover max-w-xs mb-1" />}
                    {m.text && <div className={`rounded-2xl px-3.5 py-2.5 text-xs ${m.sender === "me" ? "text-white" : "bg-gray-100 text-gray-800"}`} style={m.sender === "me" ? { background: TEAL } : {}}>{m.text}</div>}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
            <div className="px-4 py-3 border-t border-gray-100 flex items-center gap-2 sm:gap-3 shrink-0">
              <button><Smile className="w-5 h-5 text-gray-400 hover:text-gray-700" /></button>
              <input value={msgText} onChange={e => setMsgText(e.target.value)}
                onKeyDown={e => e.key === "Enter" && sendMsg()}
                placeholder="Message…"
                className="flex-1 text-sm bg-gray-50 border border-gray-200 rounded-full px-4 py-2 outline-none focus:border-teal-400 transition" />
              {msgText.trim()
                ? <button onClick={sendMsg} className="text-teal-500 font-bold text-sm hover:text-teal-700 whitespace-nowrap">Send</button>
                : <>
                    <button><ImageIcon className="w-5 h-5 text-gray-400 hover:text-gray-700" /></button>
                    <button><Heart className="w-5 h-5 text-gray-400 hover:text-red-400 transition" /></button>
                  </>}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400 text-sm px-6 text-center">
            <MessageCircle className="w-12 h-12 text-gray-300 mb-3" />
            <p className="font-medium text-gray-600 mb-1">Direct messages are not available yet</p>
            <p className="text-xs text-gray-400">You can still like, comment, and follow people from posts and notifications.</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── NOTIFICATIONS SECTION ─────────────────────────────────────────────────────
function NotificationsSection({ onUserClick }: { onUserClick: (userId: string) => void }) {
  const [notifs, setNotifs] = useState<NotificationItem[]>([]);
  const [followed, setFollowed] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const dismiss = (id: string | number) => setNotifs(p => p.filter(n => n.id !== id));

  useEffect(() => {
    let cancelled = false;
    socialApi.getNotifications({ limit: 40 })
      .then((rows) => {
        if (cancelled) return;
        setNotifs(rows.map((n) => ({
          id: n.id,
          userId: n.actorId,
          group: notificationGroup(n.createdAt),
          user: n.actorName,
          text: n.text,
          time: formatRelativeTime(n.createdAt),
          avatar: n.actorAvatar ? resolveMediaUrl(n.actorAvatar) || n.actorAvatar : "",
          action: n.type === "follow" ? "Follow" : "",
        })));
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const toggleFollowNotif = async (n: NotificationItem) => {
    const already = followed[String(n.id)];
    const next = !already;
    setFollowed((p) => ({ ...p, [String(n.id)]: next }));
    try {
      if (next) await socialApi.followUser(n.userId);
      else await socialApi.unfollowUser(n.userId);
    } catch {
      setFollowed((p) => ({ ...p, [String(n.id)]: !next }));
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-3 sm:px-4 py-6">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-lg font-semibold text-gray-900">Notifications</h1>
        <button onClick={() => setNotifs([])} className="text-xs text-gray-400 hover:text-gray-700 border border-gray-200 rounded-lg px-3 py-1.5 transition">Clear all</button>
      </div>
      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-7 h-7 text-teal-500 animate-spin" /></div>
      ) : notifs.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center text-gray-400 shadow-sm border border-gray-100">
          <Bell className="w-10 h-10 mx-auto mb-3 text-gray-300" />
          <p className="text-sm">No notifications yet</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {["Yesterday","This Week","Earlier"].map(group => {
            const items = notifs.filter(n => n.group === group);
            if (!items.length) return null;
            return (
              <div key={group}>
                <div className="px-4 pt-4 pb-2"><span className="text-xs font-semibold tracking-widest uppercase text-gray-400">{group}</span></div>
                {items.map((n, idx) => (
                  <div key={n.id} className={`flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition ${idx < items.length - 1 ? "border-b border-gray-50" : ""}`}>
                    <button onClick={() => onUserClick(n.userId)}>
                      {n.avatar ? (
                      <img src={n.avatar} alt={n.user} className="w-10 h-10 rounded-full object-cover shrink-0 mt-0.5 hover:ring-2 ring-teal-400 transition" />
                      ) : (
                      <div className="w-10 h-10 rounded-full bg-gray-200 shrink-0 mt-0.5 flex items-center justify-center"><User className="w-4 h-4 text-gray-500" /></div>
                      )}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-800 leading-snug">
                        <button onClick={() => onUserClick(n.userId)} className="font-semibold hover:text-teal-600 transition">{n.user}</button>
                        {" "}<span className="text-gray-500">{n.text}</span>
                      </p>
                      <p className="text-[10px] text-gray-400 mt-0.5">{n.time}</p>
                    </div>
                    {n.action === "Follow" ? (
                      <button onClick={() => toggleFollowNotif(n)}
                        className={`shrink-0 text-xs font-bold px-3 py-1.5 rounded-xl transition ${followed[String(n.id)] ? "bg-gray-100 text-gray-700" : "text-white hover:opacity-90"}`}
                        style={!followed[String(n.id)] ? { background: TEAL } : {}}>
                        {followed[String(n.id)] ? "Following" : "Follow"}
                      </button>
                    ) : (
                      <button onClick={() => dismiss(n.id)} className="shrink-0 p-1 hover:bg-gray-100 rounded-full"><X className="w-3.5 h-3.5 text-gray-400" /></button>
                    )}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── CREATE SECTION ────────────────────────────────────────────────────────────
function CreateSection({ onPosted }: { onPosted?: () => void } = {}) {
  const [step, setStep] = useState("upload");
  const [preview, setPreview] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [filter, setFilter] = useState("Normal");
  const [caption, setCaption] = useState("");
  const [location, setLocation] = useState("");
  const [tags, setTags] = useState("");
  const [shared, setShared] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) { setPreview(URL.createObjectURL(f)); setPendingFile(f); setStep("edit"); setError(null); }
  };
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) { setPreview(URL.createObjectURL(f)); setPendingFile(f); setStep("edit"); setError(null); }
  };
  const reset = () => {
    setStep("upload"); setPreview(null); setPendingFile(null); setFilter("Normal");
    setCaption(""); setLocation(""); setTags(""); setShared(false); setError(null);
  };

  const handleShare = async () => {
    if (!pendingFile || submitting) return;
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
        visibility: "public",
        location: location.trim() || undefined,
        tags: tagList.length ? tagList : undefined,
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
      <p className="text-sm text-gray-500 text-center">Your post has been shared to your followers.</p>
      <button onClick={reset} className="text-white font-bold px-6 py-2.5 rounded-xl shadow" style={{ background: TEAL }}>Create another</button>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto px-3 sm:px-4 py-6 sm:py-8">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          {step !== "upload"
            ? <button onClick={() => step === "details" ? setStep("edit") : reset()}><ChevronLeft className="w-5 h-5 text-gray-500" /></button>
            : <div />}
          <h2 className="text-sm font-semibold text-gray-900">{step === "upload" ? "Create new post" : step === "edit" ? "Edit" : "New post"}</h2>
          {step === "edit"
            ? <button onClick={() => setStep("details")} className="text-xs font-bold text-teal-500 hover:text-teal-700">Next</button>
            : step === "details"
            ? <button onClick={handleShare} disabled={submitting} className="text-xs font-bold text-teal-500 hover:text-teal-700 disabled:opacity-50">{submitting ? "Sharing…" : "Share"}</button>
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
              <img src={preview} alt="preview" className="w-full aspect-square object-cover" style={{ filter: FILTER_CSS[filter] }} />
            </div>
            <div className="sm:w-52 p-4 bg-gray-50">
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">Filters</p>
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
            </div>
          </div>
        )}
        {step === "details" && preview && (
          <div className="flex flex-col sm:flex-row">
            <div className="sm:w-64 bg-black shrink-0">
              <img src={preview} alt="preview" className="w-full aspect-square object-cover" style={{ filter: FILTER_CSS[filter] }} />
            </div>
            <div className="flex-1 p-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center shrink-0"><User className="w-4 h-4 text-gray-500" /></div>
                <span className="text-sm font-bold text-gray-800">You</span>
              </div>
              <textarea value={caption} onChange={e => setCaption(e.target.value)} placeholder="Write a caption…" rows={4}
                className="w-full text-sm text-gray-700 bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-200 outline-none focus:border-teal-400 resize-none" />
              <input value={location} onChange={e => setLocation(e.target.value)} placeholder="📍 Add location"
                className="w-full text-sm text-gray-700 bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-200 outline-none focus:border-teal-400" />
              <input value={tags} onChange={e => setTags(e.target.value)} placeholder="🏷 Tag people (@username)"
                className="w-full text-sm text-gray-700 bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-200 outline-none focus:border-teal-400" />
              {["Accessibility","Advanced settings"].map(s => (
                <div key={s} className="flex items-center justify-between py-2 border-b border-gray-100 cursor-pointer hover:bg-gray-50 rounded-lg px-1 transition">
                  <span className="text-sm text-gray-700">{s}</span><ChevronRight className="w-4 h-4 text-gray-400" />
                </div>
              ))}
              {error && <p className="text-xs text-red-600">{error}</p>}
              <button onClick={handleShare} disabled={submitting} className="w-full text-white text-sm font-bold py-3 rounded-xl shadow transition hover:opacity-90 disabled:opacity-60" style={{ background: TEAL }}>{submitting ? "Sharing…" : "Share"}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── MY PROFILE SECTION ────────────────────────────────────────────────────────
const PROFILE_TABS_LIST = ["Posts","Reels","Tagged","Saved"];

function MyProfileSection() {
  const [activeTab, setActiveTab] = useState("Posts");
  const [selectedImg, setSelectedImg] = useState<string | null>(null);
  const [profile, setProfile] = useState<SocioUserProfile | null>(null);
  const [gridImages, setGridImages] = useState<string[]>([]);
  const [savedImages, setSavedImages] = useState<string[]>([]);
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
        const toUrl = (p: { imageUrl?: string }) => {
          const u = p.imageUrl ?? "";
          return u.trim() ? resolveMediaUrl(u.trim()) || u : "";
        };
        setGridImages(userPosts.data.map(toUrl).filter(Boolean));
        setSavedImages(savedPosts.data.map(toUrl).filter(Boolean));
      })
      .catch(() => { if (!cancelled) setError("Could not load your profile."); })
      .finally(() => { if (!cancelled) setLoadingProfile(false); });
    return () => { cancelled = true; };
  }, []);

  const displayImages = activeTab === "Saved" ? savedImages : gridImages;
  const avatar = profile?.userAvatar ? resolveMediaUrl(profile.userAvatar) || profile.userAvatar : null;

  return (
    <div className="max-w-3xl mx-auto px-3 sm:px-4 py-6">
      {selectedImg && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center px-4" onClick={() => setSelectedImg(null)}>
          <img src={selectedImg} alt="" className="max-w-lg w-full max-h-[80vh] rounded-2xl object-cover" />
          <button className="absolute top-4 right-4 bg-white/20 rounded-full p-2"><X className="w-5 h-5 text-white" /></button>
        </div>
      )}
      <div className="flex flex-col sm:flex-row sm:items-start gap-5 mb-6">
        <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden border-2 border-teal-400 shrink-0 bg-gray-100 flex items-center justify-center">
          {avatar ? (
          <img src={avatar} alt={profile?.userName ?? "Profile"} className="w-full h-full object-cover" />
          ) : (
          <User className="w-10 h-10 text-gray-400" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-semibold text-gray-900 mb-2">{profile?.userName ?? "Your profile"}</h1>
          <div className="flex gap-5 mb-3">
            {[
              [profile?.postCount?.toLocaleString() ?? "0", "Posts"],
              [profile?.followerCount?.toLocaleString() ?? "0", "Followers"],
              [profile?.followingCount?.toLocaleString() ?? "0", "Following"],
            ].map(([v, l]) => (
              <div key={l}><p className="text-sm font-semibold text-gray-900">{v}</p><p className="text-[11px] text-gray-500">{l}</p></div>
            ))}
          </div>
          {profile?.bio && <p className="text-xs text-gray-600 mb-3 leading-relaxed">{profile.bio}</p>}
          {error && <p className="text-xs text-red-500 mb-2">{error}</p>}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-100 mb-1">
        {PROFILE_TABS_LIST.map(t => (
          <button key={t} onClick={() => setActiveTab(t)}
            className={`flex-1 py-3 text-xs font-semibold border-b-2 transition-all flex items-center justify-center gap-1 ${activeTab === t ? "text-teal-600 border-teal-500" : "text-gray-400 border-transparent hover:text-gray-600"}`}>
            {t === "Posts" && <Grid className="w-3.5 h-3.5" />}
            {t === "Reels" && <Play className="w-3.5 h-3.5" />}
            {t === "Tagged" && <Tag className="w-3.5 h-3.5" />}
            {t === "Saved" && <Bookmark className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{t}</span>
          </button>
        ))}
      </div>

      {loadingProfile ? (
        <div className="flex justify-center py-16"><Loader2 className="w-7 h-7 text-teal-500 animate-spin" /></div>
      ) : displayImages.length === 0 ? (
        <div className="text-center py-16 text-gray-400 text-sm">
          {activeTab === "Saved" ? "No saved posts yet." : "No posts yet. Create your first post from the Create tab."}
        </div>
      ) : (
      <div className="grid grid-cols-3 gap-0.5 sm:gap-1">
        {displayImages.map((img, i) => (
          <div key={i} className="relative aspect-square overflow-hidden rounded-sm cursor-pointer group" onClick={() => setSelectedImg(img)}>
            <img src={img} alt="" className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
          </div>
        ))}
      </div>
      )}
    </div>
  );
}

// ── SETTINGS SECTION ──────────────────────────────────────────────────────────
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
  const [form, setForm] = useState<Record<string, string | boolean>>({ name:"", username:"", website:"", bio:"", email:"", phone:"", gender:"", showSuggestions: true });
  const upd = (k: string, v: string | boolean) => setForm(p => ({ ...p, [k]: v }));
  const [saved, setSaved] = useState(false);

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
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) setAvatar(URL.createObjectURL(f)); }} />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-800">UPVOX_</p>
            <button onClick={() => fileRef.current?.click()} className="text-xs text-teal-500 font-semibold hover:underline mt-0.5">Change profile photo</button>
          </div>
        </div>
        {[
          { label:"Name", key:"name", placeholder:"Planext4U", hint:"Help people discover your account." },
          { label:"Username", key:"username", placeholder:"Planext4U", hint:"You can change username back within 14 days." },
          { label:"Website", key:"website", placeholder:"https://", hint:"Editing links is available on mobile." },
          { label:"Bio", key:"bio", placeholder:"Tell your story…", hint:`${String(form.bio).length}/150`, multi: true },
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
          <button onClick={() => setSaved(true)} className="ml-auto text-white text-sm font-bold px-5 py-2 rounded-xl shadow hover:opacity-90 transition" style={{ background: TEAL }}>Save</button>
        </div>
      </div>
    </div>
  );
}

function PrivacyPanel() {
  const [priv, setPriv] = useState(false);
  const [actStatus, setActStatus] = useState(true);
  const [storyReplies, setStoryReplies] = useState("Everyone");
  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 max-w-xl">
      <h2 className="text-base font-semibold text-gray-900 mb-6">Account Privacy</h2>
      <div className="space-y-3">
        <div className="bg-white rounded-2xl border border-gray-100 p-4 flex items-start gap-4">
          <Lock className="w-5 h-5 text-gray-500 mt-0.5 shrink-0" />
          <div className="flex-1"><p className="text-sm font-semibold text-gray-900">Private Account</p><p className="text-xs text-gray-500 mt-0.5">Only approved followers can see your photos.</p></div>
          <Toggle checked={priv} onChange={setPriv} />
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-4 flex items-start gap-4">
          <Activity className="w-5 h-5 text-gray-500 mt-0.5 shrink-0" />
          <div className="flex-1"><p className="text-sm font-semibold text-gray-900">Show Activity Status</p><p className="text-xs text-gray-500 mt-0.5">Allow others to see when you were last active.</p></div>
          <Toggle checked={actStatus} onChange={setActStatus} />
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <p className="text-sm font-semibold text-gray-900 mb-3">Story Replies</p>
          {["Everyone","People you follow","Off"].map(opt => (
            <label key={opt} className="flex items-center gap-3 py-2 cursor-pointer">
              <div onClick={() => setStoryReplies(opt)} className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition ${storyReplies === opt ? "border-teal-500" : "border-gray-300"}`}>
                {storyReplies === opt && <div className="w-2 h-2 rounded-full bg-teal-500" />}
              </div>
              <span className="text-sm text-gray-700">{opt}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}

function NotificationSettingsPanel() {
  const [settings, setSettings] = useState<Record<string, boolean>>({ likes: true, comments: true, follows: true, messages: false, reposts: true, mentions: true, liveVideos: false, emailNotifs: false });
  const toggle = (k: string) => setSettings(p => ({ ...p, [k]: !p[k] }));
  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 max-w-xl">
      <h2 className="text-base font-semibold text-gray-900 mb-6">Notification Settings</h2>
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {[
          { key:"likes", label:"Likes", desc:"Notify when someone likes your post" },
          { key:"comments", label:"Comments", desc:"Notify when someone comments" },
          { key:"follows", label:"New Followers", desc:"Notify when someone follows you" },
          { key:"messages", label:"Messages", desc:"Notify for new messages" },
          { key:"reposts", label:"Reposts", desc:"Notify when your post is reposted" },
          { key:"mentions", label:"Mentions", desc:"Notify when you're mentioned" },
          { key:"liveVideos", label:"Live Videos", desc:"Notify when accounts go live" },
          { key:"emailNotifs", label:"Email Notifications", desc:"Get updates via email" },
        ].map(({ key, label, desc }, i, arr) => (
          <div key={key} className={`flex items-center gap-4 px-4 py-3.5 ${i < arr.length - 1 ? "border-b border-gray-50" : ""}`}>
            <div className="flex-1"><p className="text-sm font-semibold text-gray-900">{label}</p><p className="text-xs text-gray-400">{desc}</p></div>
            <Toggle checked={settings[key]} onChange={() => toggle(key)} />
          </div>
        ))}
      </div>
    </div>
  );
}

function LanguagePanel() {
  const [lang, setLang] = useState("English");
  const langs = ["English","Tamil","Hindi","Telugu","Malayalam","Kannada","Bengali","Marathi","Gujarati","Punjabi"];
  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 max-w-xl">
      <h2 className="text-base font-semibold text-gray-900 mb-6">Select Language</h2>
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {langs.map((l, i) => (
          <button key={l} onClick={() => setLang(l)} className={`w-full flex items-center justify-between px-4 py-3.5 text-sm transition hover:bg-gray-50 ${i < langs.length - 1 ? "border-b border-gray-50" : ""} ${lang === l ? "text-teal-600 font-bold" : "text-gray-700"}`}>
            {l}{lang === l && <Check className="w-4 h-4 text-teal-500" />}
          </button>
        ))}
      </div>
    </div>
  );
}

function TimeManagementPanel() {
  const [limit, setLimit] = useState(60);
  const [reminder, setReminder] = useState(true);
  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 max-w-xl">
      <h2 className="text-base font-semibold text-gray-900 mb-6">Time Management</h2>
      <div className="space-y-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <p className="text-sm font-semibold text-gray-900 mb-1">Daily Time Limit</p>
          <p className="text-xs text-gray-400 mb-4">Set a daily limit for time spent on this app.</p>
          <div className="flex items-center gap-4">
            <input type="range" min={15} max={240} step={15} value={limit} onChange={e => setLimit(+e.target.value)} className="flex-1 accent-teal-500" />
            <span className="text-sm font-bold text-teal-600 w-16 shrink-0">{limit >= 60 ? `${Math.floor(limit/60)}h ${limit%60 ? `${limit%60}m` : ""}` : `${limit}m`}</span>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5 flex items-center gap-4">
          <div className="flex-1"><p className="text-sm font-semibold text-gray-900">Daily Reminder</p><p className="text-xs text-gray-400 mt-0.5">Get reminded when you approach your limit.</p></div>
          <Toggle checked={reminder} onChange={setReminder} />
        </div>
      </div>
    </div>
  );
}

function RewardsPanel() {
  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 max-w-xl">
      <h2 className="text-base font-semibold text-gray-900 mb-6">Reward Points</h2>
      <div className="rounded-2xl text-white p-6 mb-5 text-center" style={{ background: TEAL }}>
        <Star className="w-8 h-8 mx-auto mb-2 fill-white" />
        <p className="text-3xl font-semibold">—</p>
        <p className="text-sm text-white/80 mt-1">Total points when rewards API is connected</p>
      </div>
      <p className="text-sm text-gray-500 text-center">No reward activity loaded yet.</p>
    </div>
  );
}

function SavedPanel() {
  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 max-w-xl">
      <h2 className="text-base font-semibold text-gray-900 mb-6">Saved</h2>
      <p className="text-sm text-gray-500 text-center py-12">No saved posts yet.</p>
    </div>
  );
}

function CloseFriendsPanel() {
  const [cfSuggestions, setCfSuggestions] = useState<SuggestionItem[]>([]);
  const [friends, setFriends] = useState<string[]>([]);

  useEffect(() => {
    socialApi.getSuggestions({ limit: 10 })
      .then((rows) => setCfSuggestions(rows.map(mapApiSuggestion)))
      .catch(() => {});
  }, []);
  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 max-w-xl">
      <h2 className="text-base font-semibold text-gray-900 mb-2">Close Friends</h2>
      <p className="text-xs text-gray-400 mb-5">People on your close friends list can see your close friends stories.</p>
      <div className="space-y-2">
        {cfSuggestions.map(s => (
          <div key={s.id} className="flex items-center gap-3 bg-white rounded-xl p-3 border border-gray-100">
            {s.avatar ? (
            <img src={s.avatar} alt={s.name} className="w-10 h-10 rounded-full object-cover shrink-0" />
            ) : (
            <div className="w-10 h-10 rounded-full bg-gray-200 shrink-0 flex items-center justify-center text-xs text-gray-500 font-bold">?</div>
            )}
            <div className="flex-1"><p className="text-sm font-semibold text-gray-900">{s.name}</p><p className="text-xs text-gray-400">{s.sub}</p></div>
            <button onClick={() => setFriends(p => p.includes(s.userId) ? p.filter(x=>x!==s.userId) : [...p,s.userId])}
              className={`text-xs font-bold px-3 py-1.5 rounded-xl transition ${friends.includes(s.userId) ? "bg-teal-500 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}>
              {friends.includes(s.userId) ? "Added ✓" : "Add"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function BlockedPanel() {
  const [blocked, setBlocked] = useState<{ id: number; name: string; avatar: string }[]>([]);
  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 max-w-xl">
      <h2 className="text-base font-semibold text-gray-900 mb-2">Blocked</h2>
      <p className="text-xs text-gray-400 mb-5">They won&apos;t be able to find your profile or posts.</p>
      {blocked.length === 0
        ? <p className="text-sm text-gray-400 text-center py-8">No blocked accounts</p>
        : <div className="space-y-2">
            {blocked.map(b => (
              <div key={b.id} className="flex items-center gap-3 bg-white rounded-xl p-3 border border-gray-100">
                <img src={b.avatar} alt={b.name} className="w-10 h-10 rounded-full object-cover shrink-0" />
                <div className="flex-1"><p className="text-sm font-semibold text-gray-900">{b.name}</p></div>
                <button onClick={() => setBlocked(p=>p.filter(x=>x.id!==b.id))} className="text-xs font-bold px-3 py-1.5 rounded-xl bg-gray-100 text-gray-700 hover:bg-gray-200 transition">Unblock</button>
              </div>
            ))}
          </div>}
    </div>
  );
}

function CommentsPanel() {
  const [allow, setAllow] = useState("Everyone");
  const [filter, setFilter] = useState(true);
  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 max-w-xl">
      <h2 className="text-base font-semibold text-gray-900 mb-6">Comments</h2>
      <div className="space-y-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <p className="text-sm font-semibold text-gray-900 mb-3">Allow comments from</p>
          {["Everyone","People you follow","Your followers","People you follow and your followers"].map(opt => (
            <label key={opt} className="flex items-center gap-3 py-1.5 cursor-pointer">
              <div onClick={() => setAllow(opt)} className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition ${allow === opt ? "border-teal-500" : "border-gray-300"}`}>
                {allow === opt && <div className="w-2 h-2 rounded-full bg-teal-500" />}
              </div>
              <span className="text-sm text-gray-700">{opt}</span>
            </label>
          ))}
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-4">
          <div className="flex-1"><p className="text-sm font-semibold text-gray-900">Filter offensive comments</p><p className="text-xs text-gray-400 mt-0.5">Automatically hide offensive comments.</p></div>
          <Toggle checked={filter} onChange={setFilter} />
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

function SettingsSection() {
  const [activeMenu, setActiveMenu] = useState("edit_profile");
  const [mobilePanelOpen, setMobilePanelOpen] = useState(false);

  const handleMenu = (key: string) => { setActiveMenu(key); setMobilePanelOpen(true); };

  const renderPanel = () => {
    switch (activeMenu) {
      case "edit_profile": return <EditProfilePanel />;
      case "notification_settings": return <NotificationSettingsPanel />;
      case "privacy": return <PrivacyPanel />;
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
      case "message_replies": return <GenericPanel title="Message and Story Replies" desc="Control who can reply to your stories and send you messages." />;
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
    <div className="flex" style={{ height: "100%", minHeight: "400px" }}>
      {/* Sidebar */}
      <div className={`w-full sm:w-64 bg-white border-r border-gray-100 overflow-y-auto shrink-0 flex flex-col ${mobilePanelOpen ? "hidden sm:flex" : "flex"}`}>
        {SETTINGS_NAV.map((section, si) => (
          <div key={si} className="mb-1">
            <p className="text-[10px] font-semibold tracking-widest uppercase text-gray-400 px-4 py-2 mt-2">{section.heading}</p>
            {section.items.map(({ key, label, icon: Icon }) => (
              <button key={label} onClick={() => handleMenu(key)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition text-left ${activeMenu === key ? "text-teal-600 bg-teal-50 font-semibold" : "text-gray-700 hover:bg-gray-50"}`}>
                <Icon className={`w-4 h-4 shrink-0 ${activeMenu === key ? "text-teal-500" : "text-gray-400"}`} />
                <span className="flex-1 text-left">{label}</span>
                <ChevronRight className="w-3.5 h-3.5 text-gray-300 shrink-0" />
              </button>
            ))}
          </div>
        ))}
        <div className="px-4 py-4 mt-2 border-t border-gray-100">
          <button className="text-xs text-red-400 hover:text-red-600 underline underline-offset-2">Log out</button>
        </div>
      </div>
      {/* Panel */}
      <div className={`flex-1 bg-white overflow-hidden flex flex-col min-w-0 ${!mobilePanelOpen ? "hidden sm:flex" : "flex"}`}>
        <div className="sm:hidden flex items-center gap-2 px-4 py-3 bg-white border-b border-gray-100 shrink-0">
          <button onClick={() => setMobilePanelOpen(false)} className="p-1"><ArrowLeft className="w-5 h-5 text-gray-600" /></button>
          <span className="text-sm font-bold text-gray-800 capitalize">{activeMenu?.replace(/_/g," ")}</span>
        </div>
        {renderPanel()}
      </div>
    </div>
  );
}

// ── NAV CONFIG ────────────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { key: "home", label: "Home", icon: Home },
  { key: "explore", label: "Explore", icon: Compass },
  { key: "reels", label: "Reels", icon: Film },
  { key: "messages", label: "Messages", icon: MessageCircle },
  { key: "notifications", label: "Activity", icon: Bell },
  { key: "create", label: "Create", icon: PlusCircle },
  { key: "profile", label: "Profile", icon: User },
  { key: "settings", label: "Settings", icon: Settings },
];

// ── MAIN APP ──────────────────────────────────────────────────────────────────
export default function SocialApp() {
  const [section, setSection] = useState("home");
  const [userProfile, setUserProfile] = useState<{ userId: string } | null>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const handleUserClick = (userId: string) => {
    if (userId) setUserProfile({ userId });
  };

  const handleBackFromProfile = () => {
    setUserProfile(null);
  };

  const handleNavClick = (key: string) => {
    setSection(key);
    setUserProfile(null);
    setMobileNavOpen(false);
  };

  const renderContent = () => {
    // User profile overlay takes priority
    if (userProfile) {
      return <UserProfilePage userId={userProfile.userId} onBack={handleBackFromProfile} />;
    }
    switch (section) {
      case "home": return <HomeSection onUserClick={handleUserClick} />;
      case "explore": return <ExploreSection onUserClick={handleUserClick} />;
      case "reels": return <ReelsSection onUserClick={handleUserClick} />;
      case "messages": return <MessagesSection onUserClick={handleUserClick} />;
      case "notifications": return <NotificationsSection onUserClick={handleUserClick} />;
      case "create": return <CreateSection />;
      case "profile": return <MyProfileSection />;
      case "settings": return <SettingsSection />;
      default: return <HomeSection onUserClick={handleUserClick} />;
    }
  };

  return (
     <div className="max-w-[1300px] mx-auto flex h-screen overflow-hidden font-sans">
      {/* ── Desktop Sidebar ── */}
      <nav className="hidden md:flex flex-col w-16 lg:w-56 bg-white border-r border-gray-100 shrink-0 py-4 px-2 lg:px-3">
        {/* Logo */}
        <div className="px-2 mb-6 flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: TEAL }}>
            <span className="text-white font-black text-sm">P4</span>
          </div>
          <span className="hidden lg:block text-sm font-black text-gray-900 tracking-tight">P4U Social</span>
        </div>
        {NAV_ITEMS.map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => handleNavClick(key)}
            className={`flex items-center gap-3 px-2 py-2.5 rounded-xl text-left transition mb-0.5 group ${section === key && !userProfile ? "text-teal-600 bg-teal-50 font-semibold" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"}`}>
            <Icon className={`w-5 h-5 shrink-0 ${section === key && !userProfile ? "text-teal-500" : "text-gray-400 group-hover:text-gray-600"}`} />
            <span className="hidden lg:block text-sm">{label}</span>
          </button>
        ))}
        <div className="mt-auto pt-4 border-t border-gray-100">
          <div className="flex items-center gap-3 px-2 py-2">
            <div className="w-8 h-8 rounded-full bg-gray-200 shrink-0 flex items-center justify-center"><User className="w-4 h-4 text-gray-500" /></div>
            <div className="hidden lg:block min-w-0">
              <p className="text-xs font-bold text-gray-900 truncate">Account</p>
              <p className="text-[10px] text-gray-400">View profile</p>
            </div>
          </div>
        </div>
      </nav>

      {/* ── Main Content ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
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
        <main className="flex-1 overflow-y-auto">
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
  );
}