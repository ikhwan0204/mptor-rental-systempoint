import { useEffect, useRef, useState } from 'react';
import { api } from '../api';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

export default function GoogleSignInButton({ onSuccess, onError }) {
  const btnRef = useRef(null);
  const [scriptReady, setScriptReady] = useState(false);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return; // not configured, silently skip

    if (window.google?.accounts?.id) {
      setScriptReady(true);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => setScriptReady(true);
    document.body.appendChild(script);
  }, []);

  useEffect(() => {
    if (!scriptReady || !GOOGLE_CLIENT_ID || !btnRef.current) return;

    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: async (response) => {
        try {
          const data = await api.googleLogin(response.credential);
          onSuccess(data);
        } catch (err) {
          onError(err.message);
        }
      },
    });

    window.google.accounts.id.renderButton(btnRef.current, {
      theme: 'outline',
      size: 'large',
      width: 300,
      text: 'continue_with',
    });
  }, [scriptReady]);

  if (!GOOGLE_CLIENT_ID) {
    return null; // Google login not configured — hide button entirely
  }

  return <div ref={btnRef} className="google-btn-container" />;
}
