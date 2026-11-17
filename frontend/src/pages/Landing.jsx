import { Link } from 'react-router-dom'

export default function Landing() {
  return (
    <div>
      <header className="lhead">
        <Link to="/" className="logo"><span className="logo-mark">S</span>Skill Stair</Link>
        <nav>
          <a href="#home">Home</a><a href="#features">Features</a><a href="#how">How It Works</a><a href="#about">About</a>
        </nav>
        <div className="row"><Link className="btn ghost" to="/login">Login</Link><Link className="btn" to="/signup">Sign Up</Link></div>
      </header>

      <section id="home" className="hero">
        <span className="badge">AI-Powered Career Preparation</span>
        <h1>Prepare Smarter. Interview Better. Grow Faster.</h1>
        <p>Practise realistic job interviews by speaking or typing, receive personalized AI feedback, and build a learning roadmap tailored to your career goals.</p>
        <div className="chips"><span>Speech and Text Practice</span><span>AI Feedback</span><span>Learning Paths</span></div>
      </section>

      <section id="features" className="section">
        <h2>Features</h2>
        <div className="grid g2">
          <div className="card"><h3>AI Mock Interviews</h3><p>Practise role-specific technical and behavioral questions, speak or type your answers, and receive detailed evaluation.</p></div>
          <div className="card ai"><h3>Personalized Learning</h3><p>Turn your weaknesses into a structured weekly roadmap with learning tasks and progress tracking.</p></div>
          <div className="card"><h3>Performance Analytics</h3><p>Review previous interviews, compare scores, and see which skills need more practice.</p></div>
        </div>
      </section>

      <section id="how" className="section">
        <h2>How it works</h2>
        <ol className="steps">
          <li>Choose your career goal.</li><li>Complete a mock interview.</li><li>Review AI feedback.</li>
          <li>Follow your learning roadmap.</li><li>Practise again and compare progress.</li>
        </ol>
      </section>

      <section id="about" className="section">
        <h2>About Skill Stair</h2>
        <p>Skill Stair treats every interview answer as one step up. Scores are practice estimates based on the text of your answers, so use them to guide your preparation rather than as a final judgment.</p>
      </section>
    </div>
  )
}
