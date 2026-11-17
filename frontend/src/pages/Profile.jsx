import { useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { api } from '../api'
import Choice from '../components/Choice'

const ROLES = ['Java Full Stack Developer', 'Python Developer', 'Machine Learning Engineer', 'Data Analyst']
const LEVELS = ['Beginner', 'Intermediate', 'Advanced']
const HOURS = ['3-5 hours', '8-10 hours', '12-15 hours']

export default function Profile() {
  const nav = useNavigate()
  const [p, setP] = useState(null)
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '' })
  const [m, setM] = useState({ t: '', ok: false })
  useEffect(() => { api('/profile').then(setP).catch(e => setM({ t: e.message, ok: false })) }, [])
  if (!p) return <p className={m.t ? 'err' : ''}>{m.t || 'Loading…'}</p>

  async function save() {
    try {
      await api('/profile', 'PUT', p)
      const u = JSON.parse(localStorage.getItem('ss_user') || '{}'); u.name = p.name; localStorage.setItem('ss_user', JSON.stringify(u))
      setM({ t: 'Profile saved.', ok: true })
    } catch (e) { setM({ t: e.message, ok: false }) }
  }
  async function changePw() {
    try { await api('/profile/password', 'PUT', pw); setPw({ currentPassword: '', newPassword: '' }); setM({ t: 'Password changed.', ok: true }) }
    catch (e) { setM({ t: e.message, ok: false }) }
  }

  return (
    <>
      <h1>Profile and Settings</h1>
      <div className="card">
        <label>Name</label><input value={p.name || ''} onChange={e => setP({ ...p, name: e.target.value })} />
        <label>Email</label><input value={p.email || ''} disabled />
        <label>Target career role</label><Choice options={ROLES} value={p.targetRole} onChange={v => setP({ ...p, targetRole: v })} />
        <label>Current skill level</label><Choice options={LEVELS} value={p.level} onChange={v => setP({ ...p, level: v })} />
        <label>Preferred weekly study hours</label><Choice options={HOURS} value={p.weeklyHours} onChange={v => setP({ ...p, weeklyHours: v })} />
        <p style={{ marginTop: '1rem' }}><button className="btn" onClick={save}>Save changes</button></p>
        <p className="muted">After changing your goal, build a new roadmap from Learning Path. Your previous plan stays saved as archived.</p>
      </div>
      <div className="card">
        <h2>Change password</h2>
        <label>Current password</label><input type="password" value={pw.currentPassword} onChange={e => setPw({ ...pw, currentPassword: e.target.value })} />
        <label>New password</label><input type="password" value={pw.newPassword} onChange={e => setPw({ ...pw, newPassword: e.target.value })} />
        <p style={{ marginTop: '1rem' }}><button className="btn ghost" onClick={changePw}>Change password</button></p>
      </div>
      {m.t && <p className={m.ok ? 'ok' : 'err'}>{m.t}</p>}
      <button className="btn ghost" onClick={() => { localStorage.clear(); nav('/') }}>Sign out</button>
    </>
  )
}
