'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Post, Channel, Moderator, VoteSession, ActiveVote } from './streampost-store';

// ============ Posts ============

export function usePendingPosts() {
  return useQuery<{ posts: Post[]; total: number }>({
    queryKey: ['posts', 'pending'],
    queryFn: async () => {
      const res = await fetch('/api/posts?status=PENDING');
      if (!res.ok) throw new Error('Failed to fetch pending posts');
      return res.json();
    },
    refetchInterval: 10000,
  });
}

export function usePosts(status?: string) {
  return useQuery<{ posts: Post[]; total: number }>({
    queryKey: ['posts', status],
    queryFn: async () => {
      const url = status ? `/api/posts?status=${status}` : '/api/posts';
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch posts');
      return res.json();
    },
  });
}

export function useUpdatePost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status, reviewerId }: { id: string; status: string; reviewerId?: string }) => {
      const res = await fetch(`/api/posts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, reviewerId }),
      });
      if (!res.ok) throw new Error('Failed to update post');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
    },
  });
}

export function useCreatePost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to create post');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    },
  });
}

// ============ Channels ============

export function useChannels() {
  return useQuery<Channel[]>({
    queryKey: ['channels'],
    queryFn: async () => {
      const res = await fetch('/api/channels');
      if (!res.ok) throw new Error('Failed to fetch channels');
      return res.json();
    },
  });
}

export function useCreateChannel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { telegramId: string; name: string; isDefault?: boolean }) => {
      const res = await fetch('/api/channels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to create channel');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channels'] });
    },
  });
}

export function useUpdateChannel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string; telegramId?: string; name?: string; isDefault?: boolean }) => {
      const res = await fetch(`/api/channels/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to update channel');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channels'] });
    },
  });
}

export function useDeleteChannel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/channels/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete channel');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channels'] });
    },
  });
}

// ============ Moderators ============

export function useModerators() {
  return useQuery<Moderator[]>({
    queryKey: ['moderators'],
    queryFn: async () => {
      const res = await fetch('/api/moderators');
      if (!res.ok) throw new Error('Failed to fetch moderators');
      return res.json();
    },
  });
}

export function useCreateModerator() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { telegramId: string; username?: string; role?: string }) => {
      const res = await fetch('/api/moderators', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to create moderator');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['moderators'] });
    },
  });
}

export function useUpdateModerator() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, role }: { id: string; role: string }) => {
      const res = await fetch(`/api/moderators/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      });
      if (!res.ok) throw new Error('Failed to update moderator');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['moderators'] });
    },
  });
}

export function useDeleteModerator() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/moderators/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete moderator');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['moderators'] });
    },
  });
}

// ============ Settings ============

export function useSettings() {
  return useQuery<Record<string, string>>({
    queryKey: ['settings'],
    queryFn: async () => {
      const res = await fetch('/api/settings');
      if (!res.ok) throw new Error('Failed to fetch settings');
      return res.json();
    },
  });
}

export function useUpdateSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Record<string, string>) => {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to update settings');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    },
  });
}

// ============ Votes ============

export function useVoteSessions(status?: string) {
  return useQuery<VoteSession[]>({
    queryKey: ['votes', status],
    queryFn: async () => {
      const url = status ? `/api/votes?status=${status}` : '/api/votes';
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch vote sessions');
      return res.json();
    },
  });
}

export function useStartVote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ postId, durationSec }: { postId: string; durationSec?: number }) => {
      const res = await fetch('/api/votes/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId, durationSec }),
      });
      if (!res.ok) throw new Error('Failed to start vote');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['votes'] });
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    },
  });
}

export function useCloseVote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, finalDecision, streamerFollowedChat }: { id: string; finalDecision: string; streamerFollowedChat?: boolean }) => {
      const res = await fetch(`/api/votes/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'CLOSED', finalDecision, streamerFollowedChat }),
      });
      if (!res.ok) throw new Error('Failed to close vote');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['votes'] });
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
    },
  });
}

// ============ Stats ============

export function useStats() {
  return useQuery({
    queryKey: ['stats'],
    queryFn: async () => {
      const res = await fetch('/api/stats');
      if (!res.ok) throw new Error('Failed to fetch stats');
      return res.json();
    },
    refetchInterval: 15000,
  });
}
