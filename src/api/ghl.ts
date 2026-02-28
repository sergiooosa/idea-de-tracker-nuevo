/**
 * Placeholder API para conectar con GoHighLevel (GHL).
 * Reemplazar con llamadas reales cuando el backend esté disponible.
 */

import type { Lead, CallPhone, VideoMeeting, ChatEvent, Advisor } from '@/types';

// const BASE = '/api/ghl'; // Ajustar a la URL real del backend

export async function fetchLeads(_params?: { advisorId?: string; status?: string }): Promise<Lead[]> {
  // return (await fetch(`${BASE}/leads?${new URLSearchParams(params)}`)).json();
  return Promise.resolve([]);
}

export async function fetchCalls(_params?: { leadId?: string; advisorId?: string; from?: string; to?: string }): Promise<CallPhone[]> {
  // return (await fetch(`${BASE}/calls?${new URLSearchParams(params)}`)).json();
  return Promise.resolve([]);
}

export async function fetchVideoMeetings(_params?: { advisorId?: string; from?: string; to?: string }): Promise<VideoMeeting[]> {
  // return (await fetch(`${BASE}/meetings?${new URLSearchParams(params)}`)).json();
  return Promise.resolve([]);
}

export async function fetchChatEvents(_params?: { leadId?: string; advisorId?: string }): Promise<ChatEvent[]> {
  // return (await fetch(`${BASE}/chats?${new URLSearchParams(params)}`)).json();
  return Promise.resolve([]);
}

export async function fetchAdvisors(): Promise<Advisor[]> {
  // return (await fetch(`${BASE}/advisors`)).json();
  return Promise.resolve([]);
}

export async function syncGHL(): Promise<{ ok: boolean }> {
  // POST ${BASE}/sync
  return Promise.resolve({ ok: true });
}
