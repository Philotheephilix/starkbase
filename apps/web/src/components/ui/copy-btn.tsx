import { useState, useEffect, useRef } from 'react';

export function CopyBtn({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => () => { clearTimeout(timerRef.current); }, []);
  const copy = () => {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setCopied(false), 1500);
    });
  };
  return (
    <button className={`copy-btn${copied ? ' ok' : ''}`} onClick={copy}>
      {copied ? 'copied' : 'copy'}
    </button>
  );
}
