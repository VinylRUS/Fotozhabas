'use client';

import { useState, useCallback } from 'react';
import { motion, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { ImageIcon, Youtube, FileText, Clock, User, MessageSquare, Radio } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { Post } from '@/lib/streampost-store';

interface ModerationCardProps {
  post: Post;
  isTop: boolean;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
}

const typeConfig = {
  PHOTO: { icon: ImageIcon, label: 'ФОТО', emoji: '📸', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
  YOUTUBE: { icon: Youtube, label: 'YOUTUBE', emoji: '🎥', color: 'bg-red-500/20 text-red-400 border-red-500/30' },
  TEXT: { icon: FileText, label: 'ТЕКСТ', emoji: '📝', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
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

const SWIPE_THRESHOLD = 100;

export function ModerationCard({ post, isTop, onSwipeLeft, onSwipeRight }: ModerationCardProps) {
  const config = typeConfig[post.type];
  const TypeIcon = config.icon;

  const x = useMotionValue(0);
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);

  // Derived values for visual feedback
  const rotate = useTransform(x, [-300, 0, 300], [-15, 0, 15]);
  const acceptOpacity = useTransform(x, [0, SWIPE_THRESHOLD], [0, 1]);
  const rejectOpacity = useTransform(x, [-SWIPE_THRESHOLD, 0], [1, 0]);
  const acceptGlow = useTransform(x, [0, SWIPE_THRESHOLD], [0, 0.4]);
  const rejectGlow = useTransform(x, [-SWIPE_THRESHOLD, 0], [0.4, 0]);
  const acceptBoxShadow = useTransform(acceptGlow, (v) => `0 0 40px 10px rgba(16, 185, 129, ${v}), inset 0 0 40px 5px rgba(16, 185, 129, ${v * 0.3})`);
  const rejectBoxShadow = useTransform(rejectGlow, (v) => `0 0 40px 10px rgba(239, 68, 68, ${v}), inset 0 0 40px 5px rgba(239, 68, 68, ${v * 0.3})`);

  const handleDragEnd = useCallback(
    (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      const offset = info.offset.x;
      const velocity = info.velocity.x;

      // Consider velocity for quick flicks
      const isSwipeRight = offset > SWIPE_THRESHOLD || (velocity > 500 && offset > 50);
      const isSwipeLeft = offset < -SWIPE_THRESHOLD || (velocity < -500 && offset < -50);

      if (isSwipeRight) {
        setSwipeDirection('right');
        setTimeout(() => onSwipeRight?.(), 350);
      } else if (isSwipeLeft) {
        setSwipeDirection('left');
        setTimeout(() => onSwipeLeft?.(), 350);
      }
      // If neither threshold was met, framer-motion will spring back automatically
    },
    [onSwipeLeft, onSwipeRight]
  );

  if (!isTop) {
    // Background card — no interactivity
    return (
      <div className="absolute inset-0 scale-[0.96] translate-y-2 opacity-40 rounded-2xl overflow-hidden">
        <div className="h-full w-full rounded-2xl overflow-hidden border border-white/10 bg-gray-900/80 backdrop-blur-xl shadow-2xl shadow-black/40 flex flex-col">
          <div className="flex-1 flex items-center justify-center">
            <p className="text-white/10 text-sm">Следующий пост</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      className="absolute inset-0"
      style={{ x: swipeDirection ? undefined : x, rotate: swipeDirection ? undefined : rotate, zIndex: isTop ? 10 : 1 }}
      drag={isTop && !swipeDirection ? 'x' : false}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.9}
      onDragEnd={handleDragEnd}
      whileDrag={{ cursor: 'grabbing' }}
      initial={{ scale: 1, opacity: 1, x: 0 }}
      animate={
        swipeDirection === 'right'
          ? { x: 600, opacity: 0, rotate: 20, scale: 0.9 }
          : swipeDirection === 'left'
            ? { x: -600, opacity: 0, rotate: -20, scale: 0.9 }
            : { scale: 1, opacity: 1 }
      }
      exit={{ opacity: 0, scale: 0.9, x: 100 }}
      transition={swipeDirection ? { type: 'spring', stiffness: 100, damping: 20 } : { type: 'spring', stiffness: 300, damping: 30 }}
    >
      {/* Accept stamp (dragging right) */}
      <motion.div
        className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none"
        style={{ opacity: acceptOpacity }}
      >
        <div className="text-center">
          <span className="text-5xl sm:text-6xl font-black text-emerald-400/80 select-none drop-shadow-lg" style={{ transform: 'rotate(-15deg)', textShadow: '0 0 40px rgba(16, 185, 129, 0.5)' }}>
            ПРИНЯТЬ ✅
          </span>
        </div>
      </motion.div>

      {/* Reject stamp (dragging left) */}
      <motion.div
        className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none"
        style={{ opacity: rejectOpacity }}
      >
        <div className="text-center">
          <span className="text-5xl sm:text-6xl font-black text-red-400/80 select-none drop-shadow-lg" style={{ transform: 'rotate(15deg)', textShadow: '0 0 40px rgba(239, 68, 68, 0.5)' }}>
            ОТКЛОНИТЬ ❌
          </span>
        </div>
      </motion.div>

      {/* Green glow border (dragging right) */}
      <motion.div
        className="absolute -inset-1 rounded-3xl pointer-events-none z-0"
        style={{ boxShadow: acceptBoxShadow }}
      />

      {/* Red glow border (dragging left) */}
      <motion.div
        className="absolute -inset-1 rounded-3xl pointer-events-none z-0"
        style={{ boxShadow: rejectBoxShadow }}
      />

      {/* Card content */}
      <div className="relative z-10 h-full w-full rounded-2xl overflow-hidden border border-white/10 bg-gray-900/80 backdrop-blur-xl shadow-2xl shadow-black/40 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-white/10 bg-gradient-to-r from-white/[0.06] to-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-rose-500 flex items-center justify-center text-white text-sm font-bold shadow-lg shadow-purple-500/20 ring-2 ring-white/10">
              {post.author.username?.charAt(0).toUpperCase() || <User className="w-4 h-4" />}
            </div>
            <div>
              <p className="text-sm font-bold text-white/90">@{post.author.username || 'anonymous'}</p>
              <p className="text-xs text-white/40 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatTimeAgo(post.createdAt)}
              </p>
            </div>
          </div>
          <Badge variant="outline" className={`${config.color} text-xs font-bold px-3`}>
            <TypeIcon className="w-3 h-3 mr-1" />
            {config.label}
          </Badge>
        </div>

        {/* Content */}
        <div className="flex-1 relative overflow-hidden">
          {post.type === 'PHOTO' && (
            <div className="absolute inset-0">
              {post.mediaUrl ? (
                <>
                  <div
                    className="absolute inset-0 bg-cover bg-center blur-2xl scale-125"
                    style={{ backgroundImage: `url(${post.mediaUrl})` }}
                  />
                  <div className="absolute inset-0 bg-black/50" />
                  <div className="absolute inset-0 flex items-center justify-center p-6">
                    <motion.img
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.2, duration: 0.4 }}
                      src={post.mediaUrl}
                      alt="Submitted photo content"
                      className="max-h-full max-w-full object-contain rounded-xl shadow-2xl ring-1 ring-white/10"
                    />
                  </div>
                </>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-emerald-900/30 to-teal-900/30">
                  <div className="text-center">
                    <ImageIcon className="w-20 h-20 text-emerald-500/30 mx-auto mb-3" />
                    <p className="text-white/30 text-sm">Фото (файл в Telegram)</p>
                  </div>
                </div>
              )}
              {post.text && (
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-6">
                  <div className="flex items-start gap-2">
                    <MessageSquare className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                    <p className="text-white/90 text-sm leading-relaxed">{post.text}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {post.type === 'YOUTUBE' && (
            <div className="absolute inset-0 bg-gradient-to-br from-red-950/30 to-rose-950/30 flex flex-col">
              <div className="flex-1 relative flex items-center justify-center">
                {post.youtubeThumbnail ? (
                  <div className="relative w-full h-full">
                    <img
                      src={post.youtubeThumbnail}
                      alt={post.youtubeTitle || 'YouTube video'}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-18 h-18 rounded-full bg-red-600/90 flex items-center justify-center shadow-2xl shadow-red-600/40 backdrop-blur-sm border-2 border-white/20" style={{ width: '72px', height: '72px' }}>
                        <Youtube className="w-9 h-9 text-white ml-0.5" />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center">
                    <Youtube className="w-24 h-24 text-red-500/30 mx-auto mb-4" />
                    <p className="text-white/30 text-sm">YouTube видео</p>
                  </div>
                )}
              </div>
              {post.youtubeTitle && (
                <div className="px-5 py-4 bg-black/50 backdrop-blur-sm border-t border-white/10">
                  <p className="text-white/90 text-sm font-medium line-clamp-2">{post.youtubeTitle}</p>
                  {post.youtubeUrl && (
                    <p className="text-red-400/50 text-xs mt-1 truncate">{post.youtubeUrl}</p>
                  )}
                </div>
              )}
            </div>
          )}

          {post.type === 'TEXT' && (
            <div className="absolute inset-0 bg-gradient-to-br from-amber-950/20 via-orange-950/10 to-yellow-950/20 flex items-center justify-center p-8">
              <div className="max-w-lg text-center space-y-5">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center border border-amber-500/10">
                  <FileText className="w-8 h-8 text-amber-400/50" />
                </div>
                <p className="text-white/85 text-xl leading-relaxed font-medium tracking-wide">
                  &ldquo;{post.text || 'Пустой пост'}&rdquo;
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer - channel info */}
        {post.channel && (
          <div className="px-5 py-2.5 border-t border-white/10 bg-white/[0.03]">
            <div className="flex items-center justify-between">
              <p className="text-xs text-white/30 flex items-center gap-1.5">
                <Radio className="w-3 h-3" />
                <span className="text-white/50">{post.channel.name}</span>
                {post.channel.isDefault && <span className="text-emerald-400/50 ml-1">(по умолчанию)</span>}
              </p>
              <p className="text-[10px] text-white/20">ID: {post.id.slice(-6)}</p>
            </div>
          </div>
        )}
      </div>

      {/* Swipe hint */}
      <div className="absolute bottom-16 left-0 right-0 flex justify-center z-30 pointer-events-none">
        <motion.div
          animate={{ x: [0, 10, 0, -10, 0] }}
          transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
          className="text-white/15 text-xs bg-black/30 backdrop-blur-sm px-3 py-1.5 rounded-full border border-white/5"
        >
          ← Свайпните для действий →
        </motion.div>
      </div>
    </motion.div>
  );
}
