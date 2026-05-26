'use client';

import { useStats } from '@/lib/streampost-hooks';
import { Badge } from '@/components/ui/badge';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { TrendingUp, Users, Eye, ThumbsUp, ThumbsDown, Clock, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

const TYPE_COLORS = ['#10b981', '#ef4444', '#f59e0b'];

export function StatsDashboard() {
  const { data: stats, isLoading } = useStats();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-12 text-white/30">
        <p>Не удалось загрузить статистику</p>
      </div>
    );
  }

  const statusData = [
    { name: 'Ожидание', value: stats.posts.pending, color: '#f59e0b' },
    { name: 'Принят', value: stats.posts.approved, color: '#10b981' },
    { name: 'Опубликован', value: stats.posts.posted, color: '#a855f7' },
    { name: 'Отклонён', value: stats.posts.rejected, color: '#ef4444' },
  ].filter((d) => d.value > 0);

  const typeData = [
    { name: 'Фото', value: stats.postsByType.photo, color: TYPE_COLORS[0] },
    { name: 'YouTube', value: stats.postsByType.youtube, color: TYPE_COLORS[1] },
    { name: 'Текст', value: stats.postsByType.text, color: TYPE_COLORS[2] },
  ].filter((d) => d.value > 0);

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
        <StatCard icon={Eye} label="Всего" value={stats.posts.total} color="text-white" />
        <StatCard icon={Clock} label="Ожидает" value={stats.posts.pending} color="text-amber-400" />
        <StatCard icon={ThumbsUp} label="Принято" value={stats.posts.approved} color="text-emerald-400" />
        <StatCard icon={TrendingUp} label="Опубликовано" value={stats.posts.posted} color="text-purple-400" />
        <StatCard icon={Clock} label="Отложено" value={stats.posts.deferred || 0} color="text-purple-400" />
        <StatCard icon={ThumbsDown} label="Отклонено" value={stats.posts.rejected} color="text-red-400" />
        <StatCard icon={Users} label="Пользователи" value={stats.users} color="text-cyan-400" />
      </div>

      {/* Export section */}
      <div className="flex items-center gap-2 justify-end">
        <span className="text-xs text-white/30">Экспорт:</span>
        <Button
          variant="ghost"
          size="sm"
          className="text-white/40 hover:text-white/80 hover:bg-white/5 text-xs h-7"
          onClick={() => window.open('/api/export?type=posts&format=json', '_blank')}
        >
          <Download className="w-3 h-3 mr-1" />
          Посты JSON
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="text-white/40 hover:text-white/80 hover:bg-white/5 text-xs h-7"
          onClick={() => window.open('/api/export?type=posts&format=csv', '_blank')}
        >
          <Download className="w-3 h-3 mr-1" />
          Посты CSV
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="text-white/40 hover:text-white/80 hover:bg-white/5 text-xs h-7"
          onClick={() => window.open('/api/export?type=votes&format=json', '_blank')}
        >
          <Download className="w-3 h-3 mr-1" />
          Голосования
        </Button>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {/* Posts by status pie chart */}
        <div className="rounded-xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] backdrop-blur-sm p-5">
          <h3 className="text-sm font-semibold text-white/70 mb-4">Посты по статусам</h3>
          {statusData.length > 0 ? (
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={70}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {statusData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(0,0,0,0.8)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '12px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-3 justify-center mt-2">
                {statusData.map((d) => (
                  <div key={d.name} className="flex items-center gap-1.5 text-xs text-white/60">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                    {d.name}: {d.value}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-center text-white/30 py-8">Пока нет данных</p>
          )}
        </div>

        {/* Posts by type bar chart */}
        <div className="rounded-xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] backdrop-blur-sm p-5">
          <h3 className="text-sm font-semibold text-white/70 mb-4">Посты по типам</h3>
          {typeData.length > 0 ? (
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={typeData}>
                  <XAxis dataKey="name" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }} />
                  <YAxis tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(0,0,0,0.8)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '12px',
                    }}
                  />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {typeData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-center text-white/30 py-8">Пока нет данных</p>
          )}
        </div>
      </div>

      {/* Top submitters & Recent votes */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {/* Top submitters */}
        <div className="rounded-xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] backdrop-blur-sm p-5">
          <h3 className="text-sm font-semibold text-white/70 mb-4">🏆 Топ отправителей</h3>
          {stats.topSubmitters && stats.topSubmitters.length > 0 ? (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {stats.topSubmitters.map((user: Record<string, unknown>, i: number) => (
                <div
                  key={String(user.id)}
                  className="flex items-center justify-between py-2 px-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-white/40 w-6">#{i + 1}</span>
                    <span className="text-sm text-white/80">
                      @{String(user.username || user.telegramId)}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-emerald-400">{String(user.acceptedCount)} ✅</span>
                    <span className="text-red-400">{String(user.rejectedCount)} ❌</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-white/30 py-8">Пока нет отправителей</p>
          )}
        </div>

        {/* Recent vote sessions */}
        <div className="rounded-xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] backdrop-blur-sm p-5">
          <h3 className="text-sm font-semibold text-white/70 mb-4">🗳️ Последние голосования</h3>
          {stats.recentVotes && stats.recentVotes.length > 0 ? (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {stats.recentVotes.map((vote: Record<string, unknown>) => {
                const isPosted = String(vote.finalDecision) === 'POSTED';
                return (
                  <div
                    key={String(vote.id)}
                    className="flex items-center justify-between py-2 px-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className={`text-xs ${
                          isPosted
                            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                            : 'bg-red-500/20 text-red-400 border-red-500/30'
                        }`}
                      >
                        {vote.finalDecision === 'POSTED' ? 'Опубликован' : vote.finalDecision === 'SKIPPED' ? 'Пропущен' : 'Активно'}
                      </Badge>
                      <span className="text-xs text-white/40">
                        {String(vote.votesFor || 0)} vs {String(vote.votesAgainst || 0)}
                      </span>
                    </div>
                    <span className="text-xs text-white/30">
                      {new Date(String(vote.startedAt)).toLocaleTimeString('ru-RU')}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-center text-white/30 py-8">Пока нет голосований</p>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] backdrop-blur-sm p-4 text-center hover:border-white/20 transition-all duration-300 group">
      <Icon className={`w-5 h-5 mx-auto mb-1.5 ${color} group-hover:scale-110 transition-transform`} />
      <p className={`text-2xl font-black ${color}`}>{value}</p>
      <p className="text-xs text-white/35 mt-0.5">{label}</p>
    </div>
  );
}
