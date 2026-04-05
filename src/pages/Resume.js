import React from "react";
import Main from "../layouts/Main";
import SkillsSection from "../components/Resume/SkillsSection";
import ExperienceSection from "../components/Resume/ExperienceSection";
import EducationSection from "../components/Resume/EducationSection";
import CertificationsSection from "../components/Resume/CertificationsSection";

import { skills } from "../data/resume/skills";
import positions from "../data/resume/positions";
import degrees from "../data/resume/degrees";
import certifications from "../data/resume/certifications";

const Resume = () => {
  return (
    <Main
      title="Resume"
      description="Professional background of Sanket Tambare — full-stack engineer with experience in cloud infrastructure, AI integration, and enterprise software. Includes work history, education, and certifications."
    >
      <div className="flex flex-col gap-12 w-full">
        {/* Hero Section */}
        <header className="mb-12">
          <p className="font-label text-xs uppercase tracking-[0.3em] text-secondary mb-4">Expertise & Competencies</p>
          <h1 className="font-headline text-5xl md:text-7xl font-black text-stone-900 dark:text-stone-100 leading-[0.9] tracking-tighter mb-8">
            Technical<br />Arsenal.
          </h1>
          <div className="max-w-2xl">
            <p className="text-xl text-stone-500 dark:text-stone-400 font-light leading-relaxed">
              A curated collection of frameworks, languages, and infrastructure tools leveraged to build high-performance digital experiences and resilient cloud architectures.
            </p>
          </div>
        </header>

        {/* Main Content Grid */}
        <div className="grid grid-cols-12 gap-6 w-full">
          {/* Primary Interests / Summary (Bento Large) */}
          <section className="col-span-12 md:col-span-7 bg-secondary/[0.03] p-10 rounded-xl relative overflow-hidden group border border-secondary/10">
            <div className="relative z-10">
              <span className="font-label text-[10px] uppercase tracking-widest text-stone-400">Focus Area</span>
              <h3 className="font-headline text-3xl mt-2 mb-6 text-stone-800">Human-AI Interface Design</h3>
              <p className="text-stone-600 leading-relaxed text-lg mb-8">
                Synthesizing complex computational logic into intuitive human experiences. My work focuses on bridging the gap between sophisticated LLM capabilities and seamless user interactions, prioritizing cognitive load reduction and aesthetic intentionality.
              </p>
              <div className="flex items-center gap-4">
                <div className="h-[1px] w-12 bg-secondary"></div>
                <span className="font-label text-xs uppercase tracking-widest text-secondary">Work Experience Focus</span>
              </div>
            </div>
            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
              <span className="material-symbols-outlined text-9xl text-stone-900" style={{ fontVariationSettings: "'FILL' 1" }}>neurology</span>
            </div>
          </section>

          {/* Skill Cards Grid */}
          <SkillsSection skills={skills} />

          {/* Professional Experience */}
          <ExperienceSection positions={positions} />

          {/* Education */}
          <EducationSection degrees={degrees} />

          {/* Certifications (Glass Card) */}
          <CertificationsSection certifications={certifications} />
        </div>
      </div>
    </Main>
  );
};

export default Resume;
