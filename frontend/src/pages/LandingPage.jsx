import { useEffect, useState } from 'react';
import Hero from '../components/landing/Hero';
import BeforeAfter from '../components/landing/BeforeAfter';
import FinalCta from '../components/landing/FinalCta';
import Reveal from '../components/landing/Reveal';
import '../styles/landing.css';
import { useWizard } from '../store/wizardContext';
import { EXECUTION_MODES, PRIMARY_MODEL_NAME, CRITIC_MODEL_ID } from '../config/modelConfig';

const skillGroups = {
  'Core craft': [
    ['Context mapping', 'Frames the role, audience, goal, and constraints before the model starts.'],
    ['Output design', 'Chooses a useful structure so the answer is easy to review and reuse.'],
  ],
  'Domain packs': [
    ['IT & product', 'Practical patterns for technical explanations, specs, and launch writing.'],
    ['Healthcare', 'Careful, plain-language structures for clinical and patient-facing work.'],
    ['Marketing', 'Campaign, content, audience, and measurement structures with clear assumptions.'],
    ['Education', 'Lesson, tutoring, assessment, and learning-material structures for educators.'],
  ],
  'Quality checks': [
    ['Clarity pass', 'Finds ambiguity, missing context, and instructions that compete with each other.'],
    ['Actionability', 'Makes the next step explicit without adding unnecessary prompt length.'],
  ],
};

const useCases = [
  ['Technical writing', 'Turn a rough feature idea into a crisp brief your team can act on.', 'IT'],
  ['Research synthesis', 'Give scattered notes a structure that keeps evidence and caveats visible.', 'Research'],
  ['Healthcare education', 'Draft accessible explanations with audience and safety context in view.', 'Healthcare'],
];

const storySteps = [
  {
    number: '01',
    title: 'Name the outcome',
    text: 'Start with what you want to make, decide, or explain—not a perfect instruction.',
    intro: 'Start with the destination. PromptContext turns the outcome into a clear first brief.',
    className: 'story-card-one',
  },
  {
    number: '02',
    title: 'Add the right context',
    text: 'Domain-aware skills surface the details that are easy to miss when you are moving quickly.',
    intro: 'Then add the context that matters. Reusable skills fill the gaps without making the prompt feel heavy.',
    className: 'story-card-two',
  },
  {
    number: '03',
    title: 'Choose your depth',
    text: 'Use Fast for a clean pass or Quality when a second set of eyes will improve the result.',
    intro: 'Choose how much review the moment deserves: a quick pass or a deeper quality loop.',
    className: 'story-card-three',
  },
  {
    number: '04',
    title: 'Take the result with you',
    text: 'Review the reasoning, copy the polished prompt, and keep the useful parts for next time.',
    intro: 'Finish with something useful. Keep the reasoning visible, then take the polished prompt into your work.',
    className: 'story-card-four',
  },
];

export default function LandingPage() {
  const { setActiveTab } = useWizard();
  const [skillGroup, setSkillGroup] = useState('Core craft');
  const [selectedSkill, setSelectedSkill] = useState(0);
  const [mode, setMode] = useState('quality');
  const [isNavScrolled, setIsNavScrolled] = useState(false);
  const [activeStory, setActiveStory] = useState(0);
  const start = () => setActiveTab('wizard');
  useEffect(() => {
    let frameId = 0;
    let previousScrolled = false;
    const handleScroll = () => {
      if (frameId) return;
      frameId = window.requestAnimationFrame(() => {
        frameId = 0;
        const nextScrolled = window.scrollY > 24;
        if (nextScrolled !== previousScrolled) {
          previousScrolled = nextScrolled;
          setIsNavScrolled(nextScrolled);
        }
      });
    };
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (frameId) window.cancelAnimationFrame(frameId);
    };
  }, []);
  useEffect(() => {
    const section = document.getElementById('workflow');
    if (!section) return undefined;
    const cards = [...section.querySelectorAll('[data-story-index]')];
    if (!cards.length) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        const visibleCards = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visibleCards[0]) {
          setActiveStory(Number(visibleCards[0].target.dataset.storyIndex));
        }
      },
      { rootMargin: '-30% 0px -48% 0px', threshold: [0.15, 0.4, 0.7] },
    );

    cards.forEach((card) => observer.observe(card));
    return () => observer.disconnect();
  }, []);
  const scrollToSection = (event, targetId) => {
    event.preventDefault();
    const target = document.getElementById(targetId);
    if (!target) return;

    target.scrollIntoView({
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
      block: 'start',
    });
    window.history.replaceState(null, '', `#${targetId}`);
  };
  const skills = skillGroups[skillGroup];

  return <div className="landing-page">
    <header className={`landing-nav${isNavScrolled ? ' is-scrolled' : ''}`}>
      <a className="landing-brand" href="#top" onClick={(event) => scrollToSection(event, 'top')} aria-label="PromptContext home"><span className="brand-mark">✦</span> PromptContext</a>
      <nav aria-label="Landing page navigation"><a href="#workflow" onClick={(event) => scrollToSection(event, 'workflow')}>Workflow</a><a href="#skills" onClick={(event) => scrollToSection(event, 'skills')}>Skills</a><a href="#proof" onClick={(event) => scrollToSection(event, 'proof')}>Proof</a></nav>
      <button className="landing-nav-cta" onClick={start}>Open workspace <span aria-hidden="true">↗</span></button>
    </header>
    <div id="top"><Hero onStart={start} /></div>
    <section className="story-section" id="workflow" aria-label="How PromptContext works">
      <div className="story-progress" aria-label={`Workflow step ${storySteps[activeStory].number} of ${storySteps.length}`} style={{ '--story-progress': `${((activeStory + 1) / storySteps.length) * 100}%` }}><span>{storySteps[activeStory].number}</span><i /><span>04</span></div>
      <div className="story-intro"><span className="eyebrow">A calmer workflow</span><h2>From a blank page<br /><em>to a useful prompt.</em></h2><div className="story-intro-content" key={storySteps[activeStory].number}><p>{storySteps[activeStory].intro}</p><span className="story-intro-step">{storySteps[activeStory].number} / 04 · {storySteps[activeStory].title}</span></div></div>
      <div className="story-cards">
        {storySteps.map(({ number, title, text, className }, index) => <Reveal className={`story-reveal story-reveal-${index + 1}`} delay={index * 80} key={number}><article data-story-index={index} className={`story-card ${className}${activeStory === index ? ' is-current' : ''}`}><span className="story-number">{number}</span><div><h3>{title}</h3><p>{text}</p></div><span className="story-shape" aria-hidden="true" /></article></Reveal>)}
      </div>
    </section>
    <section className="landing-section skill-explorer-section" id="skills">
      <div className="section-heading"><span className="eyebrow">Skill Explorer</span><h2>Pick the thinking<br /><em>you need.</em></h2><p>Explore the reusable patterns behind every recommendation. No backend calls happen on this page.</p></div>
      <div className="skill-explorer">
        <div className="skill-tabs" role="tablist" aria-label="Skill groups">{Object.keys(skillGroups).map((group) => <button key={group} role="tab" aria-selected={skillGroup === group} className={skillGroup === group ? 'active' : ''} onClick={() => { setSkillGroup(group); setSelectedSkill(0); }}>{group}</button>)}</div>
        <div className="skill-list">{skills.map(([title, text], index) => <button className={`skill-option ${selectedSkill === index ? 'active' : ''}`} key={title} onClick={() => setSelectedSkill(index)}><span>{String(index + 1).padStart(2, '0')}</span><strong>{title}</strong><b aria-hidden="true">→</b></button>)}</div>
        <div className="skill-detail" role="tabpanel"><span className="detail-kicker">{skillGroup}</span><h3>{skills[selectedSkill][0]}</h3><p>{skills[selectedSkill][1]}</p><button className="text-link" onClick={start}>Try this in the wizard <span aria-hidden="true">→</span></button></div>
      </div>
    </section>
    <section className="landing-section mode-section">
      <div className="section-heading"><span className="eyebrow">Choose your pace</span><h2>Fast when you know.<br /><em>Quality when it matters.</em></h2><p>Both modes use the same workspace. Pick the amount of review that fits the moment.</p></div>
      <div className="mode-switcher" role="group" aria-label="Execution mode"><div className="mode-toggle"><button className={mode === 'fast' ? 'active' : ''} onClick={() => setMode('fast')}>Fast</button><button className={mode === 'quality' ? 'active' : ''} onClick={() => setMode('quality')}>Quality</button></div><div className="mode-meta"><span className="mode-tag">{EXECUTION_MODES[mode].label}</span><h3>{mode === 'fast' ? 'A focused first pass' : 'A considered result'}</h3><p>{mode === 'fast' ? 'Skills → Nemotron. Great for drafts, quick decisions, and everyday work.' : 'Draft → Laguna review → refinement → Nemotron. Great when clarity and nuance matter.'}</p><div className="mode-pipeline">{mode === 'fast' ? <><b>Skills</b><i>→</i><b>{PRIMARY_MODEL_NAME.split(' ').slice(1, 3).join(' ')}</b></> : <><b>Draft</b><i>→</i><b>Review</b><i>→</i><b>Refine</b></>}</div><button className="button button-primary landing-button" onClick={start}>Use {mode} mode <span aria-hidden="true">→</span></button></div></div>
    </section>
    <BeforeAfter />
    <section className="landing-section use-cases-section"><div className="section-heading"><span className="eyebrow">Made for real work</span><h2>Start with the work<br /><em>already on your desk.</em></h2></div><div className="use-case-grid">{useCases.map(([title, text, label]) => <article className="use-case-card" key={title}><span className="use-case-label">{label}</span><h3>{title}</h3><p>{text}</p><button className="text-link" onClick={start}>Build from this <span aria-hidden="true">↗</span></button></article>)}</div></section>
    <section className="landing-section proof-section" id="proof"><div className="proof-copy"><span className="eyebrow">Product proof</span><h2>Useful by design,<br /><em>transparent by default.</em></h2><p>PromptContext shows the inputs behind a recommendation: selected skills, execution mode, prompt slots, and review notes. You stay in control of what you copy and run.</p></div><div className="proof-points"><div><strong>Reusable context</strong><span>Save the parts of a good prompt that keep working.</span></div><div><strong>Clear hand-offs</strong><span>See where a fast pass ends and a quality review begins.</span></div><div><strong>Model-aware choices</strong><span>Use {PRIMARY_MODEL_NAME} for generation and {CRITIC_MODEL_ID.split('/')[1]} for critique.</span></div></div></section>
    <FinalCta onStart={start} />
    <footer className="landing-bottom"><span>PromptContext</span><span>Thoughtful prompts for focused teams.</span></footer>
  </div>;
}
