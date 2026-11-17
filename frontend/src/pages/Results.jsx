import { Link, useNavigate, useParams } from 'react-router-dom'
import { useLoad } from '../api'
import Bar, { toneFor } from '../components/Bar'

const CATS = [['Technical Knowledge', 'technical'], ['Answer Relevance', 'relevance'], ['Answer Structure', 'structure'], ['Communication Clarity', 'clarity']]

export default function Results() {
  const { id } = useParams()
  const nav = useNavigate()
  const { data: r, error } = useLoad('/interviews/' + id + '/results')
  if (error) return <p className="err">{error}</p>
  if (!r) return <p>Loading…</p>
  if (r.status !== 'COMPLETED') return <p>This interview is not finished yet. <Link to={'/interview/' + id}>Continue the interview</Link>.</p>

  const label = r.overall >= 80 ? 'Strong performance' : r.overall >= 60 ? 'Good progress' : 'Keep practising'
  return (
    <>
      <div className="card ai">
        <span className="badge">Your interview result</span>
        <h1 style={{ marginTop: '.6rem' }}>{r.overall}/100 · {label}</h1>
        <p>{r.role} · {r.type} · {r.date} · {r.answers.length} {r.answers.length === 1 ? 'question' : 'questions'} evaluated</p>
        <p className="muted">Scores are practice estimates calculated from the text of your answers. They do not measure pronunciation, tone or confidence.</p>
      </div>

      <div className="card">
        <h2>Score breakdown</h2>
        {CATS.map(([name, k]) => (
          <div key={k} style={{ marginBottom: '.9rem' }}>
            <div className="row between"><span>{name}</span><b>{r.categories[k]}/100</b></div>
            <Bar value={r.categories[k]} tone={toneFor(r.categories[k])} />
          </div>
        ))}
      </div>

      <div className="grid g2">
        <div className="card good"><h3>What You Did Well</h3><ul>{r.strengths.map((x, k) => <li key={k}>{x}</li>)}</ul></div>
        <div className="card warn"><h3>What You Can Improve</h3><ul>{r.improvements.map((x, k) => <li key={k}>{x}</li>)}</ul></div>
      </div>

      <div className="card">
        <h2>Question by question</h2>
        {r.answers.map((a, k) => (
          <details key={k} style={{ marginBottom: '.8rem' }} open={k === 0}>
            <summary><b>{a.question}</b> — {Math.round((a.technical + a.relevance + a.structure + a.clarity) / 4)}/100</summary>
            <p><b>Your answer</b> ({a.inputMethod}): {a.transcript}</p>
            <p className="muted">Technical {a.technical} · Relevance {a.relevance} · Structure {a.structure} · Clarity {a.clarity}</p>
            <ul>{a.strengths.map((x, j) => <li key={'s' + j}>✔ {x}</li>)}{a.improvements.map((x, j) => <li key={'i' + j}>➜ {x}</li>)}</ul>
            <details><summary>View Sample Answer</summary><p>{a.sample}</p></details>
          </details>
        ))}
      </div>

      {r.weakTopics.length > 0 && <div className="card warn"><h3>Suggested topics to practise</h3><p>{r.weakTopics.join(', ')}</p></div>}

      <div className="row">
        <button className="btn ghost" onClick={() => nav('/start-interview')}>Practise Weak Topics</button>
        <button className="btn" onClick={() => nav('/learning-path', { state: { topics: r.weakTopics.join(', ') } })}>Generate Learning Path</button>
        <Link className="btn ghost" to="/history">View Interview History</Link>
        <Link className="btn ghost" to="/start-interview">Try Another Interview</Link>
        <Link className="btn ghost" to="/roadmap">Related Learning Plan</Link>
      </div>
    </>
  )
}
