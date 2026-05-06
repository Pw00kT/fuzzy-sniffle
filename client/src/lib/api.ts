import type { Meeting, MeetingDetail, Metrics, ChatMessage } from './types'

const BASE = '/api'

function getToken() {
  return localStorage.getItem('idot_auth_token') ?? ''
}

function authHeaders(): Record<string, string> {
  const t = getToken()
  return t ? { Authorization: `Bearer ${t}` } : {}
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { headers: authHeaders() })
  if (res.status === 401) { window.location.href = '/login'; throw new Error('Unauthorized') }
  if (!res.ok) throw new Error(`GET ${path} failed: ${res.status}`)
  return res.json()
}

async function patch<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(body),
  })
  if (res.status === 401) { window.location.href = '/login'; throw new Error('Unauthorized') }
  if (!res.ok) throw new Error(`PATCH ${path} failed: ${res.status}`)
  return res.json()
}

function uploadWithProgress(
  url: string,
  form: FormData,
  onProgress?: (pct: number) => void
): Promise<{ meetingId: string; status: string }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', url)
    const t = getToken()
    if (t) xhr.setRequestHeader('Authorization', `Bearer ${t}`)
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100))
    }
    xhr.onload = () => {
      if (xhr.status === 401) { window.location.href = '/login'; return reject(new Error('Unauthorized')) }
      if (xhr.status >= 200 && xhr.status < 300) {
        try { resolve(JSON.parse(xhr.responseText)) } catch { reject(new Error('Invalid response')) }
      } else {
        reject(new Error(`Upload failed: ${xhr.status}`))
      }
    }
    xhr.onerror = () => reject(new Error('Network error'))
    xhr.send(form)
  })
}

export const api = {
  health: () =>
    fetch(`${BASE}/health`)
      .then((r) => r.json() as Promise<{ status: string; database: string; ai: string; authRequired: boolean }>),

  auth: {
    verify: (token: string) =>
      fetch(`${BASE}/auth/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      }).then((r) => r.json() as Promise<{ ok: boolean; disabled?: boolean; error?: string }>),
  },

  metrics: () => get<Metrics>('/metrics'),

  meetings: {
    list: () => get<{ meetings: Meeting[] }>('/meetings'),
    get: (id: string) =>
      get<{ meeting: MeetingDetail }>(`/meetings/${id}`).then((r) => r.meeting),
    create: (body: Partial<Meeting>) =>
      fetch(`${BASE}/meetings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify(body),
      }).then((r) => r.json()),
  },

  actionItems: {
    updateStatus: (id: string, status: 'open' | 'in-progress' | 'completed') =>
      patch<{ item: unknown }>(`/meetings/action-items/${id}`, { status }),
  },

  upload: {
    audio: (file: File, onProgress?: (pct: number) => void) => {
      const form = new FormData()
      form.append('audio', file)
      return uploadWithProgress(`${BASE}/upload`, form, onProgress)
    },
    status: (meetingId: string) =>
      get<{ status: string; progress: number; step?: string; error?: string }>(
        `/upload/status/${meetingId}`
      ),
    coaching: (recentText: string, context: string) =>
      fetch(`${BASE}/upload/coaching`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ recentText, context }),
      }).then((r) => r.json() as Promise<{ insight: string | null }>),
  },

  chat: {
    history: (meetingId: string) =>
      get<{ messages: ChatMessage[] }>(`/meetings/${meetingId}/chat`).then((r) => r.messages),

    send: async function* (meetingId: string, message: string): AsyncGenerator<string> {
      const res = await fetch(`${BASE}/meetings/${meetingId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ message }),
      })
      if (res.status === 401) { window.location.href = '/login'; return }
      if (!res.ok || !res.body) throw new Error('Chat request failed')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const data = JSON.parse(line.slice(6))
            if (data.chunk) yield data.chunk
            if (data.done || data.error) return
          } catch { /* skip malformed */ }
        }
      }
    },
  },
}
