import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api'

export default function Login() {
  const nav = useNavigate()
  const [f, setF] = useState({ email: '', password: '' })
  const [err, setErr] = useState('')
  const set = k => e => setF({ ...f, [k]: e.target.value })

  async function submit(e) {
    e.preventDefault(); setErr('')
    if (!/^\S+@\S+\.\S+$/.test(f.email)) return setErr('Please enter a valid email address.')
    if (!f.password) return setErr('Please enter your password.')
    try {
      const r = await api('/auth/login', 'POST', f)
      localStorage.setItem('ss_token', r.token); localStorage.setItem('ss_user', JSON.stringify(r.user))
      nav('/dashboard')
    } catch (ex) { setErr(ex.message) }
  }

  return (
    <div className="auth"><form className="card" onSubmit={submit}>
      <Link to="/" className="logo"><span className="logo-mark">S</span>Skill Stair</Link>
      <h2 style={{ marginTop: '1rem' }}>Login</h2>
      <label>Email address</label><input type="email" value={f.email} onChange={set('email')} />
      <label>Password</label><input type="password" value={f.password} onChange={set('password')} />
      {err && <p className="err">{err}</p>}
      <p><button className="btn" style={{ width: '100%', marginTop: '.8rem' }}>Login</button></p>
      <p>Don't have an account? <Link to="/signup">Sign Up</Link></p>
    </form></div>
  )
}
