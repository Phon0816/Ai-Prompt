export default function FinalCta({ onStart }) {
  return <section className="landing-cta"><div className="cta-orb" /><span className="eyebrow">Your next prompt starts here</span><h2>Make the next one<br /><em>your best one.</em></h2><p>A calmer workflow for clearer thinking and better results.</p><button className="button button-primary landing-button" onClick={onStart}>Open the workspace <span aria-hidden="true">→</span></button></section>;
}
