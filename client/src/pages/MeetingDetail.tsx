import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams, Link } from 'wouter'
import {
  ArrowLeft, MapPin, Calendar, Clock, Users, AlertTriangle, CheckSquare,
  Send, Loader2, ChevronDown, ChevronUp, Search, MessageSquare, RefreshCw
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { api } from '@/lib/api'
import { mockMeetingDetails } from '@/lib/mock-data'
import {
  formatDate, formatDuration, statusColor, cn
} from '@/lib/utils'
import type { MeetingDetail, ChatMessage, TranscriptSegment } from '@/lib/types'

// ─── Extracted Data Tab ───────────────────────────────────────────────────────

type ActionStatus = 'open' | 'in-progress' | 'completed'

function ActionStatusSelect({ id, status, onChange }: { id: string; status: ActionStatus; onChange: (id: string, s: ActionStatus) => void }) {
  const [saving, setSaving] = useState(false)
  const cycle: ActionStatus[] = ['open', 'in-progress', 'completed']
  const next = cycle[(cycle.indexOf(status) + 1) % cycle.length]

  const toggle = async () => {
    setSaving(true)
    try { await onChange(id, next) } finally { setSaving(false) }
  }

  return (
    <button
      onClick={toggle}
      disabled={saving}
      className={cn(
        'text-xs px-2 py-0.5 rounded-full font-medium transition-colors border',
        status === 'completed' ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
          : status === 'in-progress' ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
          : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
      )}
    >
      {saving ? '…' : status}
    </button>
  )
}

function ExtractedDataTab({ detail, onActionStatusChange }: { detail: MeetingDetail; onActionStatusChange: (id: string, status: ActionStatus) => void }) {
  const ed = detail.extractedData
  const [showAll, setShowAll] = useState(false)
  const decisions = detail.keyDecisions ?? []
  const visibleDecisions = showAll ? decisions : decisions.slice(0, 3)

  return (
    <div className="space-y-6">
      {/* Project info */}
      {ed && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Project Information</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
            {[
              ['IDOT Project Number', ed.idot_project_number],
              ['Route', ed.route],
              ['Section', ed.section],
              ['County', ed.county],
              ['Letting Date', ed.letting_date ? formatDate(ed.letting_date) : null],
              ['Letting Impact', ed.letting_impact],
              ['ROW Issues', ed.row_issues],
            ].filter(([, v]) => v).map(([label, val]) => (
              <div key={label as string}>
                <p className="text-muted-foreground">{label}</p>
                <p className="font-medium">{val}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Utilities */}
      {detail.utilities.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Utility Facilities</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left px-4 py-2 font-medium text-muted-foreground">Owner</th>
                    <th className="text-left px-4 py-2 font-medium text-muted-foreground">Type</th>
                    <th className="text-left px-4 py-2 font-medium text-muted-foreground">Conflict</th>
                    <th className="text-left px-4 py-2 font-medium text-muted-foreground">Location</th>
                    <th className="text-left px-4 py-2 font-medium text-muted-foreground">Status</th>
                    <th className="text-left px-4 py-2 font-medium text-muted-foreground">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.utilities.map((u) => (
                    <tr key={u.id} className="border-b last:border-0 hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">{u.owner}</td>
                      <td className="px-4 py-3 text-muted-foreground">{u.facility_type ?? '—'}</td>
                      <td className="px-4 py-3">
                        <span className={cn(
                          'text-xs px-2 py-0.5 rounded-full font-medium',
                          u.conflict_type === 'conflict' ? 'bg-red-100 text-red-700'
                            : u.conflict_type === 'potential' ? 'bg-amber-100 text-amber-700'
                            : 'bg-green-100 text-green-700'
                        )}>
                          {u.conflict_type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{u.location ?? '—'}</td>
                      <td className="px-4 py-3">
                        <span className={cn('text-xs px-2 py-0.5 rounded-full', statusColor(u.status ?? ''))}>
                          {u.status ?? '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{u.notes ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action items */}
      {detail.actionItems.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CheckSquare className="w-4 h-4" />
              Action Items
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 p-4">
            {detail.actionItems.map((item) => (
              <div key={item.id} className="flex items-start gap-3 py-2 border-b last:border-0">
                <span className={cn(
                  'mt-1.5 w-2 h-2 rounded-full shrink-0',
                  item.priority === 'high' ? 'bg-red-500'
                    : item.priority === 'medium' ? 'bg-amber-500'
                    : 'bg-gray-400'
                )} />
                <div className="flex-1 min-w-0">
                  <p className={cn('text-sm font-medium', item.status === 'completed' && 'line-through text-muted-foreground')}>
                    {item.description}
                  </p>
                  <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-muted-foreground">
                    {item.assignee && <span>Assigned: {item.assignee}</span>}
                    {item.due_date && <span>Due: {formatDate(item.due_date)}</span>}
                    <ActionStatusSelect
                      id={item.id}
                      status={item.status as ActionStatus}
                      onChange={onActionStatusChange}
                    />
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Risks */}
      {detail.risks.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Risk Assessment
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 p-4">
            {detail.risks.map((risk) => (
              <div key={risk.id} className="flex items-start gap-3 py-2 border-b last:border-0">
                <AlertTriangle className={cn(
                  'w-4 h-4 mt-0.5 shrink-0',
                  risk.level === 'high' ? 'text-red-500'
                    : risk.level === 'medium' ? 'text-amber-500'
                    : 'text-gray-400'
                )} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{risk.description}</p>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    {risk.category && <Badge variant="outline" className="text-xs">{risk.category}</Badge>}
                    {risk.mitigation && (
                      <span className="text-xs text-muted-foreground">Mitigation: {risk.mitigation}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Key decisions */}
      {decisions.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Key Decisions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 p-4">
            {visibleDecisions.map((dec) => (
              <div key={dec.id} className="py-2 border-b last:border-0">
                <p className="text-sm font-medium">{dec.description}</p>
                {dec.made_by && <p className="text-xs text-muted-foreground mt-0.5">Made by: {dec.made_by}</p>}
              </div>
            ))}
            {decisions.length > 3 && (
              <button
                className="text-sm text-blue-600 hover:underline flex items-center gap-1 mt-2"
                onClick={() => setShowAll((s) => !s)}
              >
                {showAll
                  ? <><ChevronUp className="w-3 h-3" /> Show less</>
                  : <><ChevronDown className="w-3 h-3" /> Show {decisions.length - 3} more</>}
              </button>
            )}
          </CardContent>
        </Card>
      )}

      {!ed && detail.utilities.length === 0 && detail.actionItems.length === 0 && (
        <div className="py-12 text-center text-muted-foreground">
          <p>No extracted data yet. Processing may still be in progress.</p>
        </div>
      )}
    </div>
  )
}

// ─── Transcript Tab ───────────────────────────────────────────────────────────

function formatSeconds(s: number) {
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}

function highlightText(text: string, query: string) {
  const idx = text.toLowerCase().indexOf(query.toLowerCase())
  if (idx === -1) return <>{text}</>
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-yellow-200 rounded px-0.5">{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  )
}

const SPEAKER_COLORS = [
  'text-blue-700 bg-blue-50',
  'text-purple-700 bg-purple-50',
  'text-green-700 bg-green-50',
  'text-amber-700 bg-amber-50',
  'text-pink-700 bg-pink-50',
]

function TranscriptTab({ segments }: { segments: TranscriptSegment[] }) {
  const [query, setQuery] = useState('')

  const speakerColors: Record<string, string> = {}
  let colorIdx = 0
  segments.forEach((s) => {
    if (s.speaker && !speakerColors[s.speaker]) {
      speakerColors[s.speaker] = SPEAKER_COLORS[colorIdx++ % SPEAKER_COLORS.length]
    }
  })

  const filtered = query.trim()
    ? segments.filter(
        (s) =>
          s.text.toLowerCase().includes(query.toLowerCase()) ||
          s.speaker.toLowerCase().includes(query.toLowerCase())
      )
    : segments

  if (!segments || segments.length === 0) {
    return <p className="py-12 text-center text-muted-foreground">No transcript available.</p>
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search transcript..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full pl-9 pr-4 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {query && (
        <p className="text-xs text-muted-foreground">
          {filtered.length} segment{filtered.length !== 1 ? 's' : ''} match
        </p>
      )}

      <div className="space-y-0.5">
        {filtered.map((seg) => (
          <div key={seg.id} className="flex gap-3 py-2 border-b last:border-0 hover:bg-gray-50 rounded px-2 group">
            <div className="shrink-0 w-12 text-right">
              <span className="text-xs text-muted-foreground font-mono group-hover:text-gray-600">
                {formatSeconds(seg.timestamp_seconds)}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              {seg.speaker && (
                <span className={cn('text-xs font-semibold px-1.5 py-0.5 rounded mr-2', speakerColors[seg.speaker] ?? 'text-gray-700 bg-gray-100')}>
                  {seg.speaker}
                </span>
              )}
              <span className="text-sm text-gray-800">
                {query.trim() ? highlightText(seg.text, query) : seg.text}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Chat Tab ─────────────────────────────────────────────────────────────────

const SUGGESTIONS = [
  'What are the highest-priority action items?',
  'Summarize the utility conflicts for this project',
  'What risks could delay the letting date?',
  'Who is responsible for each action item?',
]

function ChatTab({ meetingId }: { meetingId: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [error, setError] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    api.chat.history(meetingId).then((msgs) => setMessages(msgs)).catch(() => {})
  }, [meetingId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = async () => {
    const text = input.trim()
    if (!text || streaming) return

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      created_at: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setError('')
    setStreaming(true)

    const assistantMsg: ChatMessage = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: '',
      created_at: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, assistantMsg])

    try {
      for await (const chunk of api.chat.send(meetingId, text)) {
        setMessages((prev) => {
          const copy = [...prev]
          const last = copy[copy.length - 1]
          copy[copy.length - 1] = { ...last, content: last.content + chunk }
          return copy
        })
      }
    } catch {
      setError('Failed to get a response. Please try again.')
      setMessages((prev) => prev.slice(0, -1))
    } finally {
      setStreaming(false)
    }
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  return (
    <div className="flex flex-col h-[600px]">
      <ScrollArea className="flex-1 pr-2">
        <div className="space-y-4 pb-4">
          {messages.length === 0 && (
            <div className="py-8 text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mx-auto">
                <MessageSquare className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="font-medium text-gray-700">Ask Sidecar</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Ask anything about this meeting's transcript and extracted data.
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => { setInput(s); inputRef.current?.focus() }}
                    className="text-xs px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-full text-gray-700 transition-colors text-left"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg) => (
            <div key={msg.id} className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
              <div
                className={cn(
                  'max-w-[80%] px-4 py-3 rounded-2xl text-sm whitespace-pre-wrap',
                  msg.role === 'user'
                    ? 'bg-blue-600 text-white rounded-br-sm'
                    : 'bg-gray-100 text-gray-900 rounded-bl-sm'
                )}
              >
                {msg.content || (streaming && msg.role === 'assistant' ? (
                  <span className="inline-flex gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </span>
                ) : '')}
              </div>
            </div>
          ))}

          {error && <p className="text-xs text-red-600 text-center">{error}</p>}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      <Separator className="my-3" />

      <div className="flex gap-2 items-end">
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Ask about this meeting..."
          rows={1}
          disabled={streaming}
          className="flex-1 resize-none text-sm border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 min-h-[38px] max-h-32"
          onInput={(e) => {
            const el = e.currentTarget
            el.style.height = 'auto'
            el.style.height = Math.min(el.scrollHeight, 128) + 'px'
          }}
        />
        <Button size="sm" onClick={send} disabled={!input.trim() || streaming} className="shrink-0">
          {streaming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </Button>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function MeetingDetailPage() {
  const params = useParams<{ id: string }>()
  const id = params.id
  const [detail, setDetail] = useState<MeetingDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchDetail = useCallback((meetingId: string) => {
    return api.meetings
      .get(meetingId)
      .then((d) => setDetail(d))
      .catch(() => {
        const mock = mockMeetingDetails[meetingId as keyof typeof mockMeetingDetails]
        if (mock) setDetail(mock)
      })
  }, [])

  useEffect(() => {
    if (!id) return
    fetchDetail(id).finally(() => setLoading(false))
  }, [id, fetchDetail])

  // Poll while processing
  useEffect(() => {
    if (!id || !detail) return
    if (detail.status !== 'processing') {
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
      return
    }
    if (pollRef.current) return // already polling
    pollRef.current = setInterval(async () => {
      try {
        const s = await api.upload.status(id)
        if (s.status === 'completed' || s.status === 'error') {
          clearInterval(pollRef.current!); pollRef.current = null
          fetchDetail(id)
        }
      } catch { /* keep polling */ }
    }, 4000)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [id, detail?.status, fetchDetail])

  const handleActionStatusChange = useCallback(async (itemId: string, status: ActionStatus) => {
    await api.actionItems.updateStatus(itemId, status)
    setDetail((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        actionItems: prev.actionItems.map((a) => a.id === itemId ? { ...a, status } : a),
      }
    })
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!detail) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">Meeting not found.</p>
        <Link href="/">
          <Button variant="outline" className="mt-4">Back to Dashboard</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Processing banner */}
      {detail.status === 'processing' && (
        <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-sm text-blue-800">
          <RefreshCw className="w-4 h-4 animate-spin shrink-0" />
          <span>Processing audio — transcribing and extracting meeting data. This page will update automatically.</span>
        </div>
      )}

      <div>
        <Link href="/">
          <button className="flex items-center gap-1 text-sm text-muted-foreground hover:text-gray-900 mb-4">
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </button>
        </Link>

        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-mono text-muted-foreground">{detail.contract_number}</span>
              <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', statusColor(detail.status))}>
                {detail.status}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">{detail.project_title}</h1>
            <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4" />{detail.location}</span>
              <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4" />{formatDate(detail.date)}</span>
              <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" />{formatDuration(detail.duration ?? 0)}</span>
              <span className="flex items-center gap-1.5"><Users className="w-4 h-4" />{detail.participants.length} participants</span>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            {(detail.open_actions ?? 0) > 0 && (
              <Badge variant="warning">{detail.open_actions} open actions</Badge>
            )}
            {(detail.high_risks ?? 0) > 0 && (
              <Badge variant="destructive">{detail.high_risks} high risk</Badge>
            )}
          </div>
        </div>
      </div>

      {detail.participants.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {detail.participants.map((p, i) => (
            <span key={i} className="text-xs bg-gray-100 text-gray-700 px-2.5 py-1 rounded-full">{p}</span>
          ))}
        </div>
      )}

      <Tabs defaultValue="data">
        <TabsList className="grid w-full grid-cols-3 max-w-md">
          <TabsTrigger value="data">Extracted Data</TabsTrigger>
          <TabsTrigger value="transcript">Transcript</TabsTrigger>
          <TabsTrigger value="chat">Ask Sidecar</TabsTrigger>
        </TabsList>

        <TabsContent value="data" className="mt-6">
          <ExtractedDataTab detail={detail} onActionStatusChange={handleActionStatusChange} />
        </TabsContent>

        <TabsContent value="transcript" className="mt-6">
          <TranscriptTab segments={detail.transcript ?? []} />
        </TabsContent>

        <TabsContent value="chat" className="mt-6">
          <ChatTab meetingId={id!} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
