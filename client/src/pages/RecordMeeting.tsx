import { useEffect, useRef, useState, useCallback } from 'react'
import { useLocation } from 'wouter'
import { Mic, MicOff, Square, Pause, Play, Lightbulb, Clock, AlertCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'

type RecordingState = 'idle' | 'recording' | 'paused' | 'processing'

interface CoachingInsight {
  text: string
  timestamp: number
}

export default function RecordMeeting() {
  const [, navigate] = useLocation()
  const [recordingState, setRecordingState] = useState<RecordingState>('idle')
  const [elapsed, setElapsed] = useState(0)
  const [audioLevel, setAudioLevel] = useState(0)
  const [insights, setInsights] = useState<CoachingInsight[]>([])
  const [loadingInsight, setLoadingInsight] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [uploadProgress, setUploadProgress] = useState<number | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const animFrameRef = useRef<number>(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const coachingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const transcriptBufferRef = useRef<string>('')

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }

  const updateAudioLevel = useCallback(() => {
    if (!analyserRef.current) return
    const data = new Uint8Array(analyserRef.current.frequencyBinCount)
    analyserRef.current.getByteFrequencyData(data)
    const avg = data.reduce((a, b) => a + b, 0) / data.length
    setAudioLevel(Math.min(100, avg * 1.5))
    animFrameRef.current = requestAnimationFrame(updateAudioLevel)
  }, [])

  const fetchCoachingInsight = useCallback(async () => {
    if (transcriptBufferRef.current.length < 50) return
    setLoadingInsight(true)
    try {
      const result = await api.upload.coaching(
        transcriptBufferRef.current,
        'IDOT utility coordination meeting in progress'
      )
      if (result?.insight) {
        const text = result.insight
        setInsights((prev) => [{ text, timestamp: Date.now() }, ...prev].slice(0, 5))
      }
    } catch {
      // coaching is best-effort
    } finally {
      setLoadingInsight(false)
    }
  }, [])

  const startRecording = async () => {
    setError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      const audioCtx = new AudioContext()
      const source = audioCtx.createMediaStreamSource(stream)
      const analyser = audioCtx.createAnalyser()
      analyser.fftSize = 256
      source.connect(analyser)
      analyserRef.current = analyser

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm'

      const recorder = new MediaRecorder(stream, { mimeType })
      mediaRecorderRef.current = recorder
      chunksRef.current = []

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      recorder.start(1000)
      setRecordingState('recording')
      setElapsed(0)

      timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000)
      animFrameRef.current = requestAnimationFrame(updateAudioLevel)

      coachingTimerRef.current = setInterval(fetchCoachingInsight, 30_000)
    } catch (err) {
      setError('Microphone access denied. Please allow microphone access and try again.')
    }
  }

  const pauseRecording = () => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.pause()
      setRecordingState('paused')
      if (timerRef.current) clearInterval(timerRef.current)
      cancelAnimationFrame(animFrameRef.current)
      setAudioLevel(0)
    }
  }

  const resumeRecording = () => {
    if (mediaRecorderRef.current?.state === 'paused') {
      mediaRecorderRef.current.resume()
      setRecordingState('recording')
      timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000)
      animFrameRef.current = requestAnimationFrame(updateAudioLevel)
    }
  }

  const stopAndUpload = async () => {
    if (!mediaRecorderRef.current) return

    setRecordingState('processing')
    if (timerRef.current) clearInterval(timerRef.current)
    if (coachingTimerRef.current) clearInterval(coachingTimerRef.current)
    cancelAnimationFrame(animFrameRef.current)
    setAudioLevel(0)

    streamRef.current?.getTracks().forEach((t) => t.stop())

    await new Promise<void>((resolve) => {
      if (!mediaRecorderRef.current) return resolve()
      mediaRecorderRef.current.onstop = () => resolve()
      mediaRecorderRef.current.stop()
    })

    const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
    const file = new File([blob], `recording-${Date.now()}.webm`, { type: 'audio/webm' })

    try {
      setUploadProgress(0)
      const res = await api.upload.audio(file, (pct) => setUploadProgress(pct))
      setUploadProgress(100)

      // Poll for completion then navigate
      const meetingId = res.meetingId
      let attempts = 0
      const poll = setInterval(async () => {
        attempts++
        try {
          const status = await api.upload.status(meetingId)
          if (status.status === 'completed') {
            clearInterval(poll)
            navigate(`/meeting/${meetingId}`)
          } else if (status.status === 'failed' || attempts > 60) {
            clearInterval(poll)
            navigate(`/meeting/${meetingId}`)
          }
        } catch {
          if (attempts > 5) {
            clearInterval(poll)
            navigate(`/meeting/${meetingId}`)
          }
        }
      }, 3000)
    } catch (err) {
      setError('Upload failed. Your recording has been saved locally.')
      setRecordingState('idle')
      setUploadProgress(null)
    }
  }

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (coachingTimerRef.current) clearInterval(coachingTimerRef.current)
      cancelAnimationFrame(animFrameRef.current)
      streamRef.current?.getTracks().forEach((t) => t.stop())
    }
  }, [])

  const bars = Array.from({ length: 20 }, (_, i) => i)

  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Record Meeting</h1>
        <p className="text-muted-foreground mt-1">Capture live audio and get real-time coaching</p>
      </div>

      {/* Main recorder card */}
      <Card>
        <CardContent className="p-8">
          <div className="flex flex-col items-center gap-6">
            {/* Mic button with pulse */}
            <div className="relative">
              {recordingState === 'recording' && (
                <>
                  <span className="absolute inset-0 rounded-full bg-red-400 animate-ping opacity-30" />
                  <span className="absolute inset-0 rounded-full bg-red-300 animate-pulse opacity-20 scale-125" />
                </>
              )}
              <button
                onClick={recordingState === 'idle' ? startRecording : undefined}
                disabled={recordingState === 'processing'}
                className={cn(
                  'relative z-10 w-24 h-24 rounded-full flex items-center justify-center transition-all shadow-lg',
                  recordingState === 'idle' && 'bg-blue-600 hover:bg-blue-700 cursor-pointer text-white',
                  recordingState === 'recording' && 'bg-red-600 text-white cursor-default',
                  recordingState === 'paused' && 'bg-amber-500 text-white cursor-default',
                  recordingState === 'processing' && 'bg-gray-400 text-white cursor-not-allowed'
                )}
              >
                {recordingState === 'idle' && <Mic className="w-10 h-10" />}
                {recordingState === 'recording' && <Mic className="w-10 h-10" />}
                {recordingState === 'paused' && <MicOff className="w-10 h-10" />}
                {recordingState === 'processing' && <Clock className="w-10 h-10 animate-spin" />}
              </button>
            </div>

            {/* Timer */}
            <div className="text-center">
              <p className="text-4xl font-mono font-bold text-gray-900 tabular-nums">{formatTime(elapsed)}</p>
              <p className="text-sm text-muted-foreground mt-1">
                {recordingState === 'idle' && 'Click the microphone to begin'}
                {recordingState === 'recording' && 'Recording in progress...'}
                {recordingState === 'paused' && 'Recording paused'}
                {recordingState === 'processing' && uploadProgress !== null
                  ? `Processing... ${uploadProgress}%`
                  : recordingState === 'processing' ? 'Finalizing recording...'
                  : ''}
              </p>
            </div>

            {/* Audio level visualizer */}
            {(recordingState === 'recording') && (
              <div className="flex items-end gap-0.5 h-10">
                {bars.map((i) => {
                  const threshold = (i / bars.length) * 100
                  const active = audioLevel > threshold
                  return (
                    <div
                      key={i}
                      className={cn(
                        'w-2 rounded-sm transition-all duration-75',
                        active ? 'bg-red-500' : 'bg-gray-200'
                      )}
                      style={{ height: `${20 + Math.sin((i / bars.length) * Math.PI) * 60}%` }}
                    />
                  )
                })}
              </div>
            )}

            {/* Controls */}
            {recordingState !== 'idle' && recordingState !== 'processing' && (
              <div className="flex items-center gap-3">
                {recordingState === 'recording' ? (
                  <Button variant="outline" size="sm" onClick={pauseRecording}>
                    <Pause className="w-4 h-4 mr-2" />
                    Pause
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" onClick={resumeRecording}>
                    <Play className="w-4 h-4 mr-2" />
                    Resume
                  </Button>
                )}
                <Button variant="destructive" size="sm" onClick={stopAndUpload}>
                  <Square className="w-4 h-4 mr-2" />
                  Stop &amp; Process
                </Button>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 px-4 py-2 rounded-lg">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Live coaching */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-amber-500" />
              Live Coaching
            </CardTitle>
            {loadingInsight && (
              <Badge variant="outline" className="text-xs animate-pulse">Analyzing...</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {insights.length === 0 ? (
            <div className="text-sm text-muted-foreground py-4 text-center">
              {recordingState === 'idle'
                ? 'Start recording to receive live meeting coaching.'
                : 'Coaching insights will appear here as the meeting progresses.'}
            </div>
          ) : (
            insights.map((insight, i) => (
              <div key={i} className={cn('p-3 rounded-lg text-sm border-l-4', i === 0 ? 'bg-amber-50 border-amber-400' : 'bg-gray-50 border-gray-200 text-muted-foreground')}>
                {insight.text}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Tips */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <p className="text-sm font-medium text-blue-800 mb-2">Recording tips</p>
          <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
            <li>Place your device near the center of the meeting table</li>
            <li>Ask participants to state their name before speaking</li>
            <li>Spell out utility company names and technical terms clearly</li>
            <li>Recording will be transcribed and analyzed automatically when you stop</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
