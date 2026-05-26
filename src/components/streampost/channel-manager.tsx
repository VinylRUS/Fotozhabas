'use client';

import { useState } from 'react';
import { Plus, Trash2, Star, Radio, X, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useChannels, useCreateChannel, useDeleteChannel, useUpdateChannel } from '@/lib/streampost-hooks';
import { toast } from 'sonner';

export function ChannelManager() {
  const { data: channels, isLoading } = useChannels();
  const createChannel = useCreateChannel();
  const deleteChannel = useDeleteChannel();
  const updateChannel = useUpdateChannel();

  const [newTelegramId, setNewTelegramId] = useState('');
  const [newName, setNewName] = useState('');
  const [newIsDefault, setNewIsDefault] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!newTelegramId.trim() || !newName.trim()) return;
    try {
      await createChannel.mutateAsync({
        telegramId: newTelegramId.trim(),
        name: newName.trim(),
        isDefault: newIsDefault,
      });
      toast.success(`Канал «${newName.trim()}» добавлен`);
      setNewTelegramId('');
      setNewName('');
      setNewIsDefault(false);
    } catch {
      toast.error('Не удалось добавить канал');
    }
  };

  const handleToggleDefault = async (id: string, isDefault: boolean, name: string) => {
    try {
      await updateChannel.mutateAsync({ id, isDefault: !isDefault });
      toast.success(!isDefault ? `«${name}» — канал по умолчанию` : `«${name}» — больше не по умолчанию`);
    } catch {
      toast.error('Не удалось изменить статус');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    try {
      await deleteChannel.mutateAsync(id);
      toast.success(`Канал «${name}» удалён`);
      setDeleteConfirmId(null);
    } catch {
      toast.error('Не удалось удалить канал');
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
      {/* Add channel form */}
      <div className="rounded-xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] backdrop-blur-sm p-5">
        <h3 className="text-base font-semibold text-white/80 mb-4 flex items-center gap-2">
          <Plus className="w-4 h-4 text-emerald-400" />
          Добавить канал
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Input
            placeholder="Telegram ID (@канал)"
            value={newTelegramId}
            onChange={(e) => setNewTelegramId(e.target.value)}
            className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
          />
          <Input
            placeholder="Название канала"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
          />
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Switch
                checked={newIsDefault}
                onCheckedChange={setNewIsDefault}
              />
              <span className="text-sm text-white/60">По умолчанию</span>
            </div>
            <Button
              onClick={handleCreate}
              disabled={!newTelegramId.trim() || !newName.trim() || createChannel.isPending}
              className="bg-emerald-600 hover:bg-emerald-500 text-white ml-auto"
              size="sm"
            >
              Добавить
            </Button>
          </div>
        </div>
      </div>

      {/* Channel list */}
      <div className="space-y-3">
        {channels && channels.length > 0 ? (
          channels.map((channel) => (
            <div
              key={channel.id}
              className="rounded-xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] backdrop-blur-sm p-4 flex items-center justify-between gap-4 hover:border-white/20 transition-all duration-300"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center flex-shrink-0">
                  <Radio className="w-5 h-5 text-purple-400" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-white/90 truncate">{channel.name}</p>
                    {channel.isDefault && (
                      <Badge variant="outline" className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-xs">
                        <Star className="w-3 h-3 mr-1" />
                        По умолчанию
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-white/40 truncate">{channel.telegramId}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <div className="flex items-center gap-1.5">
                  <Switch
                    checked={channel.isDefault}
                    onCheckedChange={() => handleToggleDefault(channel.id, channel.isDefault, channel.name)}
                  />
                  <span className="text-xs text-white/40 hidden sm:inline">По умолчанию</span>
                </div>
                {deleteConfirmId === channel.id ? (
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-red-400 mr-1">Удалить?</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(channel.id, channel.name)}
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
                    onClick={() => setDeleteConfirmId(channel.id)}
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
            <Radio className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Каналы ещё не добавлены</p>
            <p className="text-sm mt-1">Добавьте Telegram канал для начала публикации</p>
          </div>
        )}
      </div>
    </div>
  );
}
