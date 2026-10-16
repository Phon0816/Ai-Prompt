import { PRIMARY_MODEL_NAME, CRITIC_MODEL_ID } from '../../config/modelConfig';
import Reveal from './Reveal';

const scores = [
  ['Clarity', 94, 'blue'],
  ['Context fit', 91, 'purple'],
  ['Actionability', 88, 'green'],
];

export default function ModelsSection() {
  return (
    <section className="landing-section models-section">
      <Reveal><div className="section-heading"><span className="eyebrow">Confidence, built in</span><h2>Know why a prompt<br /><em>will work.</em></h2><p>See the signal behind every recommendation, from fit to focus.</p></div></Reveal>
      <div className="model-panels"><Reveal delay={70}><div className="score-panel"><div className="panel-top"><span>Prompt health</span><span className="score-total">91<span>/100</span></span></div>{scores.map(([label, value, color]) => <div className="score-row" key={label}><div><span>{label}</span><b>{value}</b></div><div className="score-bar"><i className={color} style={{ width: `${value}%` }} /></div></div>)}<p className="panel-foot">Based on context, constraints, and domain fit.</p></div></Reveal><Reveal delay={150}><div className="domain-panel"><span className="panel-eyebrow">MODEL ROUTING</span><h3>Matched to the moment.</h3><p>We use the strengths of each model in the workflow, so you can focus on the outcome.</p><div className="model-chip"><span className="model-chip-icon">N</span><div><strong>{PRIMARY_MODEL_NAME}</strong><small>Primary generation model</small></div><span className="model-ready">Ready</span></div><div className="model-chip secondary"><span className="model-chip-icon">L</span><div><strong>Laguna</strong><small>Quality review · {CRITIC_MODEL_ID.split('/')[0]}</small></div><span className="model-ready">Review</span></div></div></Reveal></div>
    </section>
  );
}
