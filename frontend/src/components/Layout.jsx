import { NavLink, Outlet, useNavigate } from 'react-router-dom'

const links = [
  ['dashboard', 'Dashboard'], ['start-interview', 'Mock Interview'], ['history', 'Interview History'],
  ['learning-path', 'Learning Path'], ['analytics', 'My Progress'], ['profile', 'Profile']
]

export default function Layout() {
  const nav = useNavigate()
  const user = JSON.parse(localStorage.getItem('ss_user') || '{}')
  const signOut = () => { localStorage.clear(); nav('/') }
  return (
    <div className="shell">
      <aside className="side">
        <div className="logo"><span className="logo-mark">S</span>Skill Stair</div>
        {links.map(([p, l]) => <NavLink key={p} to={'/' + p}>{l}</NavLink>)}
      </aside>
      <div className="main">
        <div className="top"><span>Hello, <b>{user.name}</b></span><button className="btn ghost" onClick={signOut}>Sign out</button></div>
        <div className="content"><Outlet /></div>
      </div>
    </div>
  )
}
