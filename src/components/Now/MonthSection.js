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

const Card = ({ children, full = false }) => (
  <div
    className={`bg-white dark:bg-stone-900 border border-stone-100 dark:border-stone-800 rounded-xl p-6 hover:border-secondary/30 dark:hover:border-secondary/30 transition-colors ${
      full ? "md:col-span-2" : ""
    }`}
  >
    {children}
  </div>
);

const MonthSection = ({ month }) => {
  const { sections = {} } = month;
  const heading = `${month.month} ${month.year}`;

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        {month.isCurrent && (
          <div className="w-2 h-2 rounded-full bg-secondary animate-pulse shrink-0" />
        )}
        <h2 className="font-headline text-3xl font-black text-stone-900 dark:text-stone-100 tracking-tight mb-0">
          {heading}
        </h2>
        {month.isCurrent && (
          <span className="font-label text-[9px] uppercase tracking-widest bg-secondary text-white px-2 py-0.5 rounded">
            Current
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sections.blogs?.length > 0 && (
          <Card full>
            <NowBlogsSection blogs={sections.blogs} />
          </Card>
        )}
        {sections.running?.length > 0 && (
          <Card>
            <NowRunningSection running={sections.running} />
          </Card>
        )}
        {sections.books?.length > 0 && (
          <Card>
            <NowBooksSection books={sections.books} />
          </Card>
        )}
        {sections.events?.length > 0 && (
          <Card full>
            <NowEventsSection events={sections.events} />
          </Card>
        )}
        {sections.projects?.length > 0 && (
          <Card>
            <NowProjectsSection projects={sections.projects} />
          </Card>
        )}
        {sections.website?.length > 0 && (
          <Card>
            <NowWebsiteSection website={sections.website} />
          </Card>
        )}
        {sections.certificates?.length > 0 && (
          <Card>
            <NowCertificatesSection certificates={sections.certificates} />
          </Card>
        )}
        {sections.misc?.length > 0 && (
          <Card>
            <NowMiscSection misc={sections.misc} />
          </Card>
        )}
        {sections.stats && (
          <Card full>
            <NowStatsSection stats={sections.stats} />
          </Card>
        )}
      </div>
    </div>
  );
};

export default MonthSection;
