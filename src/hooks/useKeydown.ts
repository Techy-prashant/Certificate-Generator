import { useEffect } from 'react';

/**
 * Hook to listen for specific keyboard key presses
 */
export function useKeydown(
  targetKey: string,
  callback: (event: KeyboardEvent) => void,
  enabled: boolean = true
): void {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === targetKey) {
        callback(event);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [targetKey, callback, enabled]);
}
