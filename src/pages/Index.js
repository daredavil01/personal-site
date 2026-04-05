import React from "react";
import { Link } from "react-router-dom";
import Main from "../layouts/Main";
import LifeStats from "../components/Index/LifeStats";

const features = [
  {
    title: "About Me",
    desc: "I am a software developer specialized in full-stack development. My interests span technology, society, and marathons. I critically engage in new developments and aim to better myself every day.",
    path: "/about",
    icon: "person",
  },
  {
    title: "Now",
    desc: "What I'm doing lately: from developing AI-focused blogs and finishing the Tata Ultra 50K Marathon to publishing thoughts on our digital identities.",
    path: "/now",
    icon: "schedule",
  },
  {
    title: "Challenges",
    desc: "Tracking personal and professional hurdles like the '#100DaysToOffload' blogging challenge to maintain consistency and growth.",
    path: "/challenges",
    icon: "hotel_class",
  },
  {
    title: "Digital Library",
    desc: "An interactive catalog of my reading journey, featuring reviews and ratings for over 100 books that have shaped my perspective.",
    path: "/books",
    icon: "auto_stories",
  },
  {
    title: "Project Archive",
    desc: "A showcase of technical experiments and applications, including social platforms and management tools built with modern tech stacks.",
    path: "/projects",
    icon: "terminal",
  },
  {
    title: "Sports Log",
    desc: "A record of my endurance journey, featuring marathon results, training logs, and personal bests from 10K to Full Marathons.",
    path: "/sports",
    icon: "fitness_center",
  },
  {
    title: "Vital Stats",
    desc: "A data-driven snapshot of my activities: from the number of books read and kilometers run to the lines of code written.",
    path: "/stats",
    icon: "query_stats",
  },
  {
    title: "Visual Narrative",
    desc: "A curated archive of captured moments, textures, and digital stories, preserved from a time before my Instagram account was deleted.",
    path: "/instagram",
    icon: "photo_library",
  },
  {
    title: "Professional Resume",
    desc: "Explore my professional background, from full-stack engineering to my work with social organizations and geotechnological research.",
    path: "/resume",
    icon: "badge",
  },
  {
    title: "Get In Touch",
    desc: "Wanna discuss technology, society, or marathons? Reach out for collaborations, discussions, or just a friendly chat.",
    path: "/contact",
    icon: "alternate_email",
  },
];

const Index = () => (
  <Main
    description={
      "Sanket Tambare's personal portfolio hub. Software engineer, marathoner, and digital curator."
    }
  >
    <article className="w-full flex flex-col gap-12">
      <header className="mb-4">
        <p className="font-label text-xs uppercase tracking-[0.3em] text-secondary font-bold mb-4">Sanket Tambare</p>
        <h1 className="font-headline text-5xl md:text-7xl font-black text-stone-900 dark:text-stone-100 leading-[0.9] tracking-tighter mb-6">
          The Digital Hub.
        </h1>
        <p className="font-body text-lg text-stone-500 dark:text-stone-400 max-w-2xl leading-relaxed">
          Welcome to my digital garden — an intentional archive of professional work, creative pursuits, and physical challenges.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {features.map((item) => (
          <div key={item.path} className="p-8 bg-secondary/[0.03] dark:bg-secondary/[0.05] border border-secondary/10 dark:border-secondary/20 rounded-xl hover:border-secondary dark:hover:border-secondary transition-colors group flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <span className="material-symbols-outlined text-secondary opacity-60 group-hover:opacity-100 transition-opacity">
                  {item.icon}
                </span>
                <h3 className="font-headline text-xl font-bold uppercase tracking-widest text-stone-800 dark:text-stone-200">
                  <Link to={item.path} className="no-underline hover:text-secondary transition-colors">{item.title}</Link>
                </h3>
              </div>
              <p className="font-body text-stone-500 dark:text-stone-400 leading-relaxed text-sm">
                {item.desc}
              </p>
            </div>
            <div className="mt-6">
              <Link to={item.path} className="font-label text-[10px] uppercase tracking-[0.2em] font-bold text-secondary flex items-center gap-2 group-hover:gap-4 transition-all no-underline">
                Explore Section
                <span className="material-symbols-outlined text-[14px]">arrow_right_alt</span>
              </Link>
            </div>
          </div>
        ))}
      </div>

      <LifeStats />

      <section className="mt-4 p-12 bg-secondary/[0.03] dark:bg-secondary/[0.05] border border-secondary/10 dark:border-secondary/20 rounded-2xl text-center">
        <h2 className="font-headline text-3xl font-black mb-6 text-stone-900 dark:text-stone-100">Let&apos;s build the future together.</h2>
        <p className="max-w-xl mx-auto text-stone-500 dark:text-stone-400 font-body mb-8">
          Whether it&apos;s a technical challenge, a research collaboration, or sharing a mile 
          on the road, I&apos;m always open to meaningful engagement.
        </p>
        <Link 
          to="/contact" 
          className="inline-block px-8 py-3 border border-stone-200 dark:border-stone-700 text-stone-800 dark:text-stone-200 font-label text-[10px] uppercase tracking-widest font-bold hover:bg-stone-900 hover:text-white dark:hover:bg-stone-100 dark:hover:text-stone-950 transition-all rounded-sm no-underline"
        >
          Start a Conversation
        </Link>
      </section>
    </article>
  </Main>
);

export default Index;
