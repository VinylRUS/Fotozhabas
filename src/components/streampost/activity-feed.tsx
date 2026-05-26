'use client';

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, CheckCircle2, XCircle, Clock, Dices, Send, Trophy } from 'lucide-react';
import { useStreamPostStore, type ActivityItem } from '@/lib/streampost-store';

const activityConfig: Record<ActivityItem['type'], { icon: React.ElementType; color: string; bg: string }> = {
  accept: { icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
  reject: { icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' },
  defer: { icon: Clock, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
  vote_start: { icon: Dices, color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20' },
  publish: { icon: Send, color: 'text-teal-400', bg: 'bg-teal-500/10 border-teal-500/20' },
  vote_end: { icon: Trophy, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
};

function formatTimeAgo(timestamp: number) {
  const diff = Date.now() - timestamp;
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return 'только что';
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins} мин. назад`;
  const hours = Math.floor(mins / 60);
  return `${hours} ч. назад`;
}

interface ActivityFeedProps {
  className?: string;
}

export function ActivityFeed({ className }: ActivityFeedProps) {
  const { activityLog, clearOldActivities } = useStreamPostStore();

  // Clean up old activities every 60 seconds
  useEffect(() => {
    clearOldActivities();
    const interval = setInterval(() => {
      clearOldActivities();
    }, 60000);
    return () => clearInterval(interval);
  }, [clearOldActivities]);

  return (
    <div className={`flex flex-col h-full ${className || ''}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-emerald-400" />
          <h3 className="text-sm font-bold text-white/80">Активность</h3>
        </div>
        {activityLog.length > 0 && (
          <span className="text-[10px] text-white/30 bg-white/5 px-2 py-0.5 rounded-full">
            {activityLog.length}
          </span>
        )}
      </div>

      {/* Activity list */}
      <div className="flex-1 overflow-y-auto max-h-[60vh] sm:max-h-none p-2 space-y-1 scrollbar-thin">
        <AnimatePresence initial={false}>
          {activityLog.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-12 text-center"
            >
              <Activity className="w-10 h-10 text-white/10 mb-3" />
              <p className="text-white/25 text-sm">Нет действий</p>
              <p className="text-white/15 text-xs mt-1">Действия модерации появятся здесь</p>
            </motion.div>
          ) : (
            activityLog.map((item) => {
              const config = activityConfig[item.type];
              const Icon = config.icon;
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: 40, scale: 0.95 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: -40, scale: 0.95 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  className={`flex items-start gap-2.5 px-3 py-2.5 rounded-lg border ${config.bg} backdrop-blur-sm hover:bg-white/[0.03] transition-colors duration-150 cursor-default group`}
                >
                  <div className={`mt-0.5 flex-shrink-0 ${config.color}`}>
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-white/70 leading-relaxed group-hover:text-white/90 transition-colors">
                      {item.message}
                    </p>
                    <p className="text-[10px] text-white/25 mt-0.5">
                      {formatTimeAgo(item.timestamp)}
                    </p>
                  </div>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
