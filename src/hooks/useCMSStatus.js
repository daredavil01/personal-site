import { useState, useEffect } from 'react';

const useCMSStatus = () => {
  const [decapConfigured, setDecapConfigured] = useState(false);
  const [customApiEndpoint, setCustomApiEndpoint] = useState(
    () => localStorage.getItem('cms_api_endpoint') || null
  );

  useEffect(() => {
    fetch('/cms/config.yml', { method: 'HEAD' })
      .then((r) => setDecapConfigured(r.ok))
      .catch(() => setDecapConfigured(false));
  }, []);

  const setCustomApi = (url) => {
    if (url) {
      localStorage.setItem('cms_api_endpoint', url);
    } else {
      localStorage.removeItem('cms_api_endpoint');
    }
    setCustomApiEndpoint(url || null);
  };

  return { decapConfigured, customApiEndpoint, setCustomApi };
};

export default useCMSStatus;
