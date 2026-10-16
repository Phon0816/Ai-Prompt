import Reveal from './Reveal';

const steps = [
  { state: 'completed', label: 'Understand', detail: 'Goal and context mapped' },
  { state: 'completed', label: 'Match skills', detail: 'Relevant patterns selected' },
  { state: 'running', label: 'Refine prompt', detail: 'Quality pass in progress' },
  { state: 'pending', label: 'Ready to run', detail: 'Your final prompt awaits' },
];

export default function PipelineSection() {
  return (
    <section className="landing-section pipeline-section">
      <Reveal><div className="section-heading split-heading"><div><span className="eyebrow">Two ways to move</span><h2>Fast when you know.<br /><em>Quality when it matters.</em></h2></div><p>Choose a lightweight pass or let our multi-step workflow challenge and polish the result before you use it.</p></div></Reveal>
      <Reveal delay={100}><div className="pipeline-card"><div className="pipeline-header"><div><span className="pipeline-label">QUALITY PIPELINE</span><h3>From rough thought to ready-to-use</h3></div><span className="live-badge"><i /> Live preview</span></div><div className="pipeline-track">{steps.map((step) => <div className={`pipeline-step ${step.state}`} key={step.label}><span className="pipeline-node">{step.state === 'completed' ? '✓' : step.state === 'running' ? '•' : '○'}</span><div><strong>{step.label}</strong><span>{step.detail}</span></div></div>)}</div><div className="pipeline-modes"><span><b>Fast</b> Skills → {`Nemotron`}</span><span><b>Quality</b> Draft → Review → Refine</span></div></div></Reveal>
    </section>
  );
}
