import { guideContent } from '../config/content.js';

export default function Guide() {
  return (
    <div className="page">
      <div className="page-head">
        <h1 className="page-title">Getting started</h1>
        <p className="page-sub">{guideContent.intro}</p>
      </div>

      <div className="guide-grid">
        {guideContent.sections.map((s) => (
          <div key={s.title} className="guide-card">
            <div className="guide-card-icon" aria-hidden="true">
              {s.icon}
            </div>
            <h3>{s.title}</h3>
            <ol className="guide-steps">
              {s.steps.map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          </div>
        ))}
      </div>
    </div>
  );
}
