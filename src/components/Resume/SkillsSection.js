import React from 'react';

const icons = ['deployed_code', 'code', 'memory', 'palette'];

const SkillsSection = ({ skills }) => {
  // Let's just pick top 4 skills to fit the 2x2 grid in the original design
  const topSkills = skills.sort((a, b) => b.competency - a.competency).slice(0, 4);

  return (
    <div className="col-span-12 md:col-span-5 grid grid-cols-2 gap-4">
      {topSkills.map((skill, index) => (
        <div
          key={skill.title}
          className="bg-secondary/[0.03] dark:bg-secondary/[0.05] border border-secondary/10 dark:border-secondary/20 p-6 rounded-xl flex flex-col justify-between aspect-square"
        >
          <span className="material-symbols-outlined text-secondary text-3xl">{icons[index % 4]}</span>
          <div>
            <h4 className="font-label font-bold text-lg text-stone-800 dark:text-stone-200">{skill.title}</h4>
            <p className="text-[10px] uppercase tracking-tight text-stone-400 dark:text-stone-500">{skill.category[0]}</p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default SkillsSection;
