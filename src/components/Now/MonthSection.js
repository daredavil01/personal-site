import React from "react";
import NowBlogsSection from "./NowBlogsSection";
import NowRunningSection from "./NowRunningSection";
import NowBooksSection from "./NowBooksSection";
import NowEventsSection from "./NowEventsSection";
import NowProjectsSection from "./NowProjectsSection";
import NowStatsSection from "./NowStatsSection";
import NowWebsiteSection from "./NowWebsiteSection";
import NowCertificatesSection from "./NowCertificatesSection";
import NowMiscSection from "./NowMiscSection";

const MonthSection = ({ month }) => {
  const { sections = {} } = month;
  const heading = `${month.month} ${month.year}`;

  return (
    <div className="bg-secondary/[0.03] dark:bg-secondary/[0.05] border border-secondary/10 dark:border-secondary/20 rounded-xl p-6 md:p-8">
      <div className="flex items-center gap-3 mb-8">
        {month.isCurrent && (
          <div className="w-2 h-2 rounded-full bg-secondary animate-pulse shrink-0" />
        )}
        <h2
          className={`font-headline text-2xl font-bold ${
            month.isCurrent
              ? "text-stone-900 dark:text-stone-100"
              : "text-stone-700 dark:text-stone-300"
          }`}
        >
          {heading}
        </h2>
        {month.isCurrent && (
          <span className="font-label text-[9px] uppercase tracking-widest bg-secondary text-white px-2 py-0.5 rounded">
            Current
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 gap-8 divide-y divide-stone-100 dark:divide-stone-800">
        {sections.blogs?.length > 0 && (
          <div className="pt-8 first:pt-0">
            <NowBlogsSection blogs={sections.blogs} />
          </div>
        )}
        {sections.running?.length > 0 && (
          <div className="pt-8 first:pt-0">
            <NowRunningSection running={sections.running} />
          </div>
        )}
        {sections.books?.length > 0 && (
          <div className="pt-8 first:pt-0">
            <NowBooksSection books={sections.books} />
          </div>
        )}
        {sections.events?.length > 0 && (
          <div className="pt-8 first:pt-0">
            <NowEventsSection events={sections.events} />
          </div>
        )}
        {sections.projects?.length > 0 && (
          <div className="pt-8 first:pt-0">
            <NowProjectsSection projects={sections.projects} />
          </div>
        )}
        {sections.stats && (
          <div className="pt-8 first:pt-0">
            <NowStatsSection stats={sections.stats} />
          </div>
        )}
        {sections.website?.length > 0 && (
          <div className="pt-8 first:pt-0">
            <NowWebsiteSection website={sections.website} />
          </div>
        )}
        {sections.certificates?.length > 0 && (
          <div className="pt-8 first:pt-0">
            <NowCertificatesSection certificates={sections.certificates} />
          </div>
        )}
        {sections.misc?.length > 0 && (
          <div className="pt-8 first:pt-0">
            <NowMiscSection misc={sections.misc} />
          </div>
        )}
      </div>
    </div>
  );
};

export default MonthSection;
