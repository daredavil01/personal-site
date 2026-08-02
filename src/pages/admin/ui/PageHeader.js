import React from "react";
import { heading, mutedText } from "./tokens";

const PageHeader = ({ title, description, actions, className = "" }) => (
  <div className={`flex flex-wrap items-start justify-between gap-3 ${className}`}>
    <div className="min-w-0">
      <h1 className={`${heading} text-xl md:text-2xl mb-0`}>{title}</h1>
      {description && <p className={`text-sm ${mutedText} mt-1 mb-0`}>{description}</p>}
    </div>
    {actions && <div className="shrink-0 flex items-center gap-2">{actions}</div>}
  </div>
);

export default PageHeader;
