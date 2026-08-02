import React from "react";
import { card, hairline, heading, mutedText } from "./tokens";

const Card = ({
  title, description, actions, footer, className = "", bodyClassName = "p-4", children,
}) => (
  <section className={`${card} ${className}`}>
    {(title || actions) && (
      <header className={`flex items-start justify-between gap-3 px-4 py-3 border-b ${hairline}`}>
        <div className="min-w-0">
          {title && <h2 className={`${heading} text-sm mb-0`}>{title}</h2>}
          {description && <p className={`text-xs ${mutedText} mt-0.5 mb-0`}>{description}</p>}
        </div>
        {actions && <div className="shrink-0 flex items-center gap-2">{actions}</div>}
      </header>
    )}
    <div className={bodyClassName}>{children}</div>
    {footer && <footer className={`px-4 py-3 border-t ${hairline}`}>{footer}</footer>}
  </section>
);

export default Card;
