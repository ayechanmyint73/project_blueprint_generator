import { useNavigate } from 'react-router-dom'
import {
  HiOutlineArrowRight,
  HiOutlineCalendar,
  HiOutlineCheckCircle,
  HiOutlineCube,
  HiOutlineDatabase,
  HiOutlineDocumentText,
  HiOutlineSparkles,
} from 'react-icons/hi'
import heroImage from '../assets/hero.png'

const features = [
  {
    icon: <HiOutlineSparkles size={20} />,
    title: 'Project analysis',
    desc: 'Clear scope, users, goals, and expected product outcomes.',
  },
  {
    icon: <HiOutlineCube size={20} />,
    title: 'System blueprint',
    desc: 'Architecture, modules, data flow, and technology direction.',
  },
  {
    icon: <HiOutlineDatabase size={20} />,
    title: 'Data model',
    desc: 'Schema suggestions shaped around the actual project brief.',
  },
  {
    icon: <HiOutlineCalendar size={20} />,
    title: 'Delivery plan',
    desc: 'Phases, tasks, and milestones ready for project tracking.',
  },
]

const previewRows = [
  ['Inputs', 'Brief, goals, constraints'],
  ['Blueprint', 'Features, architecture, schema'],
  ['Roadmap', 'Phases, tasks, milestones'],
]

export default function Landing() {
  const navigate = useNavigate()

  return (
    <div className="landing-page">
      <header className="landing-header">
        <button className="landing-brand" type="button" onClick={() => navigate('/')}>
          <img className="landing-logo" src="/logo.png" alt="" />
          <span className="landing-brand-name">Blueprint Generator</span>
        </button>

        <nav className="landing-nav" aria-label="Landing navigation">
          <button className="landing-nav-link" type="button" onClick={() => navigate('/login')}>
            Sign in
          </button>
          <button className="primary-btn landing-nav-cta" type="button" onClick={() => navigate('/register')}>
            Start free
          </button>
        </nav>
      </header>

      <main className="landing-main">
        <section className="landing-hero" aria-labelledby="landing-title">
          <div className="landing-copy">
            <div className="landing-badge">
              <HiOutlineDocumentText size={16} />
              AI project planning workspace
            </div>

            <h1 className="landing-title" id="landing-title">
              Blueprint Generator
            </h1>

            <p className="landing-description">
              Turn an early project idea into a structured blueprint with scope, architecture,
              database planning, and a practical development roadmap.
            </p>

            <div className="landing-actions">
              <button
                className="primary-btn landing-btn-primary"
                type="button"
                onClick={() => navigate('/register')}
              >
                Get started <HiOutlineArrowRight size={17} />
              </button>
              <button
                className="secondary-btn landing-btn-secondary"
                type="button"
                onClick={() => navigate('/login')}
              >
                Sign in
              </button>
            </div>

            <div className="landing-proof" aria-label="Blueprint highlights">
              <span><HiOutlineCheckCircle size={17} /> Scope</span>
              <span><HiOutlineCheckCircle size={17} /> Architecture</span>
              <span><HiOutlineCheckCircle size={17} /> Roadmap</span>
            </div>
          </div>

          <div className="landing-preview" aria-label="Blueprint preview">
            <div className="landing-preview-visual">
              <img src={heroImage} alt="" />
            </div>
            <div className="landing-preview-panel">
              <div className="landing-preview-head">
                <span>New blueprint</span>
                <span className="landing-preview-status">Ready</span>
              </div>

              <div className="landing-preview-list">
                {previewRows.map(([label, value]) => (
                  <div className="landing-preview-row" key={label}>
                    <span>{label}</span>
                    <strong>{value}</strong>
                  </div>
                ))}
              </div>

              <div className="landing-preview-progress">
                <span style={{ width: '76%' }} />
              </div>
            </div>
          </div>
        </section>

        <section className="landing-features" aria-label="Blueprint Generator features">
          {features.map(({ icon, title, desc }) => (
            <article className="landing-feature-card" key={title}>
              <div className="landing-feature-icon">
                {icon}
              </div>
              <h2 className="landing-feature-title">{title}</h2>
              <p className="landing-feature-desc">{desc}</p>
            </article>
          ))}
        </section>

        <section className="landing-workflow" aria-label="Planning workflow">
          <div>
            <p className="landing-section-kicker">From brief to build plan</p>
            <h2 className="landing-section-title">Starting Point of Project Planning</h2>
          </div>
          <div className="landing-workflow-steps">
            <div>
              <span>01</span>
              Add the project idea
            </div>
            <div>
              <span>02</span>
              Generate the blueprint
            </div>
            <div>
              <span>03</span>
              Refine the roadmap
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}

