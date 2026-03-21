import React from "react";
import { Link } from "react-router-dom";
import Main from "../layouts/Main";

const Challenges = () => {
  return (
    <Main
      title="Challenges"
      description="A public commitment to iterative improvement. Tracking creative production and technical mastery."
    >
      <article className="max-w-4xl">
        <header className="mb-12">
          <h1 className="font-headline text-4xl font-bold text-stone-900 mb-4 uppercase tracking-tighter">Challenges</h1>
          <p className="font-label text-xs uppercase tracking-[0.3em] text-stone-400 font-medium">
            Pushing boundaries, one step at a time.
          </p>
          <div className="h-px w-full bg-stone-100 mt-8" />
        </header>

        <div className="space-y-12">
          {/* About Section */}
          <section>
            <h2 className="font-label text-[10px] uppercase tracking-[0.2em] text-stone-900 font-bold mb-6">About Me</h2>
            <p className="text-stone-500 leading-relaxed text-xs md:text-sm max-w-2xl">
              I have always been inclined towards pushing my boundaries. From software development to marathon running, 
              I find joy in challenging myself to learn, grow, and explore new horizons. This drive to better myself 
              everyday is what fuels my journey across technology, writing, and physical endurance.
            </p>
          </section>

          {/* Why This Page Section */}
          <section>
            <h2 className="font-label text-[10px] uppercase tracking-[0.2em] text-stone-900 font-bold mb-6">Why This Page?</h2>
            <p className="text-stone-500 leading-relaxed text-xs md:text-sm max-w-2xl">
              In the pursuit of growth, consistency is key, but often the hardest part. This page serves as my public 
              accountability ledger. By documenting my challenges here, I am not just tracking progress, but making 
              a commitment to myself and the world. It is a space to visualize my efforts, celebrate small wins, 
              and stay true to the goals I set, ensuring that my ambitions translate into tangible actions.
            </p>
          </section>

          {/* Active Challenges Section */}
          <section>
            <h2 className="font-label text-[10px] uppercase tracking-[0.2em] text-stone-900 font-bold mb-6">Active Challenges</h2>
            <div className="grid grid-cols-1 gap-6">
              <Link 
                to="/100-days-to-offload"
                className="group block bg-white p-8 rounded-xl border border-stone-100 hover:border-secondary transition-all duration-300 shadow-sm hover:shadow-md"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h3 className="font-headline text-lg font-bold text-stone-800 mb-2 group-hover:text-secondary transition-colors uppercase tracking-widest">
                      100 Days To Offload
                    </h3>
                    <p className="text-stone-400 text-xs italic mb-4">Can I publish 100 posts on blog in a year?</p>
                    <div className="flex items-center gap-2">
                        <span className="px-2 py-1 bg-stone-50 text-[9px] text-stone-400 font-label uppercase tracking-wider rounded">Started on: 2025-01-22</span>
                    </div>
                  </div>
                </div>
              </Link>
            </div>
          </section>

          {/* Stats Section */}
          <section>
            <h2 className="font-label text-[10px] uppercase tracking-[0.2em] text-stone-900 font-bold mb-6">Stats</h2>
            <div className="bg-white p-8 rounded-xl border border-stone-100 shadow-sm">
                <div className="flex flex-col items-center">
                    <span className="text-3xl font-headline font-bold text-secondary mb-1">1</span>
                    <span className="font-label text-[9px] uppercase tracking-[0.2em] text-stone-400">Total Challenges</span>
                </div>
            </div>
          </section>
        </div>
      </article>
    </Main>
  );
};

export default Challenges;
