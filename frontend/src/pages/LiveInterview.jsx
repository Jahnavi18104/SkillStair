import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../api'
import Bar from '../components/Bar'

const SR = window.SpeechRecognition || window.webkitSpeechRecognition

export default function LiveInterview() {
  const { id } = useParams()
  const nav = useNavigate()
  const [s, setS] = useState(null)
  const [i, setI] = useState(0)
  const [text, setText] = useState('')
  const [saved, setSaved] = useState({})
  const [method, setMethod] = useState('text')
  const [rec, setRec] = useState(false)
  const [msg, setMsg] = useState({ t: '', ok: false })
  const [secs, setSecs] = useState(0)
  const [busy, setBusy] = useState(false)
  const recog = useRef(null)
  const base = useRef('')
  const box = useRef(null)

  useEffect(() => {
    api('/interviews/' + id).then(d => {
      setS(d)
      const m = {}
      d.questions.forEach(q => { if (q.transcript) m[q.id] = q.transcript })
      setSaved(m); setText(m[d.questions[0].id] || '')
    }).catch(e => setMsg({ t: e.message, ok: false }))
  }, [id])
  useEffect(() => { const t = setInterval(() => setSecs(x => x + 1), 1000); return () => clearInterval(t) }, [])
  useEffect(() => () => recog.current && recog.current.stop(), [])

  if (!s) return <p className={msg.t ? 'err' : ''}>{msg.t || 'Loading…'}</p>
  const n = s.questions.length
  const q = s.questions[i]
  const pct = Math.round(((i + 1) / n) * 100)
  const mmss = `${String(Math.floor(secs / 60)).padStart(2, '0')}:${String(secs % 60).padStart(2, '0')}`

  function stop() { if (recog.current) recog.current.stop(); setRec(false) }

  function start() {
    if (!SR) return setMsg({ t: 'Speech recognition is not supported in this browser. Please type your answer instead.', ok: false })
    const r = new SR()
    r.lang = 'en-US'; r.continuous = true; r.interimResults = true
    base.current = text ? text.trim() + ' ' : ''
    r.onresult = e => {
      let t = ''
      for (let k = 0; k < e.results.length; k++) t += e.results[k][0].transcript
      setText(base.current + t); setMethod('speech')
    }
    r.onerror = () => { setRec(false); setMsg({ t: 'Microphone problem. Check permission or type your answer instead.', ok: false }) }
    r.onend = () => setRec(false)
    r.start(); recog.current = r; setRec(true); setMsg({ t: '', ok: false })
  }

  function go(k) { stop(); setI(k); setText(saved[s.questions[k].id] || ''); setMsg({ t: '', ok: false }) }

  async function submit() {
    stop(); setBusy(true); setMsg({ t: '', ok: false })
    try {
      await api(`/interviews/${id}/answers`, 'POST', { questionId: q.id, transcript: text, inputMethod: method })
      setSaved(p => ({ ...p, [q.id]: text })); setMsg({ t: 'Answer submitted and evaluated.', ok: true })
      return true
    } catch (e) { setMsg({ t: e.message, ok: false }); return false } finally { setBusy(false) }
  }

  const dirty = () => text.trim() && text !== saved[q.id]

  async function next() {
    if (dirty() && !(await submit())) return
    if (i < n - 1) go(i + 1)
  }

  async function finish() {
    if (!window.confirm('Finish the interview now? Unanswered questions will not be scored.')) return
    if (dirty() && !(await submit())) return
    try { await api(`/interviews/${id}/finish`, 'POST'); nav('/results/' + id) } catch (e) { setMsg({ t: e.message, ok: false }) }
  }

  return (
    <>
      <div className="card">
        <div className="row between"><span><b>Role:</b> {s.role}</span><span><b>Type:</b> {s.type}</span><span className="muted">⏱ {mmss}</span></div>
        <p style={{ margin: '.6rem 0 .3rem' }}>Question {i + 1} of {n}</p>
        <Bar value={pct} />
      </div>

      <div className="card">
        <span className="badge">{q.category === 'BEHAVIORAL' ? 'Behavioral Question' : 'Technical Question'}</span>
        <h2 style={{ marginTop: '.7rem' }}>{q.text}</h2>
        <label>Your answer</label>
        <p className="muted">Speak clearly, or type your answer. You can review and edit the transcript before submitting.</p>
        <div className="row">
          {!rec ? <button className="btn" onClick={start}>Start Recording</button> : <button className="btn" onClick={stop} style={{ background: '#dc2626' }}>Stop Recording</button>}
          <button className="btn ghost" onClick={() => { stop(); setMethod('text'); box.current && box.current.focus() }}>Type Answer Instead</button>
          {rec && <span className="badge">● Listening…</span>}
        </div>
        <textarea ref={box} style={{ marginTop: '1rem' }} value={text} placeholder="Your transcript or typed answer appears here."
          onChange={e => { setText(e.target.value); if (!rec) setMethod(m => m) }} />
        <div className="row" style={{ marginTop: '.8rem' }}>
          <button className="btn ghost" onClick={() => box.current && box.current.focus()}>Edit Transcript</button>
          <button className="btn ghost" onClick={() => { stop(); setText('') }}>Clear Answer</button>
          <button className="btn" disabled={busy || !text.trim()} onClick={submit}>{busy ? 'Evaluating…' : 'Submit Answer'}</button>
        </div>
        {msg.t && <p className={msg.ok ? 'ok' : 'err'}>{msg.t}</p>}
        {saved[q.id] && !msg.t && <p className="ok">This answer has been submitted.</p>}
      </div>

      <div className="row between">
        <button className="btn ghost" disabled={i === 0} onClick={() => go(i - 1)}>Previous Question</button>
        <button className="btn" disabled={busy || i === n - 1} onClick={next}>Save Answer &amp; Next</button>
        <button className="btn ghost" onClick={finish}>Finish Interview</button>
      </div>
    </>
  )
}
