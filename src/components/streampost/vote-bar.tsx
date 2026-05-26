'use client';

import { motion } from 'framer-motion';
import { useStreamPostStore, type ActiveVote } from '@/lib/streampost-store';
import { useEffect, useState } from 'react';

interface VoteBarProps {
  postId: string;
  activeVote: ActiveVote;
  onFinalDecision: (decision: 'POSTED' | 'SKIPPED') => void;
}

export function VoteBar({ postId, activeVote, onFinalDecision }: VoteBarProps) {
  const { voteResults, removeVoteResult } = useStreamPostStore();
  const [timeLeft, setTimeLeft] = useState(activeVote.timeRemaining);
  const result = voteResults.get(postId);

  const totalVotes = activeVote.votesFor + activeVote.votesAgainst;
  const forPercent = totalVotes > 0 ? Math.round((activeVote.votesFor / totalVotes) * 100) : 50;
  const againstPercent = 100 - forPercent;

  // Countdown timer
  useEffect(() => {
    if (result) return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [result]);

  // Auto-cleanup result after 4s
  useEffect(() => {
    if (!result) return;
    const timer = setTimeout(() => removeVoteResult(postId), 4000);
    return () => clearTimeout(timer);
  }, [result, postId, removeVoteResult]);

  // Result overlay
  if (result) {
    const chatWon = (result.decision === 'POSTED' && result.forPercent > result.againstPercent) ||
                    (result.decision === 'SKIPPED' && result.againstPercent > result.forPercent);
    const streamerFollowed = (result.decision === 'POSTED' && activeVote.votesFor >= activeVote.votesAgainst) ||
                             (result.decision === 'SKIPPED' && activeVote.votesAgainst > activeVote.votesFor);

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md rounded-2xl"
      >
        <motion.div
          initial={{ scale: 0, rotate: -10 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.1 }}
          className="text-center"
        >
          {result.decision === 'POSTED' ? (
            <>
              <motion.div
                animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.3, 1] }}
                transition={{ repeat: Infinity, duration: 0.6, repeatDelay: 0.3 }}
                className="text-7xl mb-4"
              >
                🎉
              </motion.div>
              <h3 className="text-4xl font-black bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent mb-2">
                ЧАТ РЕШИЛ!
              </h3>
              <p className="text-white/50 text-lg">Пост будет опубликован</p>
            </>
          ) : (
            <>
              <motion.div
                animate={{ y: [0, -8, 0] }}
                transition={{ repeat: Infinity, duration: 0.8 }}
                className="text-7xl mb-4"
              >
                💀
              </motion.div>
              <h3 className="text-4xl font-black bg-gradient-to-r from-red-400 to-rose-300 bg-clip-text text-transparent mb-2">
                МЕЧТА ЧАТА УБИТА
              </h3>
              <p className="text-white/50 text-lg">Стример пошёл против чата!</p>
            </>
          )}
          <div className="mt-5 flex gap-8 justify-center text-sm">
            <div className="text-center">
              <p className="text-2xl font-bold text-emerald-400">{result.forPercent}%</p>
              <p className="text-white/30 text-xs">ЗА</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-red-400">{result.againstPercent}%</p>
              <p className="text-white/30 text-xs">ПРОТИВ</p>
            </div>
          </div>
        </motion.div>
      </motion.div>
    );
  }

  // Active vote bar
  const isUrgent = timeLeft <= 5;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 30 }}
      className="absolute bottom-0 left-0 right-0 z-40 p-4"
    >
      <div className="rounded-xl border border-purple-500/20 bg-black/80 backdrop-blur-xl p-4 space-y-3 shadow-2xl shadow-purple-500/10">
        {/* Timer + Voters + Status */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <motion.div
              animate={{ scale: isUrgent ? [1, 1.2, 1] : 1 }}
              transition={{ repeat: isUrgent ? Infinity : 0, duration: 0.5 }}
              className={`px-3 py-1 rounded-full font-bold text-lg transition-colors duration-300 ${
                isUrgent
                  ? 'bg-red-500/30 text-red-400 border border-red-500/50 shadow-lg shadow-red-500/20'
                  : 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
              }`}
            >
              0:{timeLeft.toString().padStart(2, '0')}
            </motion.div>
            <span className="text-purple-400/60 text-xs font-medium uppercase tracking-wider">
              Голосование
            </span>
          </div>
          <div className="text-white/40 text-xs">
            <span className="text-white/70 font-bold">{activeVote.totalVoters}</span> голосов
          </div>
        </div>

        {/* Vote Bar - THE HERO */}
        <div className="relative h-14 rounded-xl overflow-hidden bg-white/5 border border-white/10">
          {totalVotes === 0 ? (
            /* Neutral state when no votes yet */
            <div className="absolute inset-0 bg-gradient-to-r from-white/[0.03] to-white/[0.01] flex items-center justify-center">
              <span className="text-white/30 text-sm font-medium">Ожидание голосов...</span>
            </div>
          ) : (
            <>
              {/* FOR section */}
              <motion.div
                className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-emerald-700 via-emerald-500 to-emerald-400"
                initial={{ width: '50%' }}
                animate={{ width: `${forPercent}%` }}
                transition={{ type: 'spring', stiffness: 80, damping: 20 }}
                style={{ minWidth: '10%' }}
              >
                {/* Animated shimmer */}
                <div className="absolute inset-0 overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent animate-[shimmer_2s_infinite_linear]" />
                </div>
                {/* Glow effect */}
                <div className="absolute right-0 top-0 bottom-0 w-4 bg-gradient-to-l from-white/20 to-transparent" />
              </motion.div>

              {/* AGAINST section */}
              <motion.div
                className="absolute right-0 top-0 bottom-0 bg-gradient-to-l from-red-700 via-red-500 to-red-400"
                initial={{ width: '50%' }}
                animate={{ width: `${againstPercent}%` }}
                transition={{ type: 'spring', stiffness: 80, damping: 20 }}
                style={{ minWidth: '10%' }}
              >
                <div className="absolute inset-0 overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-l from-transparent via-white/15 to-transparent animate-[shimmer_2s_infinite_linear]" />
                </div>
                <div className="absolute left-0 top-0 bottom-0 w-4 bg-gradient-to-r from-white/20 to-transparent" />
              </motion.div>

              {/* Labels */}
              <div className="absolute inset-0 flex items-center justify-between px-4 z-10">
                <span className="text-white font-black text-sm drop-shadow-lg flex items-center gap-1.5">
                  ✅ {forPercent}%
                </span>
                <span className="text-white font-black text-sm drop-shadow-lg flex items-center gap-1.5">
                  {againstPercent}% ❌
                </span>
              </div>

              {/* Center divider glow */}
              <motion.div
                className="absolute top-0 bottom-0 w-1 bg-white/80 z-10 rounded-full"
                animate={{ left: `${forPercent}%`, marginLeft: '-2px' }}
                transition={{ type: 'spring', stiffness: 80, damping: 20 }}
              >
                <div className="absolute -top-1.5 -left-1.5 w-4 h-4 rounded-full bg-white shadow-lg shadow-white/60" />
                <div className="absolute -bottom-1.5 -left-1.5 w-4 h-4 rounded-full bg-white shadow-lg shadow-white/60" />
              </motion.div>
            </>
          )}
        </div>

        {/* Vote counts */}
        <div className="flex justify-between text-xs text-white/40">
          <span className="text-emerald-400/60">{activeVote.votesFor} ЗА</span>
          <span className="text-red-400/60">{activeVote.votesAgainst} ПРОТИВ</span>
        </div>

        {/* Action buttons - always visible */}
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex gap-3"
        >
          <button
            onClick={() => onFinalDecision('POSTED')}
            className="flex-1 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold transition-all duration-200 text-sm shadow-lg shadow-emerald-600/20 border border-emerald-500/30 active:scale-95"
          >
            ✅ Опубликовать
          </button>
          <button
            onClick={() => onFinalDecision('SKIPPED')}
            className="flex-1 py-3 rounded-xl bg-gradient-to-r from-red-600 to-rose-500 hover:from-red-500 hover:to-rose-400 text-white font-bold transition-all duration-200 text-sm shadow-lg shadow-red-600/20 border border-red-500/30 active:scale-95"
          >
            ❌ Пропустить
          </button>
        </motion.div>
      </div>

      <style jsx>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
      `}</style>
    </motion.div>
  );
}
