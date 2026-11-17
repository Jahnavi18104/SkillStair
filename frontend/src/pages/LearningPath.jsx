import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { api } from '../api'
import Choice from '../components/Choice'

const GOALS = ['Java Full Stack Developer', 'Machine Learning Engineer', 'Data Analyst', 'Python Developer']
const LEVELS = ['Beginner', 'Intermediate', 'Advanced']
const DURATIONS = ['2 weeks', '4 weeks', '8 weeks']
const HOURS = ['3-5 hours', '8-10 hours', '12-15 hours']
const FOCUS = ['Interview preparation', 'Practical projects', 'Core technical skills']

export default function LearningPath() {
  const nav = useNavigate()
  const loc = useLocation()
  const [f, setF] = useState({ goal: GOALS[0], level: LEVELS[0], duration: DURATIONS[1], hours: HOURS[1], focus: FOCUS[0], topics: loc.state?.topics || '' })
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const set = k => v => setF(p => ({ ...p, [k]: v }))

  useEffect(() => {
    if (loc.state?.topics) return
    api('/weak-topics').then(t => { if (Array.isArray(t) && t.length) set('topics')(t.map(x => x.topic).join(', ')) }).catch(() => {})
  }, [])

  async function go() {
    setBusy(true); setErr('')
    try {
      await api('/learning-paths', 'POST', { goal: f.goal, level: f.level, weeks: parseInt(f.duration), hours: f.hours, focus: f.focus, topics: f.topics })
      nav('/roadmap')
    } catch (e) { setErr(e.message); setBusy(false) }
  }

  return (
    <>
      <h1>Build Your Personalized Learning Path</h1>
      <p>Tell us where you want to go. We'll help you plan how to get there.</p>
      <div className="card">
        <label>What is your career goal?</label><Choice options={GOALS} value={f.goal} onChange={set('goal')} />
        <label>Current skill level</label><Choice options={LEVELS} value={f.level} onChange={set('level')} />
        <label>Roadmap duration</label><Choice options={DURATIONS} value={f.duration} onChange={set('duration')} />
        <label>Time available per week</label><Choice options={HOURS} value={f.hours} onChange={set('hours')} />
        <label>Primary learning focus</label><Choice options={FOCUS} value={f.focus} onChange={set('focus')} />
        <label>Topics I Want to Improve (optional)</label>
        <input value={f.topics} onChange={e => set('topics')(e.target.value)} placeholder="e.g. Java Collections, JDBC, REST APIs" />
        <p className="muted">Prefilled from your interview feedback when available. Separate topics with commas.</p>
      </div>
      <div className="card ai">
        <h3>Your learning preferences</h3>
        <p>Goal: {f.goal}<br />Level: {f.level}<br />Duration: {f.duration}<br />Available time: {f.hours} per week<br />Focus: {f.focus}</p>
        {err && <p className="err">{err}</p>}
        <div className="row"><button className="btn" disabled={busy} onClick={go}>{busy ? 'Generating…' : 'Generate My Learning Path'}</button><Link to="/roadmap">View current roadmap</Link></div>
      </div>
    </>
  )
}
