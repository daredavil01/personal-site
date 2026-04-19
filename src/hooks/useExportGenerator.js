import { useState, useMemo } from 'react';

const useExportGenerator = ({ items, templateFn }) => {
  const [copied, setCopied] = useState(false);

  const exportCode = useMemo(() => {
    try {
      return templateFn(items);
    } catch {
      return '// Error generating export';
    }
  }, [items, templateFn]);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(exportCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for browsers without clipboard API
      const el = document.createElement('textarea');
      el.value = exportCode;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return { exportCode, copyToClipboard, copied };
};

export default useExportGenerator;
