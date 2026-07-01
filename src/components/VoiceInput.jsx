import { useState, useEffect, useRef, useCallback } from 'react'
import { Mic, MicOff } from 'lucide-react'

export default function VoiceInput() {
  const [listening, setListening] = useState(false)
  const [supported, setSupported] = useState(false)
  const [interim, setInterim] = useState('')
  const recognitionRef = useRef(null)
  const targetRef = useRef(null)

  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) return
    setSupported(true)

    const recognition = new SR()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-US'

    recognition.onresult = (e) => {
      let finalText = ''
      let interimText = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const transcript = e.results[i][0].transcript
        if (e.results[i].isFinal) {
          finalText += transcript
        } else {
          interimText += transcript
        }
      }

      setInterim(interimText)

      if (finalText) {
        const target = targetRef.current
        if (target) {
          const start = target.selectionStart ?? target.value.length
          const end = target.selectionEnd ?? target.value.length
          const before = target.value.substring(0, start)
          const after = target.value.substring(end)
          const needsSpace = before.length > 0 && !before.endsWith(' ') && !before.endsWith('\n')
          const newText = (needsSpace ? ' ' : '') + finalText

          // Use native input setter to work with React controlled inputs
          const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
            window.HTMLTextAreaElement.prototype, 'value'
          )?.set || Object.getOwnPropertyDescriptor(
            window.HTMLInputElement.prototype, 'value'
          )?.set

          if (nativeInputValueSetter) {
            nativeInputValueSetter.call(target, before + newText + after)
          } else {
            target.value = before + newText + after
          }

          target.dispatchEvent(new Event('input', { bubbles: true }))
          target.dispatchEvent(new Event('change', { bubbles: true }))

          const newPos = start + newText.length
          target.setSelectionRange(newPos, newPos)
          target.focus()
        }
      }
    }

    recognition.onerror = (e) => {
      if (e.error !== 'aborted') {
        setListening(false)
        setInterim('')
      }
    }

    recognition.onend = () => {
      setListening(false)
      setInterim('')
    }

    recognitionRef.current = recognition

    return () => {
      recognition.abort()
    }
  }, [])

  // Track which input is focused
  useEffect(() => {
    const handleFocus = (e) => {
      const tag = e.target.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') {
        targetRef.current = e.target
      }
    }
    document.addEventListener('focusin', handleFocus)
    return () => document.removeEventListener('focusin', handleFocus)
  }, [])

  const toggle = useCallback(() => {
    const rec = recognitionRef.current
    if (!rec) return

    if (listening) {
      rec.stop()
      setListening(false)
      setInterim('')
    } else {
      // Re-grab the currently focused element
      const active = document.activeElement
      if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) {
        targetRef.current = active
      }
      try {
        rec.start()
        setListening(true)
      } catch {
        // Already started
      }
    }
  }, [listening])

  if (!supported) return null

  return (
    <>
      <button
        onClick={toggle}
        title={listening ? 'Stop listening' : 'Voice input — tap then speak into any field'}
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          width: '52px',
          height: '52px',
          borderRadius: '50%',
          border: 'none',
          background: listening ? '#ef4444' : 'var(--accent)',
          color: 'white',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: listening
            ? '0 0 0 4px rgba(239,68,68,0.3), 0 4px 16px rgba(0,0,0,0.3)'
            : '0 4px 16px rgba(0,0,0,0.3)',
          zIndex: 9999,
          transition: 'all 0.2s',
          animation: listening ? 'micPulse 1.5s ease-in-out infinite' : 'none',
        }}
      >
        {listening ? <MicOff size={22} /> : <Mic size={22} />}
      </button>

      {listening && interim && (
        <div style={{
          position: 'fixed',
          bottom: '84px',
          right: '20px',
          maxWidth: '300px',
          padding: '10px 14px',
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
          boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
          zIndex: 9998,
          fontSize: '13px',
          color: 'var(--text-secondary)',
          fontStyle: 'italic',
        }}>
          {interim}
        </div>
      )}

      {listening && (
        <div style={{
          position: 'fixed',
          bottom: '84px',
          right: '20px',
          transform: 'translateX(-50%)',
          left: '50%',
          right: 'auto',
          padding: '8px 16px',
          background: 'rgba(239,68,68,0.1)',
          border: '1px solid rgba(239,68,68,0.3)',
          borderRadius: '20px',
          zIndex: 9997,
          fontSize: '12px',
          color: '#ef4444',
          fontWeight: 600,
          textAlign: 'center',
        }}>
          Listening... speak into any input field
        </div>
      )}

      <style>{`
        @keyframes micPulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.08); }
        }
      `}</style>
    </>
  )
}
