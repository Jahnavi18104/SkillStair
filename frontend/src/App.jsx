import { Routes, Route, Navigate } from 'react-router-dom'
import { getToken } from './api'
import Layout from './components/Layout'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Dashboard from './pages/Dashboard'
import StartInterview from './pages/StartInterview'
import LiveInterview from './pages/LiveInterview'
import Results from './pages/Results'
import History from './pages/History'
import LearningPath from './pages/LearningPath'
import Roadmap from './pages/Roadmap'
import Analytics from './pages/Analytics'
import Profile from './pages/Profile'

function Guard({ children }) {
  return getToken() ? children : <Navigate to="/login" replace />
}

// URLs: /SkillStair (landing), /SkillStair/home, /login, /signup, /dashboard, /start-interview,
// /interview/:id, /results/:id, /history, /learning-path, /roadmap, /analytics, /profile
export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/home" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route element={<Guard><Layout /></Guard>}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/start-interview" element={<StartInterview />} />
        <Route path="/interview/:id" element={<LiveInterview />} />
        <Route path="/results/:id" element={<Results />} />
        <Route path="/history" element={<History />} />
        <Route path="/learning-path" element={<LearningPath />} />
        <Route path="/roadmap" element={<Roadmap />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/profile" element={<Profile />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
