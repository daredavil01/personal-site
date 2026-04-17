import React, { useState } from 'react';
import useCMSStatus from '../../hooks/useCMSStatus';
import TextInput from './TextInput';

const Badge = ({ label, variant }) => {
  const styles = {
    recommended: 'bg-secondary/10 text-secondary border border-secondary/20',
    external: 'bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800',
    diy: 'bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400 border border-stone-200 dark:border-stone-700',
  };
  return (
    <span className={`text-xs font-label px-2 py-0.5 rounded-full ${styles[variant]}`}>
      {label}
    </span>
  );
};

const SetupGuide = ({ children }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-t border-stone-100 dark:border-stone-800 mt-4 pt-4">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 text-xs font-label text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 transition-colors"
      >
        <span>{open ? '▲' : '▼'}</span>
        Setup Guide
      </button>
      {open && (
        <div className="mt-3 text-sm font-body text-stone-600 dark:text-stone-400 leading-relaxed">
          {children}
        </div>
      )}
    </div>
  );
};

const DecapCard = ({ decapConfigured }) => (
  <div className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 p-6 flex flex-col gap-4">
    <div className="flex items-start justify-between gap-3">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-secondary/20 to-secondary/10 flex items-center justify-center text-secondary font-headline font-black text-lg">
          D
        </div>
        <div>
          <h3 className="font-label text-sm font-bold text-stone-900 dark:text-stone-100">Decap CMS</h3>
          <p className="text-xs text-stone-400">Git-based · Free &amp; Open Source</p>
        </div>
      </div>
      <Badge label="Recommended" variant="recommended" />
    </div>

    <p className="font-body text-sm text-stone-600 dark:text-stone-400">
      Edits are committed directly to your GitHub repository. No database, no external service. The site rebuilds automatically on Cloudflare Pages after each commit.
    </p>

    <div className="flex items-center gap-2">
      {decapConfigured ? (
        <span className="text-xs font-label bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 px-2 py-0.5 rounded-full border border-green-200 dark:border-green-800">
          Configured
        </span>
      ) : (
        <span className="text-xs font-label bg-stone-100 dark:bg-stone-800 text-stone-400 px-2 py-0.5 rounded-full border border-stone-200 dark:border-stone-700">
          Not configured
        </span>
      )}
    </div>

    <a
      href="/cms/"
      target="_blank"
      rel="noopener noreferrer"
      className="inline-block self-start bg-secondary text-white text-sm font-label px-4 py-2 rounded-lg hover:bg-secondary/90 transition-colors"
    >
      Open Decap CMS
    </a>

    <SetupGuide>
      <ol className="list-decimal list-inside space-y-2">
        <li>
          <strong>Local dev:</strong> <code className="bg-stone-100 dark:bg-stone-800 px-1 rounded text-xs">public/cms/config.yml</code> already uses{' '}
          <code className="bg-stone-100 dark:bg-stone-800 px-1 rounded text-xs">test-repo</code> backend — no login required. Navigate to{' '}
          <code className="bg-stone-100 dark:bg-stone-800 px-1 rounded text-xs">/cms/</code> to start.
        </li>
        <li>
          <strong>Production:</strong> Change <code className="bg-stone-100 dark:bg-stone-800 px-1 rounded text-xs">backend.name</code> in{' '}
          <code className="bg-stone-100 dark:bg-stone-800 px-1 rounded text-xs">public/cms/config.yml</code> from{' '}
          <code className="bg-stone-100 dark:bg-stone-800 px-1 rounded text-xs">test-repo</code> to{' '}
          <code className="bg-stone-100 dark:bg-stone-800 px-1 rounded text-xs">github</code>, add your repo, and set up a free{' '}
          <a href="https://decapcms.org/docs/github-backend/" target="_blank" rel="noopener noreferrer" className="text-secondary underline">GitHub OAuth proxy</a>{' '}
          (Netlify free tier can act as auth proxy).
        </li>
        <li>
          After Decap commits new content, run{' '}
          <code className="bg-stone-100 dark:bg-stone-800 px-1 rounded text-xs">npm run cms:sync</code> locally to merge markdown → JS data files, then push.
        </li>
      </ol>
    </SetupGuide>
  </div>
);

const ContentfulCard = () => (
  <div className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 p-6 flex flex-col gap-4">
    <div className="flex items-start justify-between gap-3">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center text-blue-500 font-headline font-black text-lg">
          C
        </div>
        <div>
          <h3 className="font-label text-sm font-bold text-stone-900 dark:text-stone-100">Contentful</h3>
          <p className="text-xs text-stone-400">Headless CMS · API-based</p>
        </div>
      </div>
      <Badge label="External Service" variant="external" />
    </div>

    <p className="font-body text-sm text-stone-600 dark:text-stone-400">
      Rich headless CMS with a polished UI. Requires migrating data from JS files to Contentful content types and fetching via their API. Free tier has limits.
    </p>

    <a
      href="https://app.contentful.com"
      target="_blank"
      rel="noopener noreferrer"
      className="inline-block self-start bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 text-sm font-label px-4 py-2 rounded-lg hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors"
    >
      Open Contentful ↗
    </a>

    <SetupGuide>
      <p>
        1. Create a Contentful account and define content types matching your data schemas.<br />
        2. Migrate existing data via Contentful's import tool or API.<br />
        3. Add <code className="bg-stone-100 dark:bg-stone-800 px-1 rounded text-xs">REACT_APP_CONTENTFUL_SPACE</code> and{' '}
        <code className="bg-stone-100 dark:bg-stone-800 px-1 rounded text-xs">REACT_APP_CONTENTFUL_TOKEN</code> as Cloudflare Pages environment variables.<br />
        4. Update data imports in each page to fetch from the Contentful Delivery API.
      </p>
    </SetupGuide>
  </div>
);

const SanityCard = () => (
  <div className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 p-6 flex flex-col gap-4">
    <div className="flex items-start justify-between gap-3">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-red-50 dark:bg-red-950/30 flex items-center justify-center text-red-500 font-headline font-black text-lg">
          S
        </div>
        <div>
          <h3 className="font-label text-sm font-bold text-stone-900 dark:text-stone-100">Sanity</h3>
          <p className="text-xs text-stone-400">Structured Content · Real-time</p>
        </div>
      </div>
      <Badge label="External Service" variant="external" />
    </div>

    <p className="font-body text-sm text-stone-600 dark:text-stone-400">
      Powerful real-time CMS with a customizable Studio UI. Requires defining schemas for each data type and migrating existing content. Has a free tier.
    </p>

    <a
      href="https://sanity.io/manage"
      target="_blank"
      rel="noopener noreferrer"
      className="inline-block self-start bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 text-sm font-label px-4 py-2 rounded-lg hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors"
    >
      Open Sanity ↗
    </a>

    <SetupGuide>
      <p>
        1. Create a Sanity project and define schemas matching books, sports, treks, etc.<br />
        2. Add <code className="bg-stone-100 dark:bg-stone-800 px-1 rounded text-xs">REACT_APP_SANITY_PROJECT_ID</code> and{' '}
        <code className="bg-stone-100 dark:bg-stone-800 px-1 rounded text-xs">REACT_APP_SANITY_DATASET</code> to Cloudflare Pages environment variables.<br />
        3. Install <code className="bg-stone-100 dark:bg-stone-800 px-1 rounded text-xs">@sanity/client</code> and update data imports to query Sanity's GROQ API.
      </p>
    </SetupGuide>
  </div>
);

const CustomAPICard = ({ customApiEndpoint, setCustomApi }) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(customApiEndpoint ?? '');

  const handleSave = () => {
    setCustomApi(draft.trim() || null);
    setEditing(false);
  };

  return (
    <div className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 p-6 flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-stone-100 dark:bg-stone-800 flex items-center justify-center text-stone-500 font-headline font-black text-lg">
            ⚙
          </div>
          <div>
            <h3 className="font-label text-sm font-bold text-stone-900 dark:text-stone-100">Custom API</h3>
            <p className="text-xs text-stone-400">DIY · Bring your own backend</p>
          </div>
        </div>
        <Badge label="DIY" variant="diy" />
      </div>

      <p className="font-body text-sm text-stone-600 dark:text-stone-400">
        Point to any REST or GraphQL endpoint to fetch site data. Store the base URL here for testing — you'll need to update the data imports to use it.
      </p>

      {customApiEndpoint && !editing && (
        <div className="flex items-center gap-2 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg px-3 py-2">
          <span className="text-xs font-body text-stone-500 truncate flex-1">{customApiEndpoint}</span>
          <button type="button" onClick={() => setEditing(true)} className="text-xs text-secondary font-label hover:underline">Edit</button>
          <button type="button" onClick={() => { setCustomApi(null); setDraft(''); }} className="text-xs text-red-400 font-label hover:underline">Remove</button>
        </div>
      )}

      {(!customApiEndpoint || editing) && (
        <div className="flex flex-col gap-2">
          <TextInput
            value={draft}
            onChange={setDraft}
            placeholder="https://api.example.com/v1"
          />
          <div className="flex gap-2">
            <button type="button" onClick={handleSave}
              className="bg-secondary text-white text-xs font-label px-3 py-1.5 rounded-lg hover:bg-secondary/90 transition-colors">
              Save Endpoint
            </button>
            {editing && (
              <button type="button" onClick={() => setEditing(false)}
                className="text-xs font-label text-stone-400 hover:text-stone-600 transition-colors">
                Cancel
              </button>
            )}
          </div>
        </div>
      )}

      <SetupGuide>
        <p>
          Once you save an endpoint, update each data file import to fetch from{' '}
          <code className="bg-stone-100 dark:bg-stone-800 px-1 rounded text-xs">{customApiEndpoint || 'YOUR_ENDPOINT'}/books</code>, etc.<br />
          Use <code className="bg-stone-100 dark:bg-stone-800 px-1 rounded text-xs">localStorage.getItem('cms_api_endpoint')</code> at runtime to read the configured URL.
        </p>
      </SetupGuide>
    </div>
  );
};

const IntegrationsPanel = () => {
  const { decapConfigured, customApiEndpoint, setCustomApi } = useCMSStatus();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="font-headline text-2xl text-stone-900 dark:text-stone-100">Integrations</h2>
        <p className="font-body text-sm text-stone-500 dark:text-stone-400 mt-1">
          Connect a CMS provider to manage content. Decap CMS is recommended — it's free, open-source, and requires no external service.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <DecapCard decapConfigured={decapConfigured} />
        <ContentfulCard />
        <SanityCard />
        <CustomAPICard customApiEndpoint={customApiEndpoint} setCustomApi={setCustomApi} />
      </div>
    </div>
  );
};

export default IntegrationsPanel;
