import { Link } from 'react-router-dom'
import { useLoad } from '../api'
import Bar from '../components/Bar'

export default function Dashboard() {
  const { data: d, error } = useLoad('/dashboard')
  if (error) return <p className="err">{error}</p>
  if (!d) return <p>Loading…</p>

  const plan = d.plan && d.plan.id ? d.plan : null
  const done = plan ? plan.tasks.filter(t => t.completed).length : 0
  const total = plan ? plan.tasks.length : 0
  const pct = total ? Math.round((done * 100) / total) : 0
  const weeks = []
  if (plan) plan.tasks.forEach(t => { if (!weeks.find(w => w.week === t.week)) weeks.push({ week: t.week, title: t.weekTitle }) })

  return (
    <>
      <div className="card ai">
        <h1>Welcome back, {d.name}!</h1>
        <p>Ready to improve your interview skills? Practise today and take one step closer to your career goal.</p>
        <div className="row"><Link className="btn" to="/start-interview">Start New Interview</Link><Link className="btn ghost" to="/roadmap">Continue Learning</Link></div>
      </div>

      <div className="grid g4">
        <div className="card stat"><span className="muted">Total Interviews</span><b>{d.total}</b><span className="muted">Completed sessions</span></div>
        <div className="card stat"><span className="muted">Average Score</span><b>{d.average != null ? d.average + '/100' : '—'}</b><span className="muted">Across completed sessions</span></div>
        <div className="card stat"><span className="muted">Learning Progress</span><b>{pct}%</b><Bar value={pct} tone="green" /></div>
        <div className="card stat"><span className="muted">Latest Score</span><b>{d.latest != null ? d.latest + '/100' : '—'}</b><span className="muted">Latest completed interview</span></div>
      </div>

      <div className="card">
        <h2>Recent interview sessions</h2>
        {d.recent.length === 0 ? <p>No interviews yet. <Link to="/start-interview">Start your first interview</Link> to see your results here.</p> : (
          <table><thead><tr><th>Role</th><th>Date</th><th>Score</th><th>Action</th></tr></thead><tbody>
            {d.recent.map(r => <tr key={r.id}><td>{r.role}</td><td>{r.date}</td><td>{r.score}/100</td><td><Link to={'/results/' + r.id}>View Results</Link></td></tr>)}
          </tbody></table>
        )}
      </div>

      <div className="card">
        <h2>Current learning plan</h2>
        {!plan ? <p>You have no learning plan yet. <Link to="/learning-path">Build your learning path</Link>.</p> : (
          <>
            <p><b>Your current goal: Become a {plan.goal}</b></p>
            <ul>{weeks.map(w => <li key={w.week}>Week {w.week}: {w.title}</li>)}</ul>
            <Bar value={pct} tone="green" />
            <p className="muted">{done} of {total} tasks completed</p>
            <Link className="btn" to="/roadmap">Continue Learning</Link>
          </>
        )}
      </div>
    </>
  )
}
