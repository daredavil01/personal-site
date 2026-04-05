import React from "react";

import Main from "../layouts/Main";
import EmailLink from "../components/Contact/EmailLink";
import ContactIcons from "../components/Contact/ContactIcons";

const Contact = () => (
  <Main
    title="Contact"
    description="Get in touch with Sanket Tambare to discuss technology, endurance sports, or collaboration opportunities. Open to projects, research, and meaningful conversations."
  >
    <div className="flex flex-col gap-12 w-full max-w-2xl">
      <header>
        <p className="font-label text-xs uppercase tracking-[0.3em] text-secondary mb-4 font-bold">Let&apos;s Talk</p>
        <h1 className="font-headline text-5xl md:text-7xl font-black text-stone-900 dark:text-stone-100 leading-[0.9] tracking-tighter mb-6">
          Get In Touch.
        </h1>
        <p className="font-body text-stone-500 dark:text-stone-400 text-lg leading-relaxed">
          Feel free to send me a message. Whether it&apos;s about technology, design, marathons, or collaboration — my inbox is always open.
        </p>
      </header>

      <div className="flex flex-col gap-6 bg-secondary/[0.03] dark:bg-secondary/[0.05] border border-secondary/10 dark:border-secondary/20 p-8 rounded-xl">
        <div>
          <span className="font-label text-[10px] uppercase tracking-widest text-stone-500 dark:text-stone-600 font-bold block mb-2">Email</span>
          <EmailLink />
        </div>
        <div className="pt-6 border-t border-stone-100 dark:border-stone-800">
          <span className="font-label text-[10px] uppercase tracking-widest text-stone-500 dark:text-stone-600 font-bold block mb-4">Social Links</span>
          <ContactIcons />
        </div>
      </div>
    </div>
  </Main>
);

export default Contact;
