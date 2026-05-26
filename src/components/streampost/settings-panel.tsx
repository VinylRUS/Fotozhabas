'use client';

import { useState, useMemo } from 'react';
import { Save, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useSettings, useUpdateSettings } from '@/lib/streampost-hooks';

const DEFAULT_SETTINGS: Record<string, string> = {
  voteDuration: '30',
  voteThreshold: '3',
  autoPostThreshold: '70',
  voteMessageTemplate: '🎬 Голосование начинается! Напиши + ЗА или - ПРОТИВ в чате!',
  postPrefix: '📢',
  postSuffix: '',
};

export function SettingsPanel() {
  const { data: settings, isLoading } = useSettings();
  const updateSettings = useUpdateSettings();

  const mergedDefaults = useMemo(
    () => ({ ...DEFAULT_SETTINGS, ...(settings || {}) }),
    [settings]
  );

  const [form, setForm] = useState<Record<string, string>>(mergedDefaults);
  const [saved, setSaved] = useState(false);

  // Re-merge when settings load
  const currentForm = useMemo(() => {
    if (settings) {
      return { ...DEFAULT_SETTINGS, ...settings, ...form };
    }
    return { ...DEFAULT_SETTINGS, ...form };
  }, [settings, form]);

  const handleSave = async () => {
    await updateSettings.mutateAsync(currentForm);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleReset = () => {
    setForm(DEFAULT_SETTINGS);
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
      {/* Vote Settings */}
      <div className="rounded-xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] backdrop-blur-sm p-5 space-y-5">
        <h3 className="text-base font-semibold text-white/80">🗳️ Настройки голосования</h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="space-y-2">
            <Label className="text-sm text-white/60">Длительность голосования</Label>
            <Select
              value={currentForm.voteDuration}
              onValueChange={(v) => setForm({ ...currentForm, voteDuration: v })}
            >
              <SelectTrigger className="bg-white/5 border-white/10 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="15">15 секунд</SelectItem>
                <SelectItem value="30">30 секунд</SelectItem>
                <SelectItem value="60">60 секунд</SelectItem>
                <SelectItem value="90">90 секунд</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-white/30">Как долго длится голосование в чате</p>
          </div>

          <div className="space-y-2">
            <Label className="text-sm text-white/60">Минимальный порог голосов</Label>
            <Input
              type="number"
              min={1}
              value={currentForm.voteThreshold}
              onChange={(e) => setForm({ ...currentForm, voteThreshold: e.target.value })}
              className="bg-white/5 border-white/10 text-white"
            />
            <p className="text-xs text-white/30">Минимальное количество голосов для действительного результата</p>
          </div>

          <div className="space-y-2">
            <Label className="text-sm text-white/60">Порог автопубликации (%)</Label>
            <Input
              type="number"
              min={50}
              max={100}
              value={currentForm.autoPostThreshold}
              onChange={(e) => setForm({ ...currentForm, autoPostThreshold: e.target.value })}
              className="bg-white/5 border-white/10 text-white"
            />
            <p className="text-xs text-white/30">
              Если голосов ЗА больше этого %, опубликовать автоматически
            </p>
          </div>
        </div>
      </div>

      {/* Message Templates */}
      <div className="rounded-xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] backdrop-blur-sm p-5 space-y-5">
        <h3 className="text-base font-semibold text-white/80">💬 Шаблоны сообщений</h3>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm text-white/60">Сообщение о начале голосования</Label>
            <Textarea
              value={currentForm.voteMessageTemplate}
              onChange={(e) => setForm({ ...currentForm, voteMessageTemplate: e.target.value })}
              className="bg-white/5 border-white/10 text-white min-h-20"
              placeholder="Сообщение при запуске голосования..."
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm text-white/60">Префикс поста</Label>
              <Input
                value={currentForm.postPrefix}
                onChange={(e) => setForm({ ...currentForm, postPrefix: e.target.value })}
                className="bg-white/5 border-white/10 text-white"
                placeholder="например 📢"
              />
              <p className="text-xs text-white/30">Добавляется перед текстом опубликованного поста</p>
            </div>

            <div className="space-y-2">
              <Label className="text-sm text-white/60">Суффикс поста</Label>
              <Input
                value={currentForm.postSuffix}
                onChange={(e) => setForm({ ...currentForm, postSuffix: e.target.value })}
                className="bg-white/5 border-white/10 text-white"
                placeholder="например #стрим"
              />
              <p className="text-xs text-white/30">Добавляется после текста опубликованного поста</p>
            </div>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-3 justify-end">
        <Button
          variant="ghost"
          onClick={handleReset}
          className="text-white/50 hover:text-white/80 hover:bg-white/5"
        >
          <RotateCcw className="w-4 h-4 mr-2" />
          Сбросить
        </Button>
        <Button
          onClick={handleSave}
          disabled={updateSettings.isPending}
          className={`${
            saved
              ? 'bg-emerald-600 hover:bg-emerald-500'
              : 'bg-purple-600 hover:bg-purple-500'
          } text-white`}
        >
          <Save className="w-4 h-4 mr-2" />
          {saved ? 'Сохранено!' : 'Сохранить настройки'}
        </Button>
      </div>
    </div>
  );
}
