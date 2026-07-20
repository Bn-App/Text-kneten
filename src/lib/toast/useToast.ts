import { useCallback, useRef, useState } from 'react';

const DISPLAY_DURATION_MS = 2600;

export function useToast(): [string | null, (message: string) => void] {
  const [message, setMessage] = useState<string | null>(null);
  const timeoutRef = useRef<number | undefined>(undefined);

  const show = useCallback((msg: string) => {
    window.clearTimeout(timeoutRef.current);
    setMessage(msg);
    timeoutRef.current = window.setTimeout(() => setMessage(null), DISPLAY_DURATION_MS);
  }, []);

  return [message, show];
}
