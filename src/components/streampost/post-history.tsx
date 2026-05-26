'use client';

import { useState, useCallback } from 'react';
import { usePosts, useUpdatePost } from '@/lib/streampost-hooks';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  ImageIcon,
  Youtube,
  FileText,
  CheckCircle2,
  XCircle,
  Clock,
  Send,
  Eye,
  Radio,
  Search,
  CheckSquare,
  Square,
  RotateCcw,
  X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import type { Post } from '@/lib/streampost-store';

const STATUS_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  PENDING: { label: 'Ожидает', icon: Clock, color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
  APPROVED: { label: 'Принят', icon: CheckCircle2, color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
  REJECTED: { label: 'Отклонён', icon: XCircle, color: 'bg-red-500/20 text-red-400 border-red-500/30' },
  POSTED: { label: 'Опубликован', icon: Send, color: 'bg-teal-500/20 text-teal-400 border-teal-500/30' },
  DEFERRED: { label: 'Отложен', icon: Clock, color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
};

const TYPE_CONFIG: Record<string, { icon: React.ElementType; color: string; borderColor: string }> = {
  PHOTO: { icon: ImageIcon, color: 'text-emerald-400', borderColor: 'border-l-emerald-400' },
  YOUTUBE: { icon: Youtube, color: 'text-red-400', borderColor: 'border-l-red-400' },
  TEXT: { icon: FileText, color: 'text-amber-400', borderColor: 'border-l-amber-400' },
};

function formatTimeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'только что';
  if (mins < 60) return `${mins} мин. назад`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} ч. назад`;
  return `${Math.floor(hours / 24)} дн. назад`;
}

function PostRow({ post, onClick, selected, onToggleSelect }: { post: Post; onClick: () => void; selected: boolean; onToggleSelect: () => void }) {
  const statusCfg = STATUS_CONFIG[post.status] || STATUS_CONFIG.PENDING;
  const typeCfg = TYPE_CONFIG[post.type] || TYPE_CONFIG.TEXT;
  const StatusIcon = statusCfg.icon;
  const TypeIcon = typeCfg.icon;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -5 }}
      onClick={onClick}
      className={`group rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.06] backdrop-blur-sm p-4 flex items-center gap-4 cursor-pointer transition-all duration-200 hover:border-white/10 hover:scale-[1.01] border-l-4 ${typeCfg.borderColor}`}
    >
      {/* Checkbox */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggleSelect();
        }}
        className="flex-shrink-0 text-white/30 hover:text-emerald-400 transition-colors"
        aria-label={selected ? 'Снять выделение' : 'Выбрать'}
      >
        {selected ? (
          <CheckSquare className="w-4 h-4 text-emerald-400" />
        ) : (
          <Square className="w-4 h-4" />
        )}
      </button>

      {/* Type icon */}
      <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0">
        <TypeIcon className={`w-5 h-5 ${typeCfg.color}`} />
      </div>

      {/* Content preview */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <p className="text-sm font-medium text-white/80 truncate">
            {post.type === 'YOUTUBE' && post.youtubeTitle
              ? post.youtubeTitle
              : post.text
                ? post.text.slice(0, 60) + (post.text.length > 60 ? '...' : '')
                : post.type === 'PHOTO' ? 'Фото' : 'Текстовый пост'}
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-white/30">
          <span>@{post.author?.username || 'anon'}</span>
          <span>·</span>
          <span>{formatTimeAgo(post.createdAt)}</span>
          {post.channel && (
            <>
              <span>·</span>
              <span className="flex items-center gap-1">
                <Radio className="w-3 h-3" />
                {post.channel.name}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Status badge */}
      <Badge variant="outline" className={`${statusCfg.color} text-xs flex-shrink-0`}>
        <StatusIcon className="w-3 h-3 mr-1" />
        {statusCfg.label}
      </Badge>
    </motion.div>
  );
}

function PostDetail({ post, onClose }: { post: Post; onClose: () => void }) {
  const statusCfg = STATUS_CONFIG[post.status] || STATUS_CONFIG.PENDING;
  const typeCfg = TYPE_CONFIG[post.type] || TYPE_CONFIG.TEXT;
  const TypeIcon = typeCfg.icon;
  const updatePost = useUpdatePost();

  const handleStatusChange = useCallback(
    (newStatus: string, label: string) => {
      updatePost.mutate(
        { id: post.id, status: newStatus },
        {
          onSuccess: () => {
            toast.success(`Статус изменён: ${label}`);
            onClose();
          },
          onError: () => {
            toast.error('Не удалось изменить статус');
          },
        }
      );
    },
    [updatePost, post.id, onClose]
  );

  // Action buttons based on current status
  const renderActionButtons = () => {
    switch (post.status) {
      case 'PENDING':
        return (
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => handleStatusChange('APPROVED', 'Принят')}
              className="bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white flex-1"
              disabled={updatePost.isPending}
            >
              <CheckCircle2 className="w-4 h-4 mr-1.5" />
              Принять
            </Button>
            <Button
              onClick={() => handleStatusChange('REJECTED', 'Отклонён')}
              className="bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white flex-1"
              disabled={updatePost.isPending}
            >
              <XCircle className="w-4 h-4 mr-1.5" />
              Отклонить
            </Button>
            <Button
              onClick={() => handleStatusChange('POSTED', 'Опубликован')}
              className="bg-gradient-to-r from-teal-600 to-teal-500 hover:from-teal-500 hover:to-teal-400 text-white flex-1"
              disabled={updatePost.isPending}
            >
              <Send className="w-4 h-4 mr-1.5" />
              Опубликовать
            </Button>
          </div>
        );
      case 'APPROVED':
        return (
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => handleStatusChange('POSTED', 'Опубликован')}
              className="bg-gradient-to-r from-teal-600 to-teal-500 hover:from-teal-500 hover:to-teal-400 text-white flex-1"
              disabled={updatePost.isPending}
            >
              <Send className="w-4 h-4 mr-1.5" />
              Опубликовать
            </Button>
            <Button
              onClick={() => handleStatusChange('REJECTED', 'Отклонён')}
              className="bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white flex-1"
              disabled={updatePost.isPending}
            >
              <XCircle className="w-4 h-4 mr-1.5" />
              Отклонить
            </Button>
          </div>
        );
      case 'REJECTED':
      case 'DEFERRED':
        return (
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => handleStatusChange('PENDING', 'На модерации')}
              className="bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white flex-1"
              disabled={updatePost.isPending}
            >
              <RotateCcw className="w-4 h-4 mr-1.5" />
              Вернуть на модерацию
            </Button>
          </div>
        );
      case 'POSTED':
        return (
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => handleStatusChange('APPROVED', 'Принят')}
              className="bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white flex-1"
              disabled={updatePost.isPending}
            >
              <RotateCcw className="w-4 h-4 mr-1.5" />
              Вернуть
            </Button>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="bg-gray-900 border border-white/10 rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-white/10 bg-white/5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-sm font-bold">
              {post.author?.username?.charAt(0).toUpperCase() || '?'}
            </div>
            <div>
              <p className="text-sm font-semibold text-white/90">@{post.author?.username || 'anonymous'}</p>
              <p className="text-xs text-white/40">{new Date(post.createdAt).toLocaleString('ru-RU')}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={`${typeCfg.color}/20 text-white/60 border-white/10 text-xs`}>
              <TypeIcon className="w-3 h-3 mr-1" />
              {post.type === 'PHOTO' ? 'ФОТО' : post.type === 'YOUTUBE' ? 'YOUTUBE' : 'ТЕКСТ'}
            </Badge>
            <Badge variant="outline" className={`${statusCfg.color} text-xs`}>
              {statusCfg.label}
            </Badge>
          </div>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 max-h-96 overflow-y-auto">
          {post.type === 'PHOTO' && post.mediaUrl && (
            <img src={post.mediaUrl} alt="Post photo" className="w-full rounded-lg border border-white/5" />
          )}
          {post.type === 'YOUTUBE' && post.youtubeThumbnail && (
            <div className="relative rounded-lg overflow-hidden">
              <img src={post.youtubeThumbnail} alt={post.youtubeTitle || 'YouTube'} className="w-full" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-12 h-12 rounded-full bg-red-600/80 flex items-center justify-center">
                  <Youtube className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>
          )}
          {post.youtubeTitle && (
            <p className="text-white/80 font-medium">{post.youtubeTitle}</p>
          )}
          {post.text && (
            <p className="text-white/70 text-sm leading-relaxed">{post.text}</p>
          )}
          {post.channel && (
            <div className="flex items-center gap-2 text-xs text-white/40">
              <Radio className="w-3.5 h-3.5" />
              <span>Канал: {post.channel.name}</span>
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="px-5 py-3 border-t border-white/10 bg-white/5">
          {renderActionButtons()}
        </div>

        {/* Close button */}
        <div className="px-5 py-3 border-t border-white/10 bg-white/[0.03]">
          <Button onClick={onClose} variant="ghost" className="w-full text-white/50 hover:text-white/80">
            Закрыть
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export function PostHistory() {
  const [filter, setFilter] = useState<string>('all');
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const updatePost = useUpdatePost();

  const statusParam = filter === 'all' ? undefined : filter;
  const { data, isLoading } = usePosts(statusParam);
  const posts = data?.posts || [];

  // Filter posts by search query
  const filteredPosts = posts.filter((post) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (post.text && post.text.toLowerCase().includes(q)) ||
      (post.author?.username && post.author.username.toLowerCase().includes(q)) ||
      (post.channel?.name && post.channel.name.toLowerCase().includes(q)) ||
      (post.youtubeTitle && post.youtubeTitle.toLowerCase().includes(q))
    );
  });

  const filters = [
    { id: 'all', label: 'Все' },
    { id: 'PENDING', label: 'Ожидает' },
    { id: 'APPROVED', label: 'Принят' },
    { id: 'POSTED', label: 'Опубликован' },
    { id: 'REJECTED', label: 'Отклонён' },
    { id: 'DEFERRED', label: 'Отложен' },
  ];

  // Selection management
  const toggleSelect = (postId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(postId)) {
        next.delete(postId);
      } else {
        next.add(postId);
      }
      return next;
    });
  };

  const selectAll = () => {
    setSelectedIds(new Set(filteredPosts.map((p) => p.id)));
  };

  const deselectAll = () => {
    setSelectedIds(new Set());
  };

  const allSelected = filteredPosts.length > 0 && selectedIds.size === filteredPosts.length;

  // Batch operations
  const handleBatchAction = (status: string, label: string) => {
    const ids = Array.from(selectedIds);
    let successCount = 0;
    ids.forEach((id) => {
      updatePost.mutate(
        { id, status },
        {
          onSuccess: () => {
            successCount++;
            if (successCount === ids.length) {
              toast.success(`${label}: ${ids.length} постов`);
              setSelectedIds(new Set());
            }
          },
        }
      );
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4 relative pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-white/80">История постов</h3>
        <Badge variant="outline" className="text-white/30 border-white/10 text-xs">
          {searchQuery.trim() ? `${filteredPosts.length} из ${data?.total || 0}` : (data?.total || 0)} записей
        </Badge>
      </div>

      {/* Search input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
        <input
          type="text"
          placeholder="Поиск по тексту, автору или каналу..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white/80 placeholder:text-white/25 focus:outline-none focus:border-emerald-500/40 focus:bg-white/[0.07] transition-all duration-200"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Filter tabs + Select all toggle */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex gap-1.5 flex-wrap flex-1">
          {filters.map((f) => (
            <button
              key={f.id}
              onClick={() => { setFilter(f.id); setSelectedIds(new Set()); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                filter === f.id
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-white/5 text-white/40 border border-white/5 hover:bg-white/10 hover:text-white/60'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        {filteredPosts.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-white/40 hover:text-white/70 h-7 px-2"
            onClick={allSelected ? deselectAll : selectAll}
          >
            {allSelected ? 'Снять выделение' : 'Выбрать все'}
          </Button>
        )}
      </div>

      {/* Posts list */}
      <div className="space-y-2 max-h-[calc(100vh-380px)] overflow-y-auto pr-1">
        <AnimatePresence>
          {filteredPosts.length > 0 ? (
            filteredPosts.map((post) => (
              <PostRow
                key={post.id}
                post={post}
                onClick={() => setSelectedPost(post)}
                selected={selectedIds.has(post.id)}
                onToggleSelect={() => toggleSelect(post.id)}
              />
            ))
          ) : (
            <div className="text-center py-16 text-white/20">
              <Eye className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>{searchQuery ? 'Ничего не найдено' : 'Нет постов с таким статусом'}</p>
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* Post detail modal */}
      <AnimatePresence>
        {selectedPost && (
          <PostDetail post={selectedPost} onClose={() => setSelectedPost(null)} />
        )}
      </AnimatePresence>

      {/* Batch action bar */}
      <AnimatePresence>
        {selectedIds.size > 0 && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed bottom-0 left-0 right-0 z-40 bg-gray-900/95 backdrop-blur-xl border-t border-white/10 shadow-2xl shadow-black/50"
          >
            <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-xs">
                  Выбрано: {selectedIds.size}
                </Badge>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  size="sm"
                  onClick={() => handleBatchAction('APPROVED', 'Приняты')}
                  className="bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white text-xs h-8"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                  Принять все
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleBatchAction('REJECTED', 'Отклонены')}
                  className="bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white text-xs h-8"
                >
                  <XCircle className="w-3.5 h-3.5 mr-1" />
                  Отклонить все
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleBatchAction('POSTED', 'Опубликованы')}
                  className="bg-gradient-to-r from-teal-600 to-teal-500 hover:from-teal-500 hover:to-teal-400 text-white text-xs h-8"
                >
                  <Send className="w-3.5 h-3.5 mr-1" />
                  Опубликовать все
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={deselectAll}
                  className="text-white/40 hover:text-white/80 text-xs h-8"
                >
                  Отмена
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
