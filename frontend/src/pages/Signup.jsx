import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api'

export default function Signup() {
  const nav = useNavigate()
  const [f, setF] = useState({ name: '', email: '', password: '', confirmPassword: '' })
  const [err, setErr] = useState('')
  const set = k => e => setF({ ...f, [k]: e.target.value })

  async function submit(e) {
    e.preventDefault(); setErr('')
    if (!f.name.trim()) return setErr('Please enter your full name.')
    if (!/^\S+@\S+\.\S+$/.test(f.email)) return setErr('Please enter a valid email address.')
    if (f.password.length < 8) return setErr('Password must be at least 8 characters.')
    if (f.password !== f.confirmPassword) return setErr('Passwords do not match.')
    try {
      const r = await api('/auth/signup', 'POST', f)
      localStorage.setItem('ss_token', r.token); localStorage.setItem('ss_user', JSON.stringify(r.user))
      nav('/dashboard')
    } catch (ex) { setErr(ex.message) }
  }

  return (
    <div className="auth"><form className="card" onSubmit={submit}>
      <Link to="/" className="logo"><span className="logo-mark">S</span>Skill Stair</Link>
      <h2 style={{ marginTop: '1rem' }}>Sign Up</h2>
      <label>Full name</label><input value={f.name} onChange={set('name')} />
      <label>Email address</label><input type="email" value={f.email} onChange={set('email')} />
      <label>Password</label><input type="password" value={f.password} onChange={set('password')} />
      <label>Confirm password</label><input type="password" value={f.confirmPassword} onChange={set('confirmPassword')} />
      {err && <p className="err">{err}</p>}
      <p><button className="btn" style={{ width: '100%', marginTop: '.8rem' }}>Create Account</button></p>
      <p>Already have an account? <Link to="/login">Login</Link></p>
    </form></div>
  )
}
