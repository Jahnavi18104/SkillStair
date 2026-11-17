import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import Choice from '../components/Choice'

const ROLES = ['Java Full Stack Developer', 'Python Developer', 'Machine Learning Engineer', 'Data Analyst']
const LEVELS = ['Fresher', 'Intermediate', 'Experienced']
const TYPES = ['Technical Interview', 'Behavioral Interview', 'Mixed Interview']
const COUNTS = ['5 questions — Quick practice', '10 questions — Full practice']

export default function StartInterview() {
  const nav = useNavigate()
  const [f, setF] = useState({ role: ROLES[0], level: LEVELS[0], type: TYPES[2], count: COUNTS[0] })
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const set = k => v => setF({ ...f, [k]: v })

  async function go() {
    setBusy(true); setErr('')
    try {
      const r = await api('/interviews', 'POST', { ...f, count: parseInt(f.count) })
      nav('/interview/' + r.id)
    } catch (e) { setErr(e.message); setBusy(false) }
  }

  return (
    <>
      <h1>Set Up Your Mock Interview</h1>
      <p>Customize your interview based on your career goals.</p>
      <div className="card">
        <label>Choose your job role</label><Choice options={ROLES} value={f.role} onChange={set('role')} />
        <label>Experience level</label><Choice options={LEVELS} value={f.level} onChange={set('level')} />
        <label>Interview type</label><Choice options={TYPES} value={f.type} onChange={set('type')} />
        <label>Number of questions</label><Choice options={COUNTS} value={f.count} onChange={set('count')} />
      </div>
      <div className="card ai">
        <h3>Interview summary</h3>
        <p>Role: {f.role}<br />Level: {f.level}<br />Type: {f.type}<br />Questions: {parseInt(f.count)} questions</p>
        {err && <p className="err">{err}</p>}
        <button className="btn" disabled={busy} onClick={go}>{busy ? 'Preparing…' : 'Continue to Interview'}</button>
      </div>
    </>
  )
}
