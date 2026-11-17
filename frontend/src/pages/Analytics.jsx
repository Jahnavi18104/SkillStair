import { Link } from 'react-router-dom'
import { Bar as RBar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useLoad } from '../api'

export default function Analytics() {
  const { data: a, error } = useLoad('/analytics')
  if (error) return <p className="err">{error}</p>
  if (!a) return <p>Loading…</p>
  const trend = a.trend.map((t, i) => ({ name: `#${i + 1} · ${t.label}`, score: t.score }))
  const c = a.completion
  return (
    <>
      <h1>My Progress</h1>
      <div className="card ai"><h3>Suggested next step</h3><p style={{ margin: 0 }}>{a.suggestion}</p></div>

      <div className="card">
        <h2>Interview score trend</h2>
        {trend.length === 0 ? <p>No completed interviews yet. <Link to="/start-interview">Start one</Link>.</p> : (
          <div style={{ height: 260 }}><ResponsiveContainer><LineChart data={trend}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis domain={[0, 100]} /><Tooltip /><Line type="monotone" dataKey="score" stroke="#4f46e5" strokeWidth={3} /></LineChart></ResponsiveContainer></div>
        )}
      </div>

      <div className="card">
        <h2>Skill breakdown</h2>
        {a.skills.length === 0 ? <p>Skill scores appear after your first completed interview.</p> : (
          <div style={{ height: 260 }}><ResponsiveContainer><BarChart data={a.skills}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis domain={[0, 100]} /><Tooltip /><RBar dataKey="score" fill="#8b5cf6" radius={[8, 8, 0, 0]} /></BarChart></ResponsiveContainer></div>
        )}
      </div>

      <div className="card">
        <h2>Learning completion</h2>
        {c.total === 0 ? <p>No active roadmap. <Link to="/learning-path">Build your learning path</Link>.</p> : (
          <>
            <p>{c.done} completed · {c.total - c.done} remaining</p>
            <div style={{ height: 240 }}><ResponsiveContainer><BarChart data={c.byWeek.map(w => ({ name: 'Week ' + w.week, Completed: Number(w.done || 0), Remaining: w.total - Number(w.done || 0) }))}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis allowDecimals={false} /><Tooltip /><RBar dataKey="Completed" stackId="a" fill="#16a34a" /><RBar dataKey="Remaining" stackId="a" fill="#e0e3f5" /></BarChart></ResponsiveContainer></div>
          </>
        )}
      </div>
    </>
  )
}
