import { useEffect, useState } from 'react';
import { PRIMARY_MODEL_NAME } from '../../config/modelConfig';

const phrases = ['clearer', 'smarter', 'more useful'];

export default function Hero({ onStart }) {
  const [phrase, setPhrase] = useState(phrases[0]);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % phrases.length);
    }, 2400);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => setPhrase(phrases[index]), [index]);

  return (
    <section className="landing-hero">
      <div className="hero-copy">
        <span className="eyebrow"><span className="eyebrow-dot" /> Prompt engineering, simplified</span>
        <h1>Turn rough ideas into <span className="hero-highlight" aria-live="polite">{phrase}</span> prompts.</h1>
        <p className="hero-lede">
          PromptContext brings domain skills, model selection, and thoughtful refinement into one calm workspace—so every prompt starts with a head start.
        </p>
        <div className="hero-actions">
          <button className="button button-primary landing-button" onClick={onStart}>Build a prompt <span aria-hidden="true">→</span></button>
          <a className="text-link" href="#how-it-works">See how it works <span aria-hidden="true">↓</span></a>
        </div>
        <div className="hero-proof"><span className="proof-avatars"><i>✦</i><i>AI</i><i>✓</i></span><span>Built for focused work, not prompt wrestling.</span></div>
      </div>
      <div className="hero-visual" aria-label={`Prompt refinement preview using ${PRIMARY_MODEL_NAME}`}>
        <div className="hero-orbit orbit-one" /><div className="hero-orbit orbit-two" />
        <div className="prompt-preview">
          <div className="preview-top"><span className="window-dots"><i /><i /><i /></span><span className="preview-label">Prompt workspace</span><span className="preview-status">Ready</span></div>
          <div className="preview-body">
            <span className="preview-kicker">YOUR IDEA</span>
            <p>“Help me explain a complex technical concept to a new team…”</p>
            <div className="preview-arrow">↓</div>
            <span className="preview-kicker accent">REFINED WITH CONTEXT</span>
            <div className="preview-result"><strong>Role</strong><span>Senior technical educator</span><strong>Outcome</strong><span>Clear, practical explanation</span><strong>Style</strong><span>Concise with a real-world analogy</span></div>
          </div>
          <div className="preview-footer"><span>✦ 3 skills matched</span><span>{PRIMARY_MODEL_NAME.split(' ').slice(0, 2).join(' ')}</span></div>
        </div>
      </div>
    </section>
  );
}
