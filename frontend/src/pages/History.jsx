import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useLoad } from '../api'

export default function History() {
  const { data, error } = useLoad('/interviews')
  const [f, setF] = useState({ role: '', type: '', from: '', to: '', min: '', max: '' })
  const set = k => e => setF({ ...f, [k]: e.target.value })
  if (error) return <p className="err">{error}</p>
  if (!data) return <p>Loading…</p>

  const roles = [...new Set(data.map(r => r.role))]
  const types = [...new Set(data.map(r => r.type))]
  const rows = data.filter(r =>
    (!f.role || r.role === f.role) && (!f.type || r.type === f.type) &&
    (!f.from || r.day >= f.from) && (!f.to || r.day <= f.to) &&
    (f.min === '' || r.score >= +f.min) && (f.max === '' || r.score <= +f.max))

  return (
    <>
      <h1>My Interview History</h1>
      <p>Review your previous practice sessions and track your progress.</p>
      <div className="card">
        <div className="grid g4">
          <div><label>Job role</label><select value={f.role} onChange={set('role')}><option value="">All roles</option>{roles.map(x => <option key={x}>{x}</option>)}</select></div>
          <div><label>Interview type</label><select value={f.type} onChange={set('type')}><option value="">All types</option>{types.map(x => <option key={x}>{x}</option>)}</select></div>
          <div><label>From date</label><input type="date" value={f.from} onChange={set('from')} /></div>
          <div><label>To date</label><input type="date" value={f.to} onChange={set('to')} /></div>
          <div><label>Min score</label><input type="number" min="0" max="100" value={f.min} onChange={set('min')} /></div>
          <div><label>Max score</label><input type="number" min="0" max="100" value={f.max} onChange={set('max')} /></div>
        </div>
      </div>
      <div className="card">
        {rows.length === 0 ? <p>No interviews match. <Link to="/start-interview">Start an interview</Link> or adjust the filters.</p> : (
          <table><thead><tr><th>Date</th><th>Role</th><th>Type</th><th>Score</th><th>Action</th></tr></thead><tbody>
            {rows.map(r => <tr key={r.id}><td>{r.date}</td><td>{r.role}</td><td>{r.type}</td><td>{r.score}</td><td><Link to={'/results/' + r.id}>View</Link></td></tr>)}
          </tbody></table>
        )}
      </div>
      <Link to="/analytics">Compare interviews over time →</Link>
    </>
  )
}
