const fs = require('fs');
const path = 'app/socio/SocialPage.tsx';
let c = fs.readFileSync(path, 'utf8');
const nl = '\r\n';

const lines = c.split(nl);

function findLine(pattern, start = 0) {
  for (let i = start; i < lines.length; i++) {
    if (lines[i].includes(pattern)) return i;
  }
  return -1;
}

// ── 1. Fix imports ──
const importLine = findLine('import { useState, useRef, useEffect }');
lines[importLine] = 'import { useState, useRef, useEffect, useCallback } from "react";';

const layersLine = findLine('User, Menu, Grid, Play, Layers');
lines[layersLine] = '  User, Menu, Grid, Play, Layers, Loader2';

const lucideClose = findLine('} from "lucide-react"', layersLine);
lines.splice(lucideClose + 1, 0, 'import { socialApi } from "@/lib/api/social";');

// ── 2. Remove hardcoded data blocks and replace with types ──
const dataCommentIdx = findLine('// \u2500\u2500 DATA');
const userProfilesStart = findLine('const USER_PROFILES');
let userProfilesEnd = userProfilesStart;
for (let i = userProfilesStart + 1; i < lines.length; i++) {
  if (lines[i].trim() === '};') {
    userProfilesEnd = i;
    break;
  }
}

const typeBlock = [
  '// \u2500\u2500 TYPES for local UI state \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500',
  'interface StoryItem { id: number | string; mine: boolean; label: string; avatar: string | null }',
  'interface PostItem { id: number | string; user: string; co: string; avatarA: string; avatarB: string | null; location: string; time: string; image: string; likes: number; comments: number; shares: number; caption: string; hashtags: string }',
  'interface ContactItem { id: number; name: string; avatar: string; lastMsg: string; time: string; unread: boolean }',
  'interface NotificationItem { id: number; group: string; user: string; text: string; time: string; avatar: string; action: string }',
  'interface SearchItem { id: number; name: string; sub: string; avatar: string; verified: boolean }',
  'interface SuggestionItem { id: number; name: string; sub: string; avatar: string }',
  'interface UserProfileData { name: string; username: string; bio: string; website: string; posts: number; followers: string; following: string; avatar: string; images: string[]; verified: boolean }',
  'interface ExplorePostItem { id: number; image: string; likes: number; comments: number }',
  'interface ReelItem { id: number; username: string; caption: string; video: string; likes: number; comments: number; shares: number; avatar: string; user: string }',
  '',
  '/** Map an API Post to the shape our PostCard expects */',
  'function mapApiPostToPostItem(p: { id: string | number; userName?: string; userAvatar?: string; content?: string; imageUrl?: string; likeCount: number; commentCount: number; createdAt: string }): PostItem {',
  '  return {',
  '    id: p.id,',
  '    user: p.userName ?? "unknown",',
  '    co: "",',
  '    avatarA: p.userAvatar ?? "https://i.pravatar.cc/40",',
  '    avatarB: null,',
  '    location: "",',
  '    time: p.createdAt ? new Date(p.createdAt).toLocaleDateString() : "",',
  '    image: p.imageUrl ?? "",',
  '    likes: p.likeCount,',
  '    comments: p.commentCount,',
  '    shares: 0,',
  '    caption: p.content ?? "",',
  '    hashtags: "",',
  '  };',
  '}',
  '',
  '/** Map an API Story to the shape our StoryCircle expects */',
  'function mapApiStoryToStoryItem(s: { id: string | number; userName?: string; userAvatar?: string }): StoryItem {',
  '  return {',
  '    id: s.id,',
  '    mine: false,',
  '    label: s.userName ?? "user",',
  '    avatar: s.userAvatar ?? null,',
  '  };',
  '}',
  '',
  '/** Map an API UserSummary to suggestion shape */',
  'function mapApiSuggestion(u: { id: number; name?: string; avatar?: string }): SuggestionItem {',
  '  return { id: u.id, name: u.name ?? "user", sub: "Suggested for you", avatar: u.avatar ?? "https://i.pravatar.cc/40" };',
  '}',
];

lines.splice(dataCommentIdx, userProfilesEnd - dataCommentIdx + 1, ...typeBlock);
console.log('After removing hardcoded data, lines:', lines.length);

// ── 3. Fix UserProfilePage ──
const userProfilePageIdx = findLine('function UserProfilePage(');
const tabsLine = findLine('const TABS = ["Posts"', userProfilePageIdx);

const newProfileHead = [
  'function UserProfilePage({ username, onBack }: { username: string; onBack: () => void }) {',
  '  const [profile, setProfile] = useState<UserProfileData | null>(null);',
  '  const [loading, setLoading] = useState(true);',
  '  const [following, setFollowing] = useState(false);',
  '  const [selectedImg, setSelectedImg] = useState<string | null>(null);',
  '  const [activeTab, setActiveTab] = useState("Posts");',
  '',
  '  useEffect(() => {',
  '    // No dedicated API for fetching a user profile by username yet;',
  '    // show a placeholder state.',
  '    setLoading(false);',
  '    setProfile(null);',
  '  }, [username]);',
  '',
  '  if (loading) {',
  '    return (',
  '      <div className="flex flex-col items-center justify-center h-full py-20 px-4">',
  '        <Loader2 className="w-8 h-8 text-teal-500 animate-spin mb-4" />',
  '        <p className="text-gray-400 text-sm">Loading profile...</p>',
  '      </div>',
  '    );',
  '  }',
  '',
  '  if (!profile) {',
  '    return (',
  '      <div className="flex flex-col items-center justify-center h-full py-20 px-4">',
  '        <User className="w-16 h-16 text-gray-300 mb-4" />',
  '        <p className="text-gray-500 text-sm">User @{username} not found</p>',
  '        <button onClick={onBack} className="mt-4 text-teal-500 text-sm font-semibold">\u2190 Go back</button>',
  '      </div>',
  '    );',
  '  }',
  '',
  '  const TABS = ["Posts", "Reels", "Tagged"];',
];

lines.splice(userProfilePageIdx, tabsLine - userProfilePageIdx + 1, ...newProfileHead);
console.log('After UserProfilePage fix, lines:', lines.length);

// ── 4. Fix HomeSection ──
const homeSectionIdx = findLine('function HomeSection(');
const homeReturnIdx = findLine('return (', homeSectionIdx + 1);

const newHomeHead = [
  'function HomeSection({ onUserClick }: { onUserClick: (username: string) => void }) {',
  '  const [stories, setStories] = useState<StoryItem[]>([{ id: "my", mine: true, label: "Your Story", avatar: null }]);',
  '  const [posts, setPosts] = useState<PostItem[]>([]);',
  '  const [searches, setSearches] = useState<SearchItem[]>([]);',
  '  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([]);',
  '  const [loadingFeed, setLoadingFeed] = useState(true);',
  '  const [q, setQ] = useState("");',
  '  const [storyView, setStoryView] = useState<{ open: boolean; story: StoryItem | null }>({ open: false, story: null });',
  '  const [showCreateStory, setShowCreateStory] = useState(false);',
  '  const filtered = q ? searches.filter(s => s.name.toLowerCase().includes(q.toLowerCase())) : searches;',
  '',
  '  useEffect(() => {',
  '    let cancelled = false;',
  '    async function load() {',
  '      try {',
  '        const [feedRes, storyRes, suggestionsRes] = await Promise.allSettled([',
  '          socialApi.getPublicFeed({ limit: 20 }),',
  '          socialApi.getStoryFeed(),',
  '          socialApi.getSuggestions(),',
  '        ]);',
  '        if (cancelled) return;',
  '        if (feedRes.status === "fulfilled") {',
  '          setPosts(feedRes.value.data.map(mapApiPostToPostItem));',
  '        }',
  '        if (storyRes.status === "fulfilled" && storyRes.value.length > 0) {',
  '          setStories(prev => [prev[0], ...storyRes.value.map(mapApiStoryToStoryItem)]);',
  '        }',
  '        if (suggestionsRes.status === "fulfilled" && Array.isArray(suggestionsRes.value)) {',
  '          setSuggestions(suggestionsRes.value.map(mapApiSuggestion));',
  '        }',
  '      } catch { /* API may be unreachable */ }',
  '      if (!cancelled) setLoadingFeed(false);',
  '    }',
  '    load();',
  '    return () => { cancelled = true; };',
  '  }, []);',
  '',
];

lines.splice(homeSectionIdx, homeReturnIdx - homeSectionIdx, ...newHomeHead);

// Replace STORIES/POSTS/SUGGESTIONS references in HomeSection template
for (let i = homeSectionIdx; i < lines.length; i++) {
  if (lines[i].includes('{STORIES.map(')) {
    lines[i] = lines[i].replace('{STORIES.map(', '{stories.map(');
    break;
  }
}
for (let i = homeSectionIdx; i < lines.length; i++) {
  if (lines[i].includes('{POSTS.map(')) {
    lines[i] = lines[i].replace('{POSTS.map(', '{posts.map(');
    break;
  }
}
for (let i = homeSectionIdx; i < lines.length; i++) {
  if (lines[i].includes('{SUGGESTIONS.map(')) {
    lines[i] = lines[i].replace('{SUGGESTIONS.map(', '{suggestions.map(');
    break;
  }
}

// Add loading/empty state before posts.map
const postsMapIdx = findLine('{posts.map(', homeSectionIdx);
const feedLoadingBlock = [
  '        {loadingFeed && posts.length === 0 && (',
  '          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 text-teal-500 animate-spin" /></div>',
  '        )}',
  '        {!loadingFeed && posts.length === 0 && (',
  '          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center mb-4">',
  '            <p className="text-sm text-gray-400">No posts yet. Follow people to see their posts here.</p>',
  '          </div>',
  '        )}',
];
lines.splice(postsMapIdx, 0, ...feedLoadingBlock);

console.log('After HomeSection fix, lines:', lines.length);

// ── 5. Fix ExploreSection ──
const explorePostsConst = findLine('const EXPLORE_POSTS = Array.from');
const peopleLine = findLine('const PEOPLE = Object.values(USER_PROFILES)');

// Remove both constant lines (they should be adjacent or close)
if (peopleLine >= 0) lines[peopleLine] = '';
if (explorePostsConst >= 0) lines[explorePostsConst] = '';

const exploreSectionIdx = findLine('function ExploreSection(');
const exploreReturn = findLine('return (', exploreSectionIdx + 1);

const exploreStateBlock = [
  'function ExploreSection({ onUserClick }: { onUserClick: (username: string) => void }) {',
  '  const [tab, setTab] = useState("Top");',
  '  const [hover, setHover] = useState<number | null>(null);',
  '  const [search, setSearch] = useState("");',
  '  const [explorePosts, setExplorePosts] = useState<ExplorePostItem[]>([]);',
  '  const [people] = useState<{ username: string; name: string; avatar: string; posts: number }[]>([]);',
  '  const [loadingExplore, setLoadingExplore] = useState(true);',
  '',
  '  useEffect(() => {',
  '    let cancelled = false;',
  '    async function load() {',
  '      try {',
  '        const res = await socialApi.getPublicFeed({ limit: 18 });',
  '        if (cancelled) return;',
  '        setExplorePosts(res.data.map((p, i) => ({',
  '          id: Number(p.id) || i + 1,',
  '          image: p.imageUrl ?? `https://picsum.photos/seed/${i + 10}/400/400`,',
  '          likes: p.likeCount,',
  '          comments: p.commentCount,',
  '        })));',
  '      } catch { /* API may be unreachable */ }',
  '      if (!cancelled) setLoadingExplore(false);',
  '    }',
  '    load();',
  '    return () => { cancelled = true; };',
  '  }, []);',
  '',
];

lines.splice(exploreSectionIdx, exploreReturn - exploreSectionIdx, ...exploreStateBlock);

// Fix references
for (let i = exploreSectionIdx; i < lines.length; i++) {
  if (lines[i].includes('EXPLORE_POSTS.map(')) {
    lines[i] = lines[i].replace('EXPLORE_POSTS.map(', 'explorePosts.map(');
    break;
  }
}
for (let i = exploreSectionIdx; i < lines.length; i++) {
  if (lines[i].includes('PEOPLE.map(')) {
    lines[i] = lines[i].replace('PEOPLE.map(', 'people.map(');
    break;
  }
}

// Add empty states
const columnsDiv = findLine('columns-2 sm:columns-3', exploreSectionIdx);
if (columnsDiv > 0) {
  lines.splice(columnsDiv, 0,
    '        {loadingExplore && explorePosts.length === 0 && <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 text-teal-500 animate-spin" /></div>}',
    '        {!loadingExplore && explorePosts.length === 0 && <div className="text-center py-12 text-gray-400 text-sm">No posts to explore yet.</div>}',
  );
}

const peopleGridLine = findLine('grid grid-cols-2 sm:grid-cols-3 gap-3', exploreSectionIdx);
if (peopleGridLine > 0) {
  lines.splice(peopleGridLine, 0,
    '        {people.length === 0 && <div className="text-center py-12 text-gray-400 text-sm">No suggestions available.</div>}',
  );
}

console.log('After ExploreSection fix, lines:', lines.length);

// ── 6. Fix ReelsSection ──
const reelsDataConst = findLine('const REELS_DATA = [');
if (reelsDataConst >= 0) {
  let reelsDataEnd = reelsDataConst;
  for (let i = reelsDataConst + 1; i < lines.length; i++) {
    if (lines[i].trim() === '];') {
      reelsDataEnd = i;
      break;
    }
  }
  lines.splice(reelsDataConst, reelsDataEnd - reelsDataConst + 1);
}

const reelsSectionIdx = findLine('function ReelsSection(');
const reelsReturn = findLine('return (', reelsSectionIdx + 1);

const reelsStateBlock = [
  'function ReelsSection({ onUserClick }: { onUserClick: (username: string) => void }) {',
  '  const [globalMuted, setGlobalMuted] = useState(true);',
  '  const [reels] = useState<ReelItem[]>([]);',
  '',
];

lines.splice(reelsSectionIdx, reelsReturn - reelsSectionIdx, ...reelsStateBlock);

for (let i = reelsSectionIdx; i < lines.length; i++) {
  if (lines[i].includes('REELS_DATA.map(')) {
    lines[i] = lines[i].replace('REELS_DATA.map(', 'reels.map(');
    break;
  }
}

// Add empty state for reels - find the style block
const reelsStyleBlock = findLine('@keyframes marquee', reelsSectionIdx);
if (reelsStyleBlock > 0) {
  // Find closing </style> tag
  const styleEnd = findLine('</style>', reelsStyleBlock);
  if (styleEnd > 0) {
    lines.splice(styleEnd + 1, 0,
      '',
      '      {reels.length === 0 && (',
      '        <div className="flex flex-col items-center justify-center h-[60vh] text-white/50">',
      '          <Film className="w-12 h-12 mb-3" />',
      '          <p className="text-sm">No reels available yet.</p>',
      '        </div>',
      '      )}',
    );
  }
}

console.log('After ReelsSection fix, lines:', lines.length);

// ── 7. Fix MessagesSection ──
const msgSectionIdx = findLine('function MessagesSection(');

for (let i = msgSectionIdx; i < lines.length; i++) {
  if (lines[i].includes('CONTACTS.map(')) {
    lines[i] = lines[i].replace('CONTACTS.map(', 'contacts.map(');
    break;
  }
}
for (let i = msgSectionIdx; i < lines.length; i++) {
  if (lines[i].includes('CONTACTS.find(')) {
    lines[i] = lines[i].replace('CONTACTS.find(', 'contacts.find(');
    break;
  }
}

const msgActive = findLine('const [active, setActive] = useState(1)', msgSectionIdx);
if (msgActive >= 0) {
  lines.splice(msgActive, 1,
    '  const [contacts] = useState<ContactItem[]>([]);',
    '  const [active, setActive] = useState<number | null>(null);',
  );
}

console.log('After MessagesSection fix, lines:', lines.length);

// ── 8. Fix NotificationsSection ──
const notifSectionIdx = findLine('function NotificationsSection(');
const notifState = findLine('const [notifs, setNotifs] = useState(NOTIFICATIONS)', notifSectionIdx);
if (notifState >= 0) {
  lines[notifState] = '  const [notifs, setNotifs] = useState<NotificationItem[]>([]);';
}

console.log('After NotificationsSection fix, lines:', lines.length);

// ── 9. Fix CloseFriendsPanel ──
const closeFriendsIdx = findLine('function CloseFriendsPanel()');
if (closeFriendsIdx >= 0) {
  const cfFriendsState = findLine('const [friends, setFriends]', closeFriendsIdx);
  lines.splice(cfFriendsState, 0,
    '  const [cfSuggestions] = useState<SuggestionItem[]>([]);'
  );
  for (let i = closeFriendsIdx; i < lines.length; i++) {
    if (lines[i].includes('SUGGESTIONS.map(')) {
      lines[i] = lines[i].replace('SUGGESTIONS.map(', 'cfSuggestions.map(');
      break;
    }
  }
}

console.log('Final line count:', lines.length);

// Write back
fs.writeFileSync(path, lines.join(nl), 'utf8');
console.log('File written successfully');
