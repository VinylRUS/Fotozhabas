'use client';

import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { motion, AnimatePresence } from 'framer-motion';

interface VoteData {
  sessionId: string;
  postId: string;
  durationSec: number;
  votesFor: number;
  votesAgainst: number;
  totalVoters: number;
  timeRemaining: number;
}

type OverlayState = 'idle' | 'voting' | 'result';

export default function OverlayPage() {
  const [state, setState] = useState<OverlayState>('idle');
  const [voteData, setVoteData] = useState<VoteData | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [chatWon, setChatWon] = useState(true);
  const [forPercent, setForPercent] = useState(50);
  const [againstPercent, setAgainstPercent] = useState(50);

  useEffect(() => {
    const socket: Socket = io('/?XTransformPort=3003', { transports: ['websocket', 'polling'] });

    socket.on('vote:start', (data: VoteData) => {
      setState('voting');
      setVoteData(data);
      setTimeLeft(data.durationSec);
    });

    socket.on('vote:update', (data: { votesFor: number; votesAgainst: number }) => {
      const total = data.votesFor + data.votesAgainst;
      if (total > 0) {
        setForPercent(Math.round((data.votesFor / total) * 100));
        setAgainstPercent(100 - Math.round((data.votesFor / total) * 100));
      }
    });

    socket.on('vote:end', (data: { votesFor: number; votesAgainst: number; finalDecision: string }) => {
      const total = data.votesFor + data.votesAgainst;
      if (total > 0) {
        setForPercent(Math.round((data.votesFor / total) * 100));
        setAgainstPercent(100 - Math.round((data.votesFor / total) * 100));
      }
      setChatWon(data.finalDecision === 'POSTED');
      setState('result');
      setTimeout(() => setState('idle'), 4000);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  // Timer countdown
  useEffect(() => {
    if (state !== 'voting') return;
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
  }, [state]);

  return (
    <div className="w-full h-full bg-transparent">
      <AnimatePresence>
        {state === 'voting' && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="absolute bottom-0 left-0 right-0 p-3"
          >
            <div className="rounded-xl border border-purple-500/30 bg-black/80 backdrop-blur-xl p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <motion.div
                    animate={{ scale: [1, 1.3, 1] }}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                    className="w-2.5 h-2.5 rounded-full bg-purple-500 shadow-lg shadow-purple-500/50"
                  />
                  <span className="text-white font-bold text-sm uppercase tracking-wider">
                    Голосование чата
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-white/40 bg-white/10 px-2 py-0.5 rounded">
                    1 = ЗА · 2 = ПРОТИВ
                  </span>
                  <span
                    className={`text-sm font-mono font-bold ${
                      timeLeft <= 5 ? 'text-red-400' : 'text-purple-400'
                    }`}
                  >
                    0:{timeLeft.toString().padStart(2, '0')}
                  </span>
                </div>
              </div>
              <div className="relative h-7 rounded-lg overflow-hidden bg-white/5">
                <motion.div
                  className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-emerald-600 to-emerald-400"
                  animate={{ width: `${forPercent}%` }}
                  style={{ minWidth: '8%' }}
                />
                <motion.div
                  className="absolute right-0 top-0 bottom-0 bg-gradient-to-l from-red-600 to-red-400"
                  animate={{ width: `${againstPercent}%` }}
                  style={{ minWidth: '8%' }}
                />
                <div className="absolute inset-0 flex items-center justify-between px-3 z-10">
                  <span className="text-white text-xs font-bold drop-shadow-lg">
                    ✅ {forPercent}% ЗА
                  </span>
                  <span className="text-white text-xs font-bold drop-shadow-lg">
                    ПРОТИВ {againstPercent}% ❌
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {state === 'result' && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="absolute bottom-0 left-0 right-0 p-3"
          >
            <div className="rounded-xl border border-white/20 bg-black/80 backdrop-blur-xl p-4 text-center">
              {chatWon ? (
                <>
                  <motion.div
                    animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.2, 1] }}
                    transition={{ repeat: Infinity, duration: 0.6, repeatDelay: 0.3 }}
                    className="text-5xl mb-2"
                  >
                    🎉
                  </motion.div>
                  <h3 className="text-3xl font-black bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent mb-1">
                    ЧАТ РЕШИЛ!
                  </h3>
                </>
              ) : (
                <>
                  <motion.div
                    animate={{ y: [0, -5, 0] }}
                    transition={{ repeat: Infinity, duration: 0.8 }}
                    className="text-5xl mb-2"
                  >
                    💀
                  </motion.div>
                  <h3 className="text-3xl font-black bg-gradient-to-r from-red-400 to-rose-300 bg-clip-text text-transparent mb-1">
                    МЕЧТА ЧАТА УБИТА
                  </h3>
                </>
              )}
              <div className="flex gap-8 justify-center text-sm mt-2">
                <span className="text-emerald-400">{forPercent}% ЗА</span>
                <span className="text-red-400">{againstPercent}% ПРОТИВ</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
