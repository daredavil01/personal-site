import React, { useMemo } from "react";
import Main from "../layouts/Main";
import SportsV2 from "../components/Sports/SportsV2";
import sportsData from "../data/sports";

const formatPace = (timeStr, distanceStr) => {
  if (!timeStr) return "0'00\"";
  const parts = timeStr.split(':');
  let totalSeconds = 0;
  if (parts.length === 2) {
    totalSeconds = parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
  } else if (parts.length === 3) {
    totalSeconds = parseInt(parts[0], 10) * 3600 + parseInt(parts[1], 10) * 60 + parseInt(parts[2], 10);
  }
  const distanceKm = parseFloat(distanceStr.replace(/[^\d.]/g, ''));
  if (distanceKm === 0) return "0'00\"";
  
  const secondsPerKm = totalSeconds / distanceKm;
  const mins = Math.floor(secondsPerKm / 60);
  const secs = Math.floor(secondsPerKm % 60);
  return `${mins}'${secs.toString().padStart(2, '0')}"`;
};

const getPB = (distancePattern) => {
  let best = null;
  let bestSecs = Infinity;

  sportsData.forEach((race) => {
    if (race.distance.toLowerCase().includes(distancePattern)) {
      const parts = race.time.split(':');
      let secs = 0;
      if (parts.length === 2) {
        secs = parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
      } else if (parts.length === 3) {
        secs = parseInt(parts[0], 10) * 3600 + parseInt(parts[1], 10) * 60 + parseInt(parts[2], 10);
      }

      if (secs < bestSecs && secs > 0) {
        bestSecs = secs;
        best = race;
      }
    }
  });

  return best;
};

const SportsPage = () => {
  const marathonPB = useMemo(() => getPB('42'), []);
  const halfMarathonPB = useMemo(() => getPB('21'), []);

  const formatHoursDisplay = (timeStr) => {
    if (!timeStr) return "00:00";
    const parts = timeStr.split(':');
    if (parts.length === 3) {
      return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
    }
    return timeStr;
  };
  return (
    <Main
      title="Physical Endurance"
      description="A dedicated record of athletic pursuits, where discipline meets the pavement."
    >
      <div className="flex flex-col gap-16 w-full">
        {/* Hero Section */}
        <header>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-end">
            <div>
              <span className="font-label text-secondary uppercase tracking-[0.3em] font-bold text-xs mb-4 block">Performance & Grit</span>
              <h1 className="font-headline text-5xl md:text-7xl text-stone-900 dark:text-stone-100 leading-none tracking-tight">Physical <br />Endurance</h1>
            </div>
            <div className="max-w-md pb-4">
              <p className="font-body text-stone-500 dark:text-stone-400 text-lg leading-relaxed">
                A dedicated record of athletic pursuits, where discipline meets the pavement. Tracking the evolution of speed, distance, and the mental fortitude required for long-distance endurance.
              </p>
            </div>
          </div>
        </header>

        {/* Personal Bests Bento Grid */}
        <section>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Marathon PB */}
            {marathonPB ? (
              <div className="col-span-1 md:col-span-2 bg-stone-50 dark:bg-stone-900 p-12 rounded-xl flex flex-col justify-between relative overflow-hidden group border border-stone-100 dark:border-stone-800">
                <div className="absolute top-0 right-0 p-8 opacity-10">
                  <span className="material-symbols-outlined text-[120px] text-stone-200 dark:text-stone-700">directions_run</span>
                </div>
                <div className="relative z-10">
                  <h3 className="font-label text-secondary uppercase tracking-widest font-bold text-sm mb-12">Marathon Personal Best</h3>
                  <div className="flex items-baseline gap-4">
                    <span className="font-headline text-8xl text-stone-900 dark:text-stone-100 tracking-tighter cursor-help" title={marathonPB.time}>{formatHoursDisplay(marathonPB.time)}</span>
                    <span className="font-label text-stone-400 dark:text-stone-500 font-medium text-2xl uppercase">Hours</span>
                  </div>
                </div>
                <div className="relative z-10 flex justify-between items-end mt-12 w-full">
                  <div>
                    <p className="font-label text-xs text-stone-400 dark:text-stone-500 uppercase tracking-widest">Distance</p>
                    <p className="font-headline text-2xl text-stone-800 dark:text-stone-200">{marathonPB.distance}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-label text-xs text-stone-400 dark:text-stone-500 uppercase tracking-widest">Location</p>
                    <p className="font-body font-medium text-stone-600 dark:text-stone-400 line-clamp-1 max-w-[200px]">{marathonPB.place}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="col-span-1 md:col-span-2 bg-secondary/[0.03] dark:bg-secondary/[0.05] border border-secondary/10 dark:border-secondary/20 p-12 rounded-xl flex items-center justify-center">
                <span className="font-label text-stone-400 dark:text-stone-500 uppercase tracking-widest">No Marathon Records Found</span>
              </div>
            )}

            {/* Half Marathon PB */}
            {halfMarathonPB ? (
              <div className="col-span-1 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 p-12 rounded-xl flex flex-col justify-between border border-stone-100 dark:border-stone-800">
                <div>
                  <h3 className="font-label text-secondary uppercase tracking-widest font-bold text-sm mb-12">Half Marathon</h3>
                  <div className="flex items-baseline gap-2">
                    <span className="font-headline text-6xl tracking-tighter cursor-help" title={halfMarathonPB.time}>{formatHoursDisplay(halfMarathonPB.time)}</span>
                    <span className="font-label text-stone-400 dark:text-stone-500 text-lg uppercase">Hrs</span>
                  </div>
                </div>
                <div className="mt-12">
                  <p className="font-label text-xs text-stone-400 dark:text-stone-500 uppercase tracking-widest mb-1">Distance</p>
                  <p className="font-headline text-2xl text-stone-800 dark:text-stone-200">{halfMarathonPB.distance}</p>
                  <div className="mt-6 pt-6 border-t border-stone-100 dark:border-stone-800">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-secondary text-sm">speed</span>
                        <span className="font-label text-sm text-stone-500 dark:text-stone-400">Pace: {formatPace(halfMarathonPB.time, halfMarathonPB.distance)}/km</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="col-span-1 bg-secondary/[0.03] dark:bg-secondary/[0.05] border border-secondary/10 dark:border-secondary/20 p-12 rounded-xl flex items-center justify-center">
                <span className="font-label text-stone-400 dark:text-stone-500 uppercase tracking-widest">No Half Marathon Records</span>
              </div>
            )}
          </div>
        </section>

        {/* Dynamic Event Log Component */}
        <SportsV2 />
      </div>
    </Main>
  );
};

export default SportsPage;
