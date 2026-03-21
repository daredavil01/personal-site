import React, { useState, useMemo } from "react";
import sportsData from "../../data/sports";
import SportV2 from "./SportV2";

const SportsV2 = () => {
  const [filterDistance, setFilterDistance] = useState("all");
  const [filterYear, setFilterYear] = useState("all");
  const [filterLocation, setFilterLocation] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  const years = useMemo(() => {
    const yearSet = new Set(sportsData.map((race) => new Date(race.date).getFullYear().toString()));
    return [...yearSet].sort((a, b) => b - a);
  }, []);

  const locations = useMemo(() => {
    const locSet = new Set(sportsData.map((race) => {
      const parts = race.place.split(",");
      return parts[parts.length - 1].trim();
    }));
    return [...locSet].sort();
  }, []);

  const filteredData = useMemo(() => {
    return sportsData.filter((race) => {
      if (filterDistance !== "all") {
        const distance = race.distance.toLowerCase();
        if (filterDistance === "10k" && !distance.includes("10")) return false;
        if (filterDistance === "21k" && !distance.includes("21")) return false;
        if (filterDistance === "35k" && !distance.includes("35")) return false;
        if (filterDistance === "42k" && !distance.includes("42")) return false;
        if (filterDistance === "50k" && !distance.includes("50")) return false;
      }
      if (filterYear !== "all") {
        if (new Date(race.date).getFullYear().toString() !== filterYear) return false;
      }
      if (filterLocation !== "all") {
        const raceCity = race.place.split(",").pop().trim();
        if (raceCity !== filterLocation) return false;
      }
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        return race.title.toLowerCase().includes(term) || race.place.toLowerCase().includes(term);
      }
      return true;
    }).sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [filterDistance, filterYear, filterLocation, searchTerm]);

  return (
    <section className="max-w-4xl mx-auto w-full">
      <h4 className="font-headline text-4xl mb-12 text-center text-stone-800">Event Log ({filteredData.length})</h4>
      
      {/* Filters Container */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-12 w-full bg-secondary/[0.03] p-4 rounded-xl border border-secondary/10 items-center">
        <div className="relative col-span-1 md:col-span-4">
          <input 
            type="text" 
            placeholder="Search races..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-12 bg-white border border-stone-100 rounded-lg px-10 font-body text-sm text-stone-950 placeholder:text-stone-400 outline-none focus:border-secondary transition-colors"
          />
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none text-[18px]">search</span>
        </div>
        
        <div className="col-span-1 md:col-span-3">
          <select 
            value={filterDistance}
            onChange={(e) => setFilterDistance(e.target.value)}
            className="w-full h-12 bg-white border border-stone-200 rounded-lg px-4 font-label text-xs uppercase tracking-wider text-stone-800 outline-none cursor-pointer hover:border-secondary transition-colors"
          >
            <option value="all">All Distances</option>
            <option value="10k">10K</option>
            <option value="21k">Half Marathon</option>
            <option value="35k">35K Run</option>
            <option value="42k">Full Marathon</option>
            <option value="50k">50K Ultra</option>
          </select>
        </div>
        
        <div className="col-span-1 md:col-span-2">
          <select 
            value={filterYear}
            onChange={(e) => setFilterYear(e.target.value)}
            className="w-full h-12 bg-white border border-stone-200 rounded-lg px-4 font-label text-xs uppercase tracking-wider text-stone-800 outline-none cursor-pointer hover:border-secondary transition-colors"
          >
            <option value="all">All Years</option>
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>

        <div className="col-span-1 md:col-span-3">
          <select 
            value={filterLocation}
            onChange={(e) => setFilterLocation(e.target.value)}
            className="w-full h-12 bg-white border border-stone-200 rounded-lg px-4 font-label text-xs uppercase tracking-wider text-stone-800 outline-none cursor-pointer hover:border-secondary transition-colors"
          >
            <option value="all">All Locations</option>
            {locations.map((loc) => <option key={loc} value={loc}>{loc}</option>)}
          </select>
        </div>
      </div>

      {/* Clear Filters Button */}
      <div className="flex justify-end mb-8 -mt-8 h-8">
        {(filterDistance !== "all" || filterYear !== "all" || filterLocation !== "all" || searchTerm !== "") && (
          <button 
            onClick={() => {
              setFilterDistance("all");
              setFilterYear("all");
              setFilterLocation("all");
              setSearchTerm("");
            }}
            className="flex items-center gap-2 text-secondary font-label text-[10px] uppercase tracking-widest font-bold hover:text-stone-900 transition-colors"
          >
            <span className="material-symbols-outlined text-sm">restart_alt</span>
            Clear Filters
          </button>
        )}
      </div>

      <div className="space-y-4">
        {filteredData.length > 0 ? filteredData.map((race) => (
          <SportV2 key={race.id} data={race} />
        )) : (
          <div className="text-center py-12 text-stone-400 font-body border border-dashed border-secondary/20 rounded-xl bg-secondary/[0.03]">No races found matching your criteria.</div>
        )}
      </div>
    </section>
  );
};

export default SportsV2;
