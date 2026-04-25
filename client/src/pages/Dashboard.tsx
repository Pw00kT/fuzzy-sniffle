import { useEffect, useState } from 'react'
import { Link } from 'wouter'
import { BarChart2, CheckSquare, AlertTriangle, Clock, ArrowRight, Calendar, MapPin, Users } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api'
import { mockMeetings, mockMetrics } from '@/lib/mock-data'
import { formatDate, formatDuration, statusColor, cn } from '@/lib/utils'
import type { Meeting, Metrics } from '@/lib/types'

function MetricCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: number; color: string }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="text-3xl font-bold mt-1">{value}</p>
          </div>
          <div className={cn('p-3 rounded-full', color)}>
            <Icon className="w-6 h-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default function Dashboard() {
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [metrics, setMetrics] = useState<Metrics>(mockMetrics)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.meetings.list().catch(() => ({ meetings: mockMeetings })),
      api.metrics().catch(() => mockMetrics),
    ]).then(([meetingsRes, metricsRes]) => {
      setMeetings(meetingsRes.meetings)
      setMetrics(metricsRes)
      setLoading(false)
    })
  }, [])

  const priorityActions = meetings
    .flatMap(() => []) // loaded separately via meeting detail; use mock for summary

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-muted-foreground mt-1">IDOT Utility Coordination Overview</p>
        </div>
        <div className="flex gap-3">
          <Link href="/record">
            <Button variant="outline" size="sm">
              <span className="w-2 h-2 rounded-full bg-red-500 mr-2" />
              Record Meeting
            </Button>
          </Link>
          <Link href="/upload">
            <Button size="sm">Upload Audio</Button>
          </Link>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard icon={BarChart2} label="Meetings Processed" value={metrics.totalMeetings} color="bg-blue-50 text-blue-600" />
        <MetricCard icon={CheckSquare} label="Open Action Items" value={metrics.openActions} color="bg-orange-50 text-orange-600" />
        <MetricCard icon={AlertTriangle} label="High Risks" value={metrics.highRisks} color="bg-red-50 text-red-600" />
        <MetricCard icon={Clock} label="Upcoming Deadlines" value={metrics.upcomingDeadlines} color="bg-amber-50 text-amber-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Meetings */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Recent Meetings</h2>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Card key={i}><CardContent className="p-5"><div className="h-16 bg-gray-100 animate-pulse rounded" /></CardContent></Card>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {meetings.map((meeting) => (
                <Link key={meeting.id} href={`/meeting/${meeting.id}`}>
                  <Card className="hover:shadow-md transition-shadow cursor-pointer group">
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-mono text-muted-foreground">{meeting.contract_number}</span>
                            <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', statusColor(meeting.status))}>
                              {meeting.status}
                            </span>
                          </div>
                          <p className="font-semibold text-gray-900 truncate">{meeting.project_title}</p>
                          <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{meeting.location}</span>
                            <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{formatDate(meeting.date)}</span>
                            <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{formatDuration(meeting.duration)}</span>
                            <span className="flex items-center gap-1"><Users className="w-3 h-3" />{meeting.participants.length} participants</span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2 shrink-0">
                          {(meeting.open_actions ?? 0) > 0 && (
                            <Badge variant="warning">{meeting.open_actions} open actions</Badge>
                          )}
                          {(meeting.high_risks ?? 0) > 0 && (
                            <Badge variant="destructive">{meeting.high_risks} high risk</Badge>
                          )}
                          <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors mt-1" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Right column: quick stats */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Priority Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {meetings.flatMap((m) => []).length === 0 ? (
                <p className="text-sm text-muted-foreground">Open a meeting to see its action items.</p>
              ) : null}
              {/* Show sample from mock for demo */}
              {[
                { desc: 'ComEd to submit relocation cost estimate', assignee: 'Tom Reynolds', due: 'Dec 15', priority: 'high' },
                { desc: 'Field verify Peoples Gas conflict at MP 24.8', assignee: 'Mike Chen', due: 'Dec 8', priority: 'high' },
                { desc: 'IDOT to confirm remaining ROW parcels', assignee: 'Sarah Mitchell', due: 'Dec 20', priority: 'medium' },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-3 py-2 border-b last:border-0">
                  <span className={cn('mt-1 w-2 h-2 rounded-full shrink-0', item.priority === 'high' ? 'bg-red-500' : 'bg-amber-500')} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium leading-tight">{item.desc}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{item.assignee} · Due {item.due}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Active Risks</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { desc: 'ComEd relocation may delay March 2025 letting', level: 'high', category: 'Schedule' },
                { desc: 'Joint use agreement negotiations — I-290 Bridge', level: 'high', category: 'Legal' },
                { desc: 'Peoples Gas conflict verification pending', level: 'medium', category: 'Cost' },
              ].map((risk, i) => (
                <div key={i} className="flex items-start gap-3 py-2 border-b last:border-0">
                  <AlertTriangle className={cn('w-4 h-4 mt-0.5 shrink-0', risk.level === 'high' ? 'text-red-500' : 'text-amber-500')} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium leading-tight">{risk.desc}</p>
                    <Badge variant="outline" className="text-xs mt-1">{risk.category}</Badge>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
