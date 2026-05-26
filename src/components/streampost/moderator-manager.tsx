'use client';

import { useState } from 'react';
import { Plus, Trash2, Shield, ShieldCheck, X, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  useModerators,
  useCreateModerator,
  useDeleteModerator,
  useUpdateModerator,
} from '@/lib/streampost-hooks';
import { toast } from 'sonner';

export function ModeratorManager() {
  const { data: moderators, isLoading } = useModerators();
  const createModerator = useCreateModerator();
  const deleteModerator = useDeleteModerator();
  const updateModerator = useUpdateModerator();

  const [newTelegramId, setNewTelegramId] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newRole, setNewRole] = useState('MODERATOR');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!newTelegramId.trim()) return;
    try {
      await createModerator.mutateAsync({
        telegramId: newTelegramId.trim(),
        username: newUsername.trim() || undefined,
        role: newRole,
      });
      toast.success(`Модератор добавлен`);
      setNewTelegramId('');
      setNewUsername('');
      setNewRole('MODERATOR');
    } catch {
      toast.error('Не удалось добавить модератора');
    }
  };

  const handleRoleChange = async (id: string, role: string, username: string) => {
    try {
      await updateModerator.mutateAsync({ id, role });
      toast.success(`Роль ${username} изменена на ${role === 'ADMIN' ? 'Админ' : 'Модератор'}`);
    } catch {
      toast.error('Не удалось изменить роль');
    }
  };

  const handleDelete = async (id: string, username: string) => {
    try {
      await deleteModerator.mutateAsync(id);
      toast.success(`Модератор ${username} удалён`);
      setDeleteConfirmId(null);
    } catch {
      toast.error('Не удалось удалить модератора');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Add moderator form */}
      <div className="rounded-xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] backdrop-blur-sm p-5">
        <h3 className="text-base font-semibold text-white/80 mb-4 flex items-center gap-2">
          <Plus className="w-4 h-4 text-purple-400" />
          Добавить модератора
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <Input
            placeholder="Telegram ID"
            value={newTelegramId}
            onChange={(e) => setNewTelegramId(e.target.value)}
            className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
          />
          <Input
            placeholder="Имя пользователя"
            value={newUsername}
            onChange={(e) => setNewUsername(e.target.value)}
            className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
          />
          <Select value={newRole} onValueChange={setNewRole}>
            <SelectTrigger className="bg-white/5 border-white/10 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="MODERATOR">Модератор</SelectItem>
              <SelectItem value="ADMIN">Админ</SelectItem>
            </SelectContent>
          </Select>
          <Button
            onClick={handleCreate}
            disabled={!newTelegramId.trim() || createModerator.isPending}
            className="bg-purple-600 hover:bg-purple-500 text-white"
            size="sm"
          >
            Добавить
          </Button>
        </div>
      </div>

      {/* Moderator list */}
      <div className="space-y-3">
        {moderators && moderators.length > 0 ? (
          moderators.map((mod) => (
            <div
              key={mod.id}
              className="rounded-xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] backdrop-blur-sm p-4 flex items-center justify-between gap-4 hover:border-white/20 transition-all duration-300"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  mod.role === 'ADMIN'
                    ? 'bg-gradient-to-br from-amber-500/20 to-orange-500/20'
                    : 'bg-gradient-to-br from-blue-500/20 to-cyan-500/20'
                }`}>
                  {mod.role === 'ADMIN' ? (
                    <ShieldCheck className="w-5 h-5 text-amber-400" />
                  ) : (
                    <Shield className="w-5 h-5 text-blue-400" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-white/90 truncate">
                      @{mod.user.username || mod.user.telegramId}
                    </p>
                    <Badge
                      variant="outline"
                      className={`text-xs ${
                        mod.role === 'ADMIN'
                          ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                          : 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                      }`}
                    >
                      {mod.role === 'ADMIN' ? 'Админ' : 'Модератор'}
                    </Badge>
                  </div>
                  <p className="text-xs text-white/40">TG: {mod.user.telegramId}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <Select
                  value={mod.role}
                  onValueChange={(role) => handleRoleChange(mod.id, role, mod.user.username || mod.user.telegramId)}
                >
                  <SelectTrigger className="bg-white/5 border-white/10 text-white h-8 w-28 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MODERATOR">Модератор</SelectItem>
                    <SelectItem value="ADMIN">Админ</SelectItem>
                  </SelectContent>
                </Select>
                {deleteConfirmId === mod.id ? (
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-red-400 mr-1">Удалить?</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(mod.id, mod.user.username || mod.user.telegramId)}
                      className="text-red-400 hover:text-red-300 hover:bg-red-500/10 h-8 w-8"
                    >
                      <Check className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteConfirmId(null)}
                      className="text-white/40 hover:text-white/60 hover:bg-white/5 h-8 w-8"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setDeleteConfirmId(mod.id)}
                    className="text-red-400 hover:text-red-300 hover:bg-red-500/10 h-8 w-8"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-12 text-white/30">
            <Shield className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Модераторы ещё не добавлены</p>
            <p className="text-sm mt-1">Добавьте модераторов для управления контентом</p>
          </div>
        )}
      </div>
    </div>
  );
}
