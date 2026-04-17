import React, { useState } from 'react';
import useExportGenerator from '../../hooks/useExportGenerator';

const ExportPanel = ({ items, templateFn, fileName }) => {
  const { exportCode, copyToClipboard, copied } = useExportGenerator({ items, templateFn });
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border border-stone-200 dark:border-stone-700 rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4 bg-stone-50 dark:bg-stone-900 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
      >
        <span className="font-label text-xs uppercase tracking-widest text-stone-600 dark:text-stone-400">
          Export JS — {fileName}
        </span>
        <span className="text-stone-400 text-sm">{expanded ? '▲' : '▼'}</span>
      </button>

      {expanded && (
        <div className="bg-stone-950 dark:bg-stone-950">
          <div className="flex items-center justify-between px-5 py-3 border-b border-stone-800">
            <span className="text-xs text-stone-400 font-body">
              Copy and paste this into <code className="text-secondary">{fileName}</code>, then
              commit &amp; push to redeploy.
            </span>
            <button
              type="button"
              onClick={copyToClipboard}
              className={`text-xs font-label px-3 py-1 rounded transition-colors ${
                copied
                  ? 'bg-green-500/20 text-green-400'
                  : 'bg-secondary/20 text-secondary hover:bg-secondary/30'
              }`}
            >
              {copied ? 'Copied!' : 'Copy to Clipboard'}
            </button>
          </div>
          <pre className="overflow-auto p-5 text-xs text-stone-300 font-mono max-h-96">
            <code>{exportCode}</code>
          </pre>
        </div>
      )}
    </div>
  );
};

export default ExportPanel;
