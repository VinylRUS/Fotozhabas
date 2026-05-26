import { create } from 'zustand';

export type PostType = 'PHOTO' | 'YOUTUBE' | 'TEXT';
export type PostStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'POSTED' | 'DEFERRED';
export type ModeratorRole = 'ADMIN' | 'MODERATOR';
export type VoteDecision = 'POSTED' | 'SKIPPED';
export type VotePlatform = 'TWITCH' | 'GOODGAME';

export interface TelegramUser {
  id: string;
  telegramId: string;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  trustLevel: number;
  postsCount: number;
  acceptedCount: number;
  rejectedCount: number;
}

export interface Post {
  id: string;
  type: PostType;
  status: PostStatus;
  text: string | null;
  mediaUrl: string | null;
  mediaFileId: string | null;
  youtubeUrl: string | null;
  youtubeTitle: string | null;
  youtubeThumbnail: string | null;
  authorId: string;
  author: TelegramUser;
  channelId: string | null;
  channel: { id: string; telegramId: string; name: string; isDefault: boolean } | null;
  reviewedAt: string | null;
  reviewerId: string | null;
  postedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Channel {
  id: string;
  telegramId: string;
  name: string;
  isDefault: boolean;
  _count?: { posts: number };
  createdAt: string;
  updatedAt: string;
}

export interface Moderator {
  id: string;
  userId: string;
  role: ModeratorRole;
  addedById: string | null;
  user: TelegramUser;
  createdAt: string;
  updatedAt: string;
}

export interface VoteSession {
  id: string;
  postId: string;
  status: 'ACTIVE' | 'CLOSED';
  startedAt: string;
  closedAt: string | null;
  durationSec: number;
  votesFor: number;
  votesAgainst: number;
  finalDecision: VoteDecision | null;
  streamerFollowedChat: boolean | null;
  totalVoters: number;
  post?: Post;
}

export interface ActiveVote {
  sessionId: string;
  postId: string;
  durationSec: number;
  votesFor: number;
  votesAgainst: number;
  totalVoters: number;
  timeRemaining: number;
  finalDecision?: VoteDecision;
}

export type TabType = 'moderation' | 'channels' | 'moderators' | 'settings' | 'stats' | 'history' | 'overlay';

export interface ActivityItem {
  id: string;
  type: 'accept' | 'reject' | 'defer' | 'vote_start' | 'publish' | 'vote_end';
  message: string;
  timestamp: number;
}

interface StreamPostState {
  // Navigation
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;

  // Moderation
  currentPostIndex: number;
  setCurrentPostIndex: (index: number) => void;
  nextPost: () => void;
  prevPost: () => void;

  // Active vote tracking (real-time from socket)
  activeVotes: Map<string, ActiveVote>;
  setActiveVote: (postId: string, vote: ActiveVote) => void;
  updateActiveVote: (sessionId: string, data: Partial<ActiveVote>) => void;
  removeActiveVote: (postId: string) => void;
  clearActiveVotes: () => void;

  // Vote result animation
  voteResults: Map<string, { decision: VoteDecision; forPercent: number; againstPercent: number }>;
  setVoteResult: (postId: string, result: { decision: VoteDecision; forPercent: number; againstPercent: number }) => void;
  removeVoteResult: (postId: string) => void;

  // Socket connection
  socketConnected: boolean;
  setSocketConnected: (connected: boolean) => void;

  // Activity log
  activityLog: ActivityItem[];
  addActivity: (item: Omit<ActivityItem, 'id' | 'timestamp'>) => void;
  clearOldActivities: () => void;

  // Sound toggle
  soundEnabled: boolean;
  toggleSound: () => void;

  // Confetti
  showConfetti: boolean;
  triggerConfetti: () => void;
  hideConfetti: () => void;
}

export const useStreamPostStore = create<StreamPostState>((set) => ({
  // Navigation
  activeTab: 'moderation',
  setActiveTab: (tab) => set({ activeTab: tab }),

  // Moderation
  currentPostIndex: 0,
  setCurrentPostIndex: (index) => set({ currentPostIndex: index }),
  nextPost: () => set((state) => ({ currentPostIndex: state.currentPostIndex + 1 })),
  prevPost: () => set((state) => ({ currentPostIndex: Math.max(0, state.currentPostIndex - 1) })),

  // Active vote tracking
  activeVotes: new Map(),
  setActiveVote: (postId, vote) =>
    set((state) => {
      const newMap = new Map(state.activeVotes);
      newMap.set(postId, vote);
      return { activeVotes: newMap };
    }),
  updateActiveVote: (sessionId, data) =>
    set((state) => {
      const newMap = new Map(state.activeVotes);
      // Find the vote by sessionId
      for (const [postId, vote] of newMap.entries()) {
        if (vote.sessionId === sessionId) {
          newMap.set(postId, { ...vote, ...data });
          break;
        }
      }
      return { activeVotes: newMap };
    }),
  removeActiveVote: (postId) =>
    set((state) => {
      const newMap = new Map(state.activeVotes);
      newMap.delete(postId);
      return { activeVotes: newMap };
    }),
  clearActiveVotes: () => set({ activeVotes: new Map() }),

  // Vote results
  voteResults: new Map(),
  setVoteResult: (postId, result) =>
    set((state) => {
      const newMap = new Map(state.voteResults);
      newMap.set(postId, result);
      return { voteResults: newMap };
    }),
  removeVoteResult: (postId) =>
    set((state) => {
      const newMap = new Map(state.voteResults);
      newMap.delete(postId);
      return { voteResults: newMap };
    }),

  // Socket
  socketConnected: false,
  setSocketConnected: (connected) => set({ socketConnected: connected }),

  // Activity log
  activityLog: [],
  addActivity: (item) =>
    set((state) => {
      const newItem: ActivityItem = {
        ...item,
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        timestamp: Date.now(),
      };
      // Keep max 50 items, add new item at the beginning
      const newLog = [newItem, ...state.activityLog].slice(0, 50);
      return { activityLog: newLog };
    }),
  clearOldActivities: () =>
    set((state) => {
      const thirtyMinAgo = Date.now() - 30 * 60 * 1000;
      return { activityLog: state.activityLog.filter((item) => item.timestamp > thirtyMinAgo) };
    }),

  // Sound toggle
  soundEnabled: true,
  toggleSound: () => set((state) => ({ soundEnabled: !state.soundEnabled })),

  // Confetti
  showConfetti: false,
  triggerConfetti: () => set({ showConfetti: true }),
  hideConfetti: () => set({ showConfetti: false }),
}));
