'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Play, Square, RotateCcw, Monitor, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

type OverlayState = 'idle' | 'voting' | 'result';

export function StreamOverlay() {
  const [state, setState] = useState<OverlayState>('idle');
  const [votesFor, setVotesFor] = useState(0);
  const [votesAgainst, setVotesAgainst] = useState(0);
  const [totalVoters, setTotalVoters] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [chatWon, setChatWon] = useState(true);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const voteSimRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Computed values (not state)
  const forPercent = votesFor + votesAgainst > 0 ? Math.round((votesFor / (votesFor + votesAgainst)) * 100) : 50;
  const againstPercent = 100 - forPercent;

  const resetSimulation = useCallback(() => {
    setState('idle');
    setVotesFor(0);
    setVotesAgainst(0);
    setTotalVoters(0);
    setTimeLeft(30);
    if (timerRef.current) clearInterval(timerRef.current);
    if (voteSimRef.current) clearInterval(voteSimRef.current);
  }, []);

  const startVoting = useCallback(() => {
    resetSimulation();
    setState('voting');
    setTimeLeft(30);
    toast('Симуляция голосования запущена!', { icon: '🎲' });

    // Timer countdown
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          if (voteSimRef.current) clearInterval(voteSimRef.current);
          // Auto-close - need to use functional update for proper state
          setVotesFor((currentFor) => {
            setVotesAgainst((currentAgainst) => {
              setChatWon(currentFor >= currentAgainst);
              return currentAgainst;
            });
            return currentFor;
          });
          setState('result');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Simulate incoming votes
    voteSimRef.current = setInterval(() => {
      const isFor = Math.random() > 0.45; // Slight bias toward FOR
      const voteCount = Math.floor(Math.random() * 3) + 1;
      if (isFor) {
        setVotesFor((prev) => prev + voteCount);
      } else {
        setVotesAgainst((prev) => prev + voteCount);
      }
      setTotalVoters((prev) => prev + voteCount);
    }, 800);
  }, [resetSimulation]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (voteSimRef.current) clearInterval(voteSimRef.current);
    };
  }, []);

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm p-5">
        <h3 className="text-base font-semibold text-white/80 mb-4 flex items-center gap-2">
          <Monitor className="w-4 h-4 text-purple-400" />
          Симуляция оверлея
        </h3>
        <p className="text-sm text-white/40 mb-4">
          Запустите симуляцию, чтобы увидеть, как будет выглядеть голосование на стриме.
          Голоса генерируются автоматически.
        </p>
        <div className="flex gap-2">
          {state === 'idle' && (
            <Button onClick={startVoting} className="bg-purple-600 hover:bg-purple-500 text-white">
              <Play className="w-4 h-4 mr-2" />
              Запустить симуляцию
            </Button>
          )}
          {state === 'voting' && (
            <Button onClick={resetSimulation} variant="outline" className="border-red-500/30 text-red-400 hover:bg-red-500/10">
              <Square className="w-4 h-4 mr-2" />
              Остановить
            </Button>
          )}
          {state === 'result' && (
            <Button onClick={startVoting} className="bg-purple-600 hover:bg-purple-500 text-white">
              <RotateCcw className="w-4 h-4 mr-2" />
              Заново
            </Button>
          )}
        </div>
      </div>

      {/* Simulated stream overlay */}
      <div className="relative rounded-xl overflow-hidden border border-white/10 bg-gradient-to-b from-gray-900 to-black" style={{ aspectRatio: '16/9' }}>
        {/* Fake stream background */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/30 via-gray-900 to-emerald-900/20" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="text-white/5 text-4xl font-black mb-2">STREAM CONTENT</div>
            <p className="text-white/[0.03] text-sm">Область контента стрима</p>
          </div>
        </div>

        {/* Overlay bar at bottom */}
        <AnimatePresence mode="wait">
          {state === 'voting' && (
            <motion.div
              key="voting"
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 200, damping: 25 }}
              className="absolute bottom-0 left-0 right-0 p-4"
            >
              <div className="rounded-xl border border-purple-500/30 bg-black/80 backdrop-blur-xl p-4 space-y-3">
                {/* Title */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <motion.div
                      animate={{ scale: [1, 1.3, 1] }}
                      transition={{ repeat: Infinity, duration: 1.5 }}
                      className="w-3 h-3 rounded-full bg-purple-500 shadow-lg shadow-purple-500/50"
                    />
                    <span className="text-white font-bold text-sm uppercase tracking-wider">
                      Голосование чата
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-purple-500/20 text-purple-400 border-purple-500/30 text-xs">
                      1 = ЗА · 2 = ПРОТИВ
                    </Badge>
                    <span className={`text-sm font-mono font-bold ${timeLeft <= 5 ? 'text-red-400' : 'text-purple-400'}`}>
                      0:{timeLeft.toString().padStart(2, '0')}
                    </span>
                  </div>
                </div>

                {/* The tug-of-war bar */}
                <div className="relative h-8 rounded-lg overflow-hidden bg-white/5">
                  <motion.div
                    className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-emerald-600 to-emerald-400"
                    animate={{ width: `${forPercent}%` }}
                    transition={{ type: 'spring', stiffness: 100, damping: 20 }}
                    style={{ minWidth: '8%' }}
                  />
                  <motion.div
                    className="absolute right-0 top-0 bottom-0 bg-gradient-to-l from-red-600 to-red-400"
                    animate={{ width: `${againstPercent}%` }}
                    transition={{ type: 'spring', stiffness: 100, damping: 20 }}
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

                {/* Voters count */}
                <div className="flex justify-between text-xs text-white/40">
                  <span>{votesFor} голосов ЗА</span>
                  <span>{totalVoters} всего</span>
                  <span>{votesAgainst} голосов ПРОТИВ</span>
                </div>
              </div>
            </motion.div>
          )}

          {state === 'result' && (
            <motion.div
              key="result"
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 200, damping: 25 }}
              className="absolute bottom-0 left-0 right-0 p-4"
            >
              <div className="rounded-xl border border-white/20 bg-black/80 backdrop-blur-xl p-5 text-center">
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

      {/* Overlay URL info */}
      <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm p-5 space-y-3">
        <h4 className="text-sm font-semibold text-white/70 flex items-center gap-2">
          <ExternalLink className="w-4 h-4 text-emerald-400" />
          Подключение к OBS
        </h4>
        <div className="bg-black/40 rounded-lg p-3 border border-white/5">
          <code className="text-xs text-emerald-400/90 break-all">
            http://localhost:3000/overlay
          </code>
        </div>
        <div className="text-xs text-white/30 space-y-1">
          <p>1. В OBS добавьте Browser Source</p>
          <p>2. Укажите URL выше</p>
          <p>3. Установите размер: <code className="text-white/50">1920 × 200</code></p>
          <p>4. Оверлей будет автоматически обновляться при голосованиях</p>
        </div>
      </div>
    </div>
  );
}
