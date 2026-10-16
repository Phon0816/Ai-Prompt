import Reveal from './Reveal';

export default function BeforeAfter() {
  const slots = [
    ['Role', 'Developer advocate'], ['Audience', 'Senior engineers'], ['Goal', 'Explain the problem'],
    ['Format', '500-word launch post'], ['Constraints', 'One practical example'], ['Tone', 'Confident, no hype'],
  ];
  return (
    <section className="landing-section before-after-section">
      <Reveal><div className="section-heading centered-heading"><span className="eyebrow">See the difference</span><h2>Less “make it better.”<br /><em>More actually better.</em></h2></div></Reveal>
      <Reveal delay={90}><div className="compare-grid"><article className="compare-card before-card"><div className="compare-label"><span>Before</span><small>Raw thought</small></div><p>“Write a post about our new developer tool and make it sound exciting.”</p><span className="compare-note">A starting point, not a strategy.</span></article><div className="compare-arrow" aria-hidden="true">→</div><article className="compare-card after-card"><div className="compare-label"><span>After</span><small>6 prompt slots</small><strong className="diff-score">91<span>/100</span></strong></div><div className="diff-slots">{slots.map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}</div><span className="compare-note">Clear context. Useful constraints. Better output.</span></article></div></Reveal>
    </section>
  );
}
