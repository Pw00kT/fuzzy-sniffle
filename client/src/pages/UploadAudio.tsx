import { useCallback, useRef, useState } from 'react'
import { useLocation } from 'wouter'
import { Upload, FileAudio, CheckCircle2, AlertCircle, X, Loader2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'

type UploadState = 'idle' | 'uploading' | 'processing' | 'done' | 'error'

const ACCEPTED = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/m4a', 'audio/x-m4a',
  'audio/mp4', 'audio/ogg', 'audio/webm', 'video/mp4', 'video/webm']
const ACCEPTED_EXT = '.mp3,.wav,.m4a,.mp4,.ogg,.webm'
const MAX_MB = 500

export default function UploadAudio() {
  const [, navigate] = useLocation()
  const [file, setFile] = useState<File | null>(null)
  const [uploadState, setUploadState] = useState<UploadState>('idle')
  const [uploadPct, setUploadPct] = useState(0)
  const [processingStatus, setProcessingStatus] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const formatSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const validateFile = (f: File): string | null => {
    if (!ACCEPTED.includes(f.type) && !f.name.match(/\.(mp3|wav|m4a|mp4|ogg|webm)$/i)) {
      return 'Unsupported file type. Please upload an MP3, WAV, M4A, MP4, OGG, or WebM file.'
    }
    if (f.size > MAX_MB * 1024 * 1024) {
      return `File too large. Maximum size is ${MAX_MB} MB.`
    }
    return null
  }

  const handleFile = (f: File) => {
    const err = validateFile(f)
    if (err) {
      setErrorMsg(err)
      setUploadState('error')
      return
    }
    setFile(f)
    setUploadState('idle')
    setErrorMsg('')
    setUploadPct(0)
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const f = e.dataTransfer.files[0]
    if (f) handleFile(f)
  }, [])

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) handleFile(f)
  }

  const reset = () => {
    setFile(null)
    setUploadState('idle')
    setUploadPct(0)
    setProcessingStatus('')
    setErrorMsg('')
    if (inputRef.current) inputRef.current.value = ''
  }

  const startUpload = async () => {
    if (!file) return
    setUploadState('uploading')
    setUploadPct(0)
    setErrorMsg('')

    try {
      const res = await api.upload.audio(file, (pct) => setUploadPct(pct))
      const meetingId = res.meetingId
      setUploadState('processing')
      setProcessingStatus('Transcribing audio...')

      let attempts = 0
      const poll = setInterval(async () => {
        attempts++
        try {
          const status = await api.upload.status(meetingId)
          if (status.step) setProcessingStatus(status.step)

          if (status.status === 'completed') {
            clearInterval(poll)
            setUploadState('done')
            setTimeout(() => navigate(`/meeting/${meetingId}`), 1000)
          } else if (status.status === 'failed') {
            clearInterval(poll)
            setErrorMsg(status.error ?? 'Processing failed. Please try again.')
            setUploadState('error')
          } else if (attempts > 120) {
            clearInterval(poll)
            navigate(`/meeting/${meetingId}`)
          }
        } catch {
          if (attempts > 10) {
            clearInterval(poll)
            navigate(`/meeting/${meetingId}`)
          }
        }
      }, 3000)
    } catch (err: any) {
      setErrorMsg(err?.message ?? 'Upload failed. Please check your connection and try again.')
      setUploadState('error')
    }
  }

  const isActive = uploadState === 'uploading' || uploadState === 'processing'

  return (
    <div className="space-y-8 max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Upload Audio</h1>
        <p className="text-muted-foreground mt-1">Upload a meeting recording for transcription and analysis</p>
      </div>

      {/* Drop zone */}
      <Card
        className={cn(
          'border-2 border-dashed transition-colors cursor-pointer',
          dragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300',
          file && uploadState === 'idle' && 'border-green-400 bg-green-50',
          isActive && 'cursor-not-allowed opacity-80'
        )}
        onClick={() => !isActive && !file && inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); if (!isActive) setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={!isActive ? onDrop : undefined}
      >
        <CardContent className="p-10">
          {!file ? (
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
                <Upload className="w-8 h-8 text-gray-400" />
              </div>
              <div>
                <p className="font-semibold text-gray-700">Drop your audio file here</p>
                <p className="text-sm text-muted-foreground mt-1">or click to browse</p>
              </div>
              <p className="text-xs text-muted-foreground">MP3, WAV, M4A, MP4, OGG, WebM — up to {MAX_MB} MB</p>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                <FileAudio className="w-6 h-6 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 truncate">{file.name}</p>
                <p className="text-sm text-muted-foreground">{formatSize(file.size)}</p>
              </div>
              {!isActive && uploadState !== 'done' && (
                <button onClick={(e) => { e.stopPropagation(); reset() }} className="text-gray-400 hover:text-gray-600 p-1">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_EXT}
        onChange={onInputChange}
        className="hidden"
      />

      {/* Progress */}
      {(uploadState === 'uploading' || uploadState === 'processing') && (
        <Card>
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                <span className="font-medium">
                  {uploadState === 'uploading' ? `Uploading... ${uploadPct}%` : processingStatus || 'Processing...'}
                </span>
              </div>
              {uploadState === 'uploading' && (
                <span className="text-muted-foreground">{uploadPct}%</span>
              )}
            </div>
            {uploadState === 'uploading' && (
              <Progress value={uploadPct} className="h-2" />
            )}
            {uploadState === 'processing' && (
              <div className="space-y-1.5">
                {['Transcribing audio', 'Extracting meeting data', 'Identifying action items', 'Assessing risks'].map((step, i) => {
                  const stepDone = processingStatus.toLowerCase().includes('risk') ? i <= 3
                    : processingStatus.toLowerCase().includes('action') ? i <= 2
                    : processingStatus.toLowerCase().includes('extract') ? i <= 1
                    : i <= 0
                  return (
                    <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                      <div className={cn('w-1.5 h-1.5 rounded-full', stepDone ? 'bg-green-500' : 'bg-gray-300')} />
                      {step}
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Done */}
      {uploadState === 'done' && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-5 flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
            <div>
              <p className="font-medium text-green-800">Processing complete!</p>
              <p className="text-sm text-green-700">Redirecting to meeting detail...</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error */}
      {uploadState === 'error' && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-5 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-red-800">Error</p>
              <p className="text-sm text-red-700">{errorMsg}</p>
            </div>
            <Button variant="outline" size="sm" onClick={reset}>Try again</Button>
          </CardContent>
        </Card>
      )}

      {/* Upload button */}
      {file && uploadState === 'idle' && (
        <Button className="w-full" onClick={startUpload}>
          <Upload className="w-4 h-4 mr-2" />
          Upload &amp; Process Meeting
        </Button>
      )}

      {!file && uploadState !== 'error' && (
        <Button variant="outline" className="w-full" onClick={() => inputRef.current?.click()}>
          Browse files
        </Button>
      )}

      {/* Info */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <p className="text-sm font-medium text-blue-800 mb-2">What happens after upload?</p>
          <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
            <li>Audio is transcribed using OpenAI Whisper with speaker diarization</li>
            <li>Claude analyzes the transcript to extract project details, utilities, and risks</li>
            <li>Action items, key decisions, and risk assessments are automatically generated</li>
            <li>You can chat with the meeting using Ask Sidecar on the detail page</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  )
}
