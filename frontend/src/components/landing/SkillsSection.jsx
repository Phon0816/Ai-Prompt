import Reveal from './Reveal';

const skills = [
  { icon: '◎', title: 'Context mapping', text: 'Turn a goal into the right role, audience, constraints, and output.' },
  { icon: '✦', title: 'Domain skills', text: 'Start with practical patterns for IT, healthcare, and your next use case.' },
  { icon: '↗', title: 'Model-aware', text: 'Shape every request around the model that will execute it.' },
];

export default function SkillsSection() {
  return (
    <section className="landing-section skills-section" id="how-it-works">
      <Reveal><div className="section-heading"><span className="eyebrow">A better starting point</span><h2>Good prompts are built,<br /><em>not guessed.</em></h2><p>PromptContext quietly handles the details that make an instruction work.</p></div></Reveal>
      <div className="skill-grid">{skills.map((skill, index) => <Reveal key={skill.title} delay={index * 80}><article className="skill-card"><span className="skill-icon">{skill.icon}</span><span className="skill-number">0{index + 1}</span><h3>{skill.title}</h3><p>{skill.text}</p><span className="skill-line" /></article></Reveal>)}</div>
    </section>
  );
}
