'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { io, Socket } from 'socket.io-client';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield,
  Radio,
  Users,
  Settings,
  BarChart3,
  Monitor,
  CheckCircle2,
  XCircle,
  Clock,
  Dices,
  Zap,
  Wifi,
  WifiOff,
  ChevronLeft,
  ChevronRight,
  Inbox,
  History,
  Send,
  Keyboard,
  Volume2,
  VolumeX,
  PanelRightOpen,
  PanelRightClose,
  Plus,
  Sun,
  Moon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useTheme } from 'next-themes';
import { useStreamPostStore, type ActiveVote, type TabType, type TelegramUser } from '@/lib/streampost-store';
import { usePendingPosts, usePosts, useUpdatePost, useStartVote, useCloseVote, useSettings, useCreatePost } from '@/lib/streampost-hooks';
import { ModerationCard } from '@/components/streampost/moderation-card';
import { VoteBar } from '@/components/streampost/vote-bar';
import { StreamOverlay } from '@/components/streampost/stream-overlay';
import { ChannelManager } from '@/components/streampost/channel-manager';
import { ModeratorManager } from '@/components/streampost/moderator-manager';
import { SettingsPanel } from '@/components/streampost/settings-panel';
import { StatsDashboard } from '@/components/streampost/stats-dashboard';
import { PostHistory } from '@/components/streampost/post-history';
import { ActivityFeed } from '@/components/streampost/activity-feed';
import { Confetti } from '@/components/streampost/confetti';
import { playSound } from '@/lib/sound-utils';
import { toast } from 'sonner';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5000,
      retry: 1,
    },
  },
});

const TABS: { id: TabType; label: string; labelRu: string; icon: React.ElementType }[] = [
  { id: 'moderation', label: 'Moderation', labelRu: 'Модерация', icon: Shield },
  { id: 'channels', label: 'Channels', labelRu: 'Каналы', icon: Radio },
  { id: 'moderators', label: 'Moderators', labelRu: 'Модераторы', icon: Users },
  { id: 'settings', label: 'Settings', labelRu: 'Настройки', icon: Settings },
  { id: 'stats', label: 'Stats', labelRu: 'Статистика', icon: BarChart3 },
  { id: 'history', label: 'History', labelRu: 'История', icon: History },
  { id: 'overlay', label: 'Overlay', labelRu: 'Оверлей', icon: Monitor },
];

// ============ Theme Toggle ============

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-white/40 hover:text-white/80 hover:bg-white/5"
      >
        <Sun className="w-4 h-4" />
      </Button>
    );
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-8 w-8 text-white/40 hover:text-white/80 hover:bg-white/5 dark:text-white/40 dark:hover:text-white/80 dark:hover:bg-white/5 light:text-gray-500 light:hover:text-gray-800 light:hover:bg-gray-100"
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      title={theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'}
    >
      {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
    </Button>
  );
}

function StreamPostApp() {
  const {
    activeTab,
    setActiveTab,
    currentPostIndex,
    setCurrentPostIndex,
    activeVotes,
    setActiveVote,
    updateActiveVote,
    removeActiveVote,
    setVoteResult,
    socketConnected,
    setSocketConnected,
    soundEnabled,
    toggleSound,
    triggerConfetti,
    addActivity,
    activityLog,
  } = useStreamPostStore();

  const [showActivityPanel, setShowActivityPanel] = useState(true);
  const [dismissedPostIds, setDismissedPostIds] = useState<Set<string>>(new Set());

  const socketRef = useRef<Socket | null>(null);
  const { data: pendingData, isLoading: postsLoading } = usePendingPosts();
  const { data: settings } = useSettings();
  const updatePost = useUpdatePost();
  const startVoteMutation = useStartVote();
  const closeVoteMutation = useCloseVote();

  const posts = pendingData?.posts || [];
  // BUG-1 FIX: Filter out dismissed posts so the card immediately advances
  const visiblePosts = posts.filter((p) => !dismissedPostIds.has(p.id));

  // Socket.io connection
  useEffect(() => {
    const socket = io('/?XTransformPort=3003', {
      transports: ['websocket', 'polling'],
    });

    socket.on('connect', () => {
      console.log('[StreamPost] Connected to realtime service');
      setSocketConnected(true);
      socket.emit('moderation:join');
    });

    socket.on('disconnect', () => {
      console.log('[StreamPost] Disconnected from realtime service');
      setSocketConnected(false);
    });

    socket.on('post:new', (postData) => {
      console.log('[StreamPost] New post received:', postData.id);
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      toast.info('Новый пост от @' + (postData.author?.username || 'anonymous'), {
        description: postData.type === 'PHOTO' ? '📸 Фото' : postData.type === 'YOUTUBE' ? '🎥 YouTube' : '📝 Текст',
      });
    });

    socket.on('post:status', (data: { postId: string; status: string }) => {
      console.log('[StreamPost] Post status changed:', data);
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    });

    socket.on('vote:start', (data: { sessionId: string; postId: string; durationSec: number }) => {
      console.log('[StreamPost] Vote started:', data.sessionId);
      setActiveVote(data.postId, {
        sessionId: data.sessionId,
        postId: data.postId,
        durationSec: data.durationSec,
        votesFor: 0,
        votesAgainst: 0,
        totalVoters: 0,
        timeRemaining: data.durationSec,
      });
    });

    socket.on(
      'vote:update',
      (data: { sessionId: string; votesFor: number; votesAgainst: number; totalVoters: number; timeRemaining: number }) => {
        updateActiveVote(data.sessionId, {
          votesFor: data.votesFor,
          votesAgainst: data.votesAgainst,
          totalVoters: data.totalVoters,
          timeRemaining: data.timeRemaining,
        });
      }
    );

    socket.on(
      'vote:end',
      (data: { sessionId: string; postId: string; votesFor: number; votesAgainst: number; totalVoters: number; finalDecision: string }) => {
        console.log('[StreamPost] Vote ended:', data);
        const total = data.votesFor + data.votesAgainst;
        const forPercent = total > 0 ? Math.round((data.votesFor / total) * 100) : 50;
        const againstPercent = 100 - forPercent;
        setVoteResult(data.postId, {
          decision: data.finalDecision as 'POSTED' | 'SKIPPED',
          forPercent,
          againstPercent,
        });

        addActivity({
          type: 'vote_end',
          message: data.finalDecision === 'POSTED'
            ? '🎉 Чат решил: опубликовать!'
            : '💀 Чат решил: отклонить',
        });

        setTimeout(() => {
          removeActiveVote(data.postId);
          if (data.finalDecision === 'POSTED') {
            setDismissedPostIds((prev) => new Set([...prev, data.postId]));
            updatePost.mutate({ id: data.postId, status: 'POSTED' });
            toast.success('Пост опубликован по результатам голосования!');
            triggerConfetti();
          } else {
            setDismissedPostIds((prev) => new Set([...prev, data.postId]));
            updatePost.mutate({ id: data.postId, status: 'REJECTED' });
            toast('Пост отклонён по результатам голосования', { icon: '❌' });
          }
        }, 3500);
      }
    );

    socketRef.current = socket;

    return () => {
      socket.emit('moderation:leave');
      socket.disconnect();
    };
  }, []);

  // Reset currentPostIndex if it exceeds the visible posts array
  useEffect(() => {
    if (visiblePosts.length > 0 && currentPostIndex >= visiblePosts.length) {
      setCurrentPostIndex(Math.max(0, visiblePosts.length - 1));
    }
  }, [visiblePosts.length, currentPostIndex, setCurrentPostIndex]);

  // Handle moderation actions with auto-advance and activity logging
  const handleAccept = useCallback(
    (postId: string) => {
      const post = posts.find((p) => p.id === postId);
      setDismissedPostIds((prev) => new Set([...prev, postId]));
      updatePost.mutate({ id: postId, status: 'APPROVED' });
      if (soundEnabled) playSound('accept');
      toast.success('Пост принят!', { icon: '✅' });
      addActivity({
        type: 'accept',
        message: `✅ Принят пост от @${post?.author?.username || 'anonymous'}`,
      });
    },
    [updatePost, posts, addActivity, soundEnabled]
  );

  const handleReject = useCallback(
    (postId: string) => {
      const post = posts.find((p) => p.id === postId);
      setDismissedPostIds((prev) => new Set([...prev, postId]));
      updatePost.mutate({ id: postId, status: 'REJECTED' });
      if (soundEnabled) playSound('reject');
      toast('Пост отклонён', { icon: '❌' });
      addActivity({
        type: 'reject',
        message: `❌ Отклонён пост от @${post?.author?.username || 'anonymous'}`,
      });
    },
    [updatePost, posts, addActivity, soundEnabled]
  );

  const handleDefer = useCallback(
    (postId: string) => {
      const post = posts.find((p) => p.id === postId);
      setDismissedPostIds((prev) => new Set([...prev, postId]));
      updatePost.mutate({ id: postId, status: 'DEFERRED' });
      toast('Пост отложен', { icon: '⏳' });
      addActivity({
        type: 'defer',
        message: `⏳ Отложен пост от @${post?.author?.username || 'anonymous'}`,
      });
    },
    [updatePost, posts, addActivity]
  );

  const handlePostAndPublish = useCallback(
    (postId: string) => {
      const post = posts.find((p) => p.id === postId);
      setDismissedPostIds((prev) => new Set([...prev, postId]));
      updatePost.mutate({ id: postId, status: 'POSTED' });
      if (soundEnabled) playSound('publish');
      toast.success('Пост опубликован в канал!', { icon: '🚀' });
      triggerConfetti();
      addActivity({
        type: 'publish',
        message: `🚀 Опубликован пост от @${post?.author?.username || 'anonymous'}${post?.channel ? ` в #${post.channel.name}` : ''}`,
      });
    },
    [updatePost, posts, addActivity, triggerConfetti, soundEnabled]
  );

  // BUG-3 FIX: Added local fallback for setActiveVote when socket.io is not connected
  const handleStartVote = useCallback(
    async (postId: string) => {
      const post = posts.find((p) => p.id === postId);
      const duration = parseInt(settings?.voteDuration || '30');
      try {
        const session = await startVoteMutation.mutateAsync({ postId, durationSec: duration });

        // LOCAL FALLBACK: Set active vote directly in case socket is not connected
        setActiveVote(postId, {
          sessionId: session.id,
          postId,
          durationSec: duration,
          votesFor: 0,
          votesAgainst: 0,
          totalVoters: 0,
          timeRemaining: duration,
        });

        // Also emit to socket if connected
        if (socketRef.current) {
          socketRef.current.emit('vote:start', {
            sessionId: session.id,
            postId,
            durationSec: duration,
          });
        }
        if (soundEnabled) playSound('vote');
        toast('Голосование запущено!', { icon: '🎲', description: `${duration} секунд на голосование` });
        addActivity({
          type: 'vote_start',
          message: `🎲 Голосование началось для поста от @${post?.author?.username || 'anonymous'}`,
        });
      } catch (err) {
        console.error('Failed to start vote:', err);
        toast.error('Не удалось запустить голосование');
      }
    },
    [settings, startVoteMutation, posts, addActivity, setActiveVote, soundEnabled]
  );

  const handleFinalDecision = useCallback(
    (postId: string, decision: 'POSTED' | 'SKIPPED') => {
      const activeVote = activeVotes.get(postId);
      if (!activeVote) return;

      closeVoteMutation.mutate({
        id: activeVote.sessionId,
        finalDecision: decision,
        streamerFollowedChat: decision === 'POSTED' ? activeVote.votesFor >= activeVote.votesAgainst : activeVote.votesAgainst > activeVote.votesFor,
      });

      if (socketRef.current) {
        socketRef.current.emit('vote:close', {
          sessionId: activeVote.sessionId,
          finalDecision: decision,
        });
      }
    },
    [activeVotes, closeVoteMutation]
  );

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (activeTab !== 'moderation') return;
      // Don't trigger if typing in an input or a dialog is open
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) return;
      if (e.target instanceof HTMLElement && e.target.closest('[data-slot="dialog-content"]')) return;

      const currentPost = visiblePosts[currentPostIndex];
      if (!currentPost) return;

      const activeVote = activeVotes.get(currentPost.id);

      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          setCurrentPostIndex(Math.max(0, currentPostIndex - 1));
          break;
        case 'ArrowRight':
          e.preventDefault();
          setCurrentPostIndex(Math.min(visiblePosts.length - 1, currentPostIndex + 1));
          break;
        case 'Enter':
          e.preventDefault();
          if (!activeVote) handleAccept(currentPost.id);
          break;
        case 'Delete':
        case 'Backspace':
          e.preventDefault();
          if (!activeVote) handleReject(currentPost.id);
          break;
        case 'd':
        case 'D':
          e.preventDefault();
          if (!activeVote) handleDefer(currentPost.id);
          break;
        case 'v':
        case 'V':
          e.preventDefault();
          if (!activeVote) handleStartVote(currentPost.id);
          break;
        case 'p':
        case 'P':
          e.preventDefault();
          if (!activeVote) handlePostAndPublish(currentPost.id);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTab, visiblePosts, currentPostIndex, activeVotes, setCurrentPostIndex, handleAccept, handleReject, handleDefer, handleStartVote, handlePostAndPublish]);

  const currentPost = visiblePosts[currentPostIndex];
  const nextPost = visiblePosts[currentPostIndex + 1];

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <Confetti />
      <QuickSubmitFAB />

      {/* Animated background particles */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl -top-48 -left-48 animate-pulse" />
        <div className="absolute w-96 h-96 bg-purple-500/5 rounded-full blur-3xl -bottom-48 -right-48 animate-pulse" style={{ animationDelay: '2s' }} />
        <div className="absolute w-64 h-64 bg-red-500/5 rounded-full blur-3xl top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" style={{ animationDelay: '4s' }} />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 via-teal-500 to-purple-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-emerald-400 rounded-full border-2 border-gray-950 animate-pulse" />
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tight">
                <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-purple-400 bg-clip-text text-transparent">StreamPost</span>
              </h1>
              <p className="text-[10px] text-white/30 -mt-0.5 tracking-wider uppercase">СИСТЕМА МОДЕРАЦИИ КОНТЕНТА</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Theme toggle */}
            <ThemeToggle />

            {/* Sound toggle */}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-white/40 hover:text-white/80 hover:bg-white/5 dark:text-white/40 dark:hover:text-white/80 dark:hover:bg-white/5"
              onClick={toggleSound}
              title={soundEnabled ? 'Выключить звук' : 'Включить звук'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </Button>

            <Badge
              variant="outline"
              className={`text-xs transition-all duration-300 ${
                socketConnected
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 shadow-sm shadow-emerald-500/20'
                  : 'bg-red-500/20 text-red-400 border-red-500/30'
              }`}
            >
              {socketConnected ? (
                <Wifi className="w-3 h-3 mr-1" />
              ) : (
                <WifiOff className="w-3 h-3 mr-1" />
              )}
              {socketConnected ? 'Live' : 'Offline'}
            </Badge>
            {/* Improvement 2: Always show inbox badge, styled differently when 0 */}
            <motion.div
              key={visiblePosts.length}
              initial={{ scale: 1.3 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 300 }}
            >
              <Badge
                variant="outline"
                className={`text-xs ${
                  visiblePosts.length > 0
                    ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                    : 'bg-white/5 text-white/20 border-white/10'
                }`}
              >
                <Inbox className="w-3 h-3 mr-1" />
                {visiblePosts.length}
              </Badge>
            </motion.div>

            {/* Activity panel toggle (only in moderation tab) */}
            {activeTab === 'moderation' && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-white/40 hover:text-white/80 hover:bg-white/5 relative hidden sm:flex"
                onClick={() => setShowActivityPanel(!showActivityPanel)}
                title={showActivityPanel ? 'Скрыть активность' : 'Показать активность'}
              >
                {showActivityPanel ? <PanelRightClose className="w-4 h-4" /> : <PanelRightOpen className="w-4 h-4" />}
                {activityLog.length > 0 && !showActivityPanel && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full text-[9px] font-bold flex items-center justify-center text-white">
                    {activityLog.length > 9 ? '9+' : activityLog.length}
                  </span>
                )}
              </Button>
            )}
          </div>
        </div>

        {/* Tab navigation */}
        <div className="max-w-7xl mx-auto px-4">
          <nav className="flex gap-0.5 overflow-x-auto pb-0 -mb-px scrollbar-none" role="tablist">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium whitespace-nowrap transition-all duration-200 border-b-2 ${
                    isActive
                      ? 'text-emerald-400 border-emerald-400'
                      : 'text-white/30 border-transparent hover:text-white/50 hover:border-white/10'
                  }`}
                >
                  <Icon className={`w-4 h-4 transition-transform duration-200 ${isActive ? 'scale-110' : ''}`} />
                  <span className="hidden sm:inline">{tab.labelRu}</span>
                  {isActive && (
                    <motion.div
                      layoutId="tab-glow"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-400/50 blur-sm"
                      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    />
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6 relative z-10">
        <AnimatePresence mode="wait">
          {activeTab === 'moderation' && (
            <motion.div
              key="moderation"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <ModerationView
                posts={visiblePosts}
                currentPostIndex={currentPostIndex}
                setCurrentPostIndex={setCurrentPostIndex}
                currentPost={currentPost}
                nextPost={nextPost}
                isLoading={postsLoading}
                onAccept={handleAccept}
                onReject={handleReject}
                onDefer={handleDefer}
                onStartVote={handleStartVote}
                onPostAndPublish={handlePostAndPublish}
                onFinalDecision={handleFinalDecision}
                activeVotes={activeVotes}
                showActivityPanel={showActivityPanel}
              />
            </motion.div>
          )}

          {activeTab === 'channels' && (
            <motion.div key="channels" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
              <ChannelManager />
            </motion.div>
          )}

          {activeTab === 'moderators' && (
            <motion.div key="moderators" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
              <ModeratorManager />
            </motion.div>
          )}

          {activeTab === 'settings' && (
            <motion.div key="settings" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
              <SettingsPanel />
            </motion.div>
          )}

          {activeTab === 'stats' && (
            <motion.div key="stats" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
              <StatsDashboard />
            </motion.div>
          )}

          {activeTab === 'history' && (
            <motion.div key="history" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
              <PostHistory />
            </motion.div>
          )}

          {activeTab === 'overlay' && (
            <motion.div key="overlay" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
              <StreamOverlay />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer — Improvement 1: context-aware opacity for keyboard shortcuts */}
      <footer className="mt-auto border-t border-border bg-muted/40 backdrop-blur-sm py-4">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            StreamPost v1.0 — Система модерации и голосования
          </p>
          <div className={`flex items-center gap-3 ${activeTab === 'moderation' ? 'text-muted-foreground' : 'text-muted-foreground/40'}`}>
            <div className="flex items-center gap-1.5 text-xs">
              <Keyboard className="w-3.5 h-3.5" />
              <span>←→ Навигация</span>
              <span className="mx-1">·</span>
              <span>Enter Принять</span>
              <span className="mx-1">·</span>
              <span>Del Отклонить</span>
              <span className="mx-1">·</span>
              <span>V Голосование</span>
              <span className="mx-1">·</span>
              <span>P Опубликовать</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

// ============ Moderation View ============

interface ModerationViewProps {
  posts: ReturnType<typeof usePendingPosts>['data'] extends { posts: infer P } ? P : never;
  currentPostIndex: number;
  setCurrentPostIndex: (i: number) => void;
  currentPost: (typeof posts)[number] | undefined;
  nextPost: (typeof posts)[number] | undefined;
  isLoading: boolean;
  onAccept: (id: string) => void;
  onReject: (id: string) => void;
  onDefer: (id: string) => void;
  onStartVote: (id: string) => void;
  onPostAndPublish: (id: string) => void;
  onFinalDecision: (id: string, decision: 'POSTED' | 'SKIPPED') => void;
  activeVotes: Map<string, ActiveVote>;
  showActivityPanel: boolean;
}

function ModerationView({
  posts,
  currentPostIndex,
  setCurrentPostIndex,
  currentPost,
  nextPost,
  isLoading,
  onAccept,
  onReject,
  onDefer,
  onStartVote,
  onPostAndPublish,
  onFinalDecision,
  activeVotes,
  showActivityPanel,
}: ModerationViewProps) {
  const activeVote = currentPost ? activeVotes.get(currentPost.id) : undefined;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="relative">
          <div className="animate-spin w-16 h-16 border-2 border-emerald-500/30 rounded-full" />
          <div className="animate-spin w-16 h-16 border-t-emerald-500 border-r-transparent border-b-transparent border-l-transparent rounded-full absolute inset-0" style={{ animationDuration: '0.8s' }} />
          <Zap className="w-6 h-6 text-emerald-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
        </div>
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="flex gap-4 h-full">
        {/* Empty state — centered message */}
        <div className="flex-1 flex flex-col items-center justify-center py-24 text-center">
          <motion.div
            animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.1, 1] }}
            transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
            className="text-7xl mb-6"
          >
            🎉
          </motion.div>
          <h2 className="text-3xl font-black bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent mb-3">
            Всё разобрано!
          </h2>
          <p className="text-white/40 max-w-md">
            Нет постов на модерации. Новые посты из Telegram бота появятся здесь автоматически.
          </p>
        </div>

        {/* Activity Feed Sidebar — visible even when empty */}
        <AnimatePresence>
          {showActivityPanel && (
            <motion.aside
              initial={{ opacity: 0, x: 40, width: 0 }}
              animate={{ opacity: 1, x: 0, width: 300 }}
              exit={{ opacity: 0, x: 40, width: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="hidden sm:flex flex-col border-l border-white/10 bg-black/20 backdrop-blur-sm rounded-xl overflow-hidden flex-shrink-0"
            >
              <ActivityFeed className="h-full" />
            </motion.aside>
          )}
        </AnimatePresence>

        {/* Mobile activity feed */}
        <div className="sm:hidden">
          <MobileActivityFeed />
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-4 h-full">
      {/* Main card area */}
      <div className="flex-1 space-y-4">
        {/* Card counter with progress bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm text-white/40">
              Пост <span className="text-emerald-400 font-bold">{currentPostIndex + 1}</span> из{' '}
              <span className="text-white/60 font-semibold">{posts.length}</span>
            </p>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-white/30 hover:text-white/80 hover:bg-white/5"
                onClick={() => setCurrentPostIndex(Math.max(0, currentPostIndex - 1))}
                disabled={currentPostIndex === 0}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-white/30 hover:text-white/80 hover:bg-white/5"
                onClick={() => setCurrentPostIndex(Math.min(posts.length - 1, currentPostIndex + 1))}
                disabled={currentPostIndex === posts.length - 1}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
          {/* Progress bar */}
          <div className="h-1 bg-white/5 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full"
              animate={{ width: `${((currentPostIndex + 1) / posts.length) * 100}%` }}
              transition={{ type: 'spring', stiffness: 200, damping: 25 }}
            />
          </div>
        </div>

        {/* Card stack */}
        <div className="relative w-full max-w-lg mx-auto" style={{ aspectRatio: '3/4', maxHeight: '60vh' }}>
          {/* Stack background cards */}
          {nextPost && (
            <ModerationCard post={nextPost} isTop={false} />
          )}

          {/* Current card */}
          <AnimatePresence mode="popLayout">
            {currentPost && (
              <motion.div
                key={currentPost.id}
                className="relative w-full h-full"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9, x: 100 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              >
                <ModerationCard
                  post={currentPost}
                  isTop={true}
                  onSwipeLeft={() => onReject(currentPost.id)}
                  onSwipeRight={() => onAccept(currentPost.id)}
                />

                {/* Vote bar overlay */}
                {activeVote && (
                  <VoteBar
                    postId={currentPost.id}
                    activeVote={activeVote}
                    onFinalDecision={(decision) => onFinalDecision(currentPost.id, decision)}
                  />
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Action buttons */}
        <div className="flex items-center justify-center gap-2 pt-2 flex-wrap">
          <Button
            onClick={() => currentPost && onReject(currentPost.id)}
            disabled={!currentPost || !!activeVote}
            className="bg-red-600/90 hover:bg-red-500 text-white px-4 shadow-lg shadow-red-600/20 border border-red-500/30 transition-transform hover:scale-105 active:scale-95"
          >
            <XCircle className="w-4 h-4 mr-1.5" />
            Отклонить
          </Button>

          <Button
            onClick={() => currentPost && onDefer(currentPost.id)}
            disabled={!currentPost || !!activeVote}
            variant="outline"
            className="border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 px-4 transition-transform hover:scale-105 active:scale-95"
          >
            <Clock className="w-4 h-4 mr-1.5" />
            Позже
          </Button>

          <Button
            onClick={() => currentPost && onStartVote(currentPost.id)}
            disabled={!currentPost || !!activeVote}
            className="bg-purple-600/90 hover:bg-purple-500 text-white px-4 shadow-lg shadow-purple-600/20 border border-purple-500/30 transition-transform hover:scale-105 active:scale-95"
          >
            <Dices className="w-4 h-4 mr-1.5" />
            Голосование
          </Button>

          <Button
            onClick={() => currentPost && onAccept(currentPost.id)}
            disabled={!currentPost || !!activeVote}
            className="bg-emerald-600/90 hover:bg-emerald-500 text-white px-4 shadow-lg shadow-emerald-600/20 border border-emerald-500/30 transition-transform hover:scale-105 active:scale-95"
          >
            <CheckCircle2 className="w-4 h-4 mr-1.5" />
            Принять
          </Button>

          <Button
            onClick={() => currentPost && onPostAndPublish(currentPost.id)}
            disabled={!currentPost || !!activeVote}
            className="bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white px-4 shadow-lg shadow-emerald-600/30 border border-emerald-400/30 transition-transform hover:scale-105 active:scale-95"
          >
            <Send className="w-4 h-4 mr-1.5" />
            Опубликовать
          </Button>
        </div>
      </div>

      {/* Activity Feed Sidebar */}
      <AnimatePresence>
        {showActivityPanel && (
          <motion.aside
            initial={{ opacity: 0, x: 40, width: 0 }}
            animate={{ opacity: 1, x: 0, width: 300 }}
            exit={{ opacity: 0, x: 40, width: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="hidden sm:flex flex-col border-l border-white/10 bg-black/20 backdrop-blur-sm rounded-xl overflow-hidden flex-shrink-0"
          >
            <ActivityFeed className="h-full" />
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Mobile activity feed - shown below on mobile */}
      <div className="sm:hidden">
        <MobileActivityFeed />
      </div>
    </div>
  );
}

// ============ Mobile Activity Feed (collapsible) ============

function MobileActivityFeed() {
  const [isOpen, setIsOpen] = useState(false);
  const { activityLog } = useStreamPostStore();

  return (
    <div className="mt-4">
      <Button
        variant="outline"
        size="sm"
        className="w-full border-white/10 bg-white/5 text-white/60 hover:text-white/90 hover:bg-white/10"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="flex items-center gap-2">
          {isOpen ? 'Скрыть активность' : 'Показать активность'}
          {activityLog.length > 0 && (
            <Badge variant="outline" className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[10px] h-5 px-1.5">
              {activityLog.length}
            </Badge>
          )}
        </span>
      </Button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden mt-2"
          >
            <div className="border border-white/10 bg-black/20 backdrop-blur-sm rounded-xl overflow-hidden">
              <ActivityFeed />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ============ Quick Submit FAB (Improvement 3) ============

function QuickSubmitFAB() {
  const [open, setOpen] = useState(false);
  const [postType, setPostType] = useState<'PHOTO' | 'YOUTUBE' | 'TEXT'>('TEXT');
  const [text, setText] = useState('');
  const [authorTelegramId, setAuthorTelegramId] = useState('');
  const createPost = useCreatePost();

  const { data: usersData } = useQuery<{ users: TelegramUser[]; total: number }>({
    queryKey: ['telegram-users'],
    queryFn: async () => {
      const res = await fetch('/api/users/telegram');
      if (!res.ok) throw new Error('Failed to fetch users');
      return res.json();
    },
    enabled: open,
  });

  const users = usersData?.users || [];

  const handleSubmit = useCallback(() => {
    if (!authorTelegramId || !text) return;
    const author = users.find((u) => u.telegramId === authorTelegramId);
    createPost.mutate(
      {
        type: postType,
        text,
        authorTelegramId,
        authorUsername: author?.username || 'test_user',
        authorFirstName: author?.firstName || 'Test',
      },
      {
        onSuccess: () => {
          toast.success('Тестовый пост создан!', { icon: '📝' });
          setOpen(false);
          setText('');
          setAuthorTelegramId('');
        },
        onError: () => {
          toast.error('Не удалось создать пост');
        },
      }
    );
  }, [authorTelegramId, text, postType, users, createPost]);

  return (
    <>
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setOpen(true)}
        className="fixed bottom-20 right-6 z-40 w-12 h-12 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/30 flex items-center justify-center border border-emerald-400/30 hover:shadow-emerald-500/50 transition-shadow"
        title="Быстрое создание поста"
      >
        <Plus className="w-5 h-5" />
      </motion.button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-gray-900 border-white/10 text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">Быстрое создание поста</DialogTitle>
            <DialogDescription className="text-white/40">
              Создайте тестовый пост для проверки модерации
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-white/60 text-xs">Тип поста</Label>
              <Select value={postType} onValueChange={(v) => setPostType(v as 'PHOTO' | 'YOUTUBE' | 'TEXT')}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-900 border-white/10">
                  <SelectItem value="TEXT">📝 Текст</SelectItem>
                  <SelectItem value="PHOTO">📸 Фото</SelectItem>
                  <SelectItem value="YOUTUBE">🎥 YouTube</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-white/60 text-xs">Текст поста</Label>
              <Input
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Введите текст поста..."
                className="bg-white/5 border-white/10 text-white placeholder:text-white/20"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-white/60 text-xs">Автор</Label>
              <Select value={authorTelegramId} onValueChange={setAuthorTelegramId}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white w-full">
                  <SelectValue placeholder="Выберите автора" />
                </SelectTrigger>
                <SelectContent className="bg-gray-900 border-white/10">
                  {users.map((user) => (
                    <SelectItem key={user.telegramId} value={user.telegramId}>
                      @{user.username || user.firstName || user.telegramId}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              className="border-white/10 text-white/60 hover:text-white hover:bg-white/5"
            >
              Отмена
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!text || !authorTelegramId || createPost.isPending}
              className="bg-emerald-600 hover:bg-emerald-500 text-white"
            >
              {createPost.isPending ? 'Создание...' : 'Создать'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ============ Root Page with Providers ============

export default function Home() {
  return (
    <QueryClientProvider client={queryClient}>
      <StreamPostApp />
    </QueryClientProvider>
  );
}
