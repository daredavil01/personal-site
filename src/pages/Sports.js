import React, { useState } from "react";
import Main from "../layouts/Main";
import SportsStatistics from "../components/Sports/SportsStatistics";
import SportsInteractive from "../components/Sports/SportsInteractive";
import SportsDefault from "../components/Sports/SportsDefault";
import MarathonDetailsModal from "../components/Sports/MarathonDetailsModal";

const SportsPage = () => {
  const [activeTab, setActiveTab] = useState('STATISTICS');
  const [selectedRace, setSelectedRace] = useState(null);
  const [copied, setCopied] = useState(false);

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const tabs = ['STATISTICS', 'INTERACTIVE VIEW', 'DEFAULT VIEW'];

  const handleRaceClick = (race) => {
    setSelectedRace(race);
  };

  return (
    <Main
      title="Physical Endurance"
      description="A dedicated record of athletic pursuits, where discipline meets the pavement."
    >
      <div className="flex flex-col gap-12 w-full">
        {/* Hero Section */}
        <header>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-end">
            <div>
              <span className="font-label text-secondary uppercase tracking-[0.3em] font-bold text-xs mb-4 block">Performance & Grit</span>
              <h1 className="font-headline text-5xl lg:text-7xl text-stone-900 dark:text-stone-100 leading-none tracking-tight">Physical <br />Endurance</h1>
            </div>
            <div className="max-w-md pb-4">
              <p className="font-body text-stone-500 dark:text-stone-400 text-lg leading-relaxed">
                A dedicated record of athletic pursuits, where discipline meets the pavement. Tracking the evolution of speed, distance, and the mental fortitude required for long-distance endurance.
              </p>
            </div>
          </div>
        </header>

        {/* Tab Navigation */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-stone-200 dark:border-stone-800 pb-4">
          <div className="flex flex-wrap items-center gap-2 bg-stone-100 dark:bg-stone-800/50 p-1.5 rounded-xl">
            {tabs.map((tab) => {
              const isActive = activeTab === tab;
              let activeColor = "text-stone-900 dark:text-stone-100 bg-white dark:bg-stone-700 shadow-sm";
              if (isActive) {
                if (tab === 'STATISTICS') activeColor = "text-green-600 dark:text-green-400 bg-white dark:bg-stone-700 shadow-sm";
                if (tab === 'INTERACTIVE VIEW') activeColor = "text-purple-600 dark:text-purple-400 bg-white dark:bg-stone-700 shadow-sm";
                if (tab === 'DEFAULT VIEW') activeColor = "text-blue-600 dark:text-blue-400 bg-white dark:bg-stone-700 shadow-sm";
              } else {
                activeColor = "text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-300 hover:bg-stone-200/50 dark:hover:bg-stone-800/50";
              }
              
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-6 py-2.5 rounded-lg font-label text-xs uppercase tracking-widest font-bold transition-all ${activeColor}`}
                >
                  {tab}
                </button>
              );
            })}
          </div>
          
          <button
            onClick={handleShare}
            className="flex items-center gap-2 bg-indigo-500 hover:bg-indigo-600 text-white px-5 py-2.5 rounded-lg font-label text-xs uppercase tracking-widest font-bold transition-colors shadow-sm"
          >
            <span className="material-symbols-outlined text-[16px]">{copied ? 'check' : 'share'}</span>
            {copied ? 'Copied!' : 'Share'}
          </button>
        </div>

        {/* Tab Content */}
        <div className="w-full">
          {activeTab === 'STATISTICS' && <SportsStatistics />}
          {activeTab === 'INTERACTIVE VIEW' && <SportsInteractive onRaceClick={handleRaceClick} />}
          {activeTab === 'DEFAULT VIEW' && <SportsDefault onRaceClick={handleRaceClick} />}
        </div>
      </div>

      <MarathonDetailsModal 
        isOpen={!!selectedRace} 
        onClose={() => setSelectedRace(null)} 
        raceDetails={selectedRace} 
      />
    </Main>
  );
};

export default SportsPage;
