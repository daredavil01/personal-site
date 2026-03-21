import React from 'react';

const icons = ['deployed_code', 'code', 'memory', 'palette'];
const bgs = ['bg-secondary/[0.03] border border-secondary/10', 'bg-secondary/[0.03] border border-secondary/10', 'bg-secondary/[0.03] border border-secondary/10', 'bg-secondary/[0.03] border border-secondary/10'];
const textColors = ['text-stone-800', 'text-stone-800', 'text-stone-800', 'text-stone-800'];
const descColors = ['text-stone-400', 'text-stone-400', 'text-stone-400', 'text-stone-400'];

const SkillsSection = ({ skills }) => {
  // Let's just pick top 4 skills to fit the 2x2 grid in the original design
  const topSkills = skills.sort((a, b) => b.competency - a.competency).slice(0, 4);

  return (
    <div className="col-span-12 md:col-span-5 grid grid-cols-2 gap-4">
      {topSkills.map((skill, index) => (
        <div key={skill.title} className={`${bgs[index % 4]} p-6 rounded-xl flex flex-col justify-between aspect-square`}>
          <span className="material-symbols-outlined text-secondary text-3xl">{icons[index % 4]}</span>
          <div>
            <h4 className={`font-label font-bold text-lg ${textColors[index % 4]}`}>{skill.title}</h4>
            <p className={`text-[10px] uppercase tracking-tight ${descColors[index % 4]}`}>{skill.category[0]}</p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default SkillsSection;
