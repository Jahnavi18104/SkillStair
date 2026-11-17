import { Link } from 'react-router-dom'
import { api, useLoad } from '../api'
import Bar from '../components/Bar'

export default function Roadmap() {
  const { data: p, error, setData, reload } = useLoad('/learning-paths/current')
  if (error) return <p className="err">{error}</p>
  if (!p) return <p>Loading…</p>
  if (!p.id) return <div className="card"><h2>No roadmap yet</h2><p>Tell us your goal and we will build a weekly plan for you.</p><Link className="btn" to="/learning-path">Build your learning path</Link></div>

  const done = p.tasks.filter(t => t.completed).length
  const pct = p.tasks.length ? Math.round((done * 100) / p.tasks.length) : 0
  const weeks = []
  p.tasks.forEach(t => {
    let w = weeks.find(x => x.week === t.week)
    if (!w) { w = { week: t.week, title: t.weekTitle, tasks: [] }; weeks.push(w) }
    w.tasks.push(t)
  })

  async function toggle(t) {
    const c = !t.completed
    setData(d => ({ ...d, tasks: d.tasks.map(x => (x.id === t.id ? { ...x, completed: c } : x)) }))
    try { await api('/tasks/' + t.id, 'PATCH', { completed: c }) } catch { reload() }
  }

  return (
    <>
      <div className="card ai">
        <span className="badge">Your learning goal</span>
        <h1 style={{ marginTop: '.6rem' }}>Become a {p.goal}</h1>
        <p>{p.weeks}-week roadmap · {p.level} · {p.hours} per week · {p.focus}</p>
        <div className="row between"><b>Overall completion</b><b>{pct}%</b></div>
        <Bar value={pct} tone="green" />
        <p className="muted">{done} of {p.tasks.length} tasks completed</p>
        <Link to="/learning-path">Regenerate roadmap</Link>
      </div>

      {p.note && <div className="card warn"><p style={{ margin: 0 }}>{p.note}</p></div>}

      {weeks.map(w => {
        const wd = w.tasks.filter(t => t.completed).length
        return (
          <div className="card" key={w.week}>
            <div className="row between"><div><span className="muted">Week {w.week}</span><h2>{w.title}</h2></div><b className={wd === w.tasks.length ? 'ok' : 'muted'}>{wd}/{w.tasks.length} done</b></div>
            {w.tasks.map(t => (
              <div key={t.id} style={{ borderTop: '1px solid var(--line)', padding: '.8rem 0' }}>
                <label style={{ display: 'flex', gap: '.7rem', alignItems: 'flex-start', margin: 0, cursor: 'pointer' }}>
                  <input type="checkbox" style={{ width: 20, height: 20, marginTop: 3 }} checked={!!t.completed} onChange={() => toggle(t)} />
                  <span style={{ flex: 1 }}>
                    <b style={{ textDecoration: t.completed ? 'line-through' : 'none' }}>{t.title}</b> {t.extra ? <span className="badge">Added from feedback</span> : null}
                    <span style={{ display: 'block', fontWeight: 400, color: 'var(--text)' }}>{t.description}</span>
                    <span className="muted" style={{ fontWeight: 400 }}>⏱ about {t.minutes} min · Mark as Completed</span>
                  </span>
                </label>
                <div className="row" style={{ marginLeft: '2rem', marginTop: '.4rem' }}>
                  {t.resource && <a href={t.resource} target="_blank" rel="noreferrer">Learning resource</a>}
                  <Link className="btn ghost small" to="/start-interview">Practise Interview Questions</Link>
                </div>
              </div>
            ))}
          </div>
        )
      })}
    </>
  )
}
