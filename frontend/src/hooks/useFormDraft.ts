import { useState, useEffect } from 'react';

export function useFormDraft(draftKey: string, initialValue: string = '') {
  const [value, setValue] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(`draft_${draftKey}`);
      return saved !== null ? saved : initialValue;
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      if (value && value.trim()) {
        localStorage.setItem(`draft_${draftKey}`, value);
      } else {
        localStorage.removeItem(`draft_${draftKey}`);
      }
    } catch {
      // Ignore storage errors
    }
  }, [draftKey, value]);

  const clearDraft = () => {
    setValue('');
    try {
      localStorage.removeItem(`draft_${draftKey}`);
    } catch {}
  };

  return [value, setValue, clearDraft] as const;
}
