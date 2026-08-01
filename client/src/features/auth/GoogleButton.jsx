import { useEffect } from 'react';

const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

export function GoogleButton({ onCredential }) {
  useEffect(() => {
    if (!clientId) return undefined;

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.onload = () => {
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: (response) => onCredential(response.credential),
      });
      window.google.accounts.id.renderButton(document.getElementById('g_id_onload'), {
        theme: 'outline',
        size: 'large',
        shape: 'pill',
        text: 'signin_with',
      });
    };
    document.body.appendChild(script);

    return () => document.body.removeChild(script);
  }, [onCredential]);

  return clientId ? <div id="g_id_onload" /> : null;
}
