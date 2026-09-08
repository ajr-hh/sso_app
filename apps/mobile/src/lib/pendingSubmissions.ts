export type PendingSubmissions = {
  claim: (key: string) => boolean;
  release: (key: string) => void;
  isPending: (key: string) => boolean;
};

// Guards immediate-persistence screens where a submit button and the keyboard
// Return key share one handler, so a double-tap cannot enqueue the same text twice.
export function createPendingSubmissions(): PendingSubmissions {
  const pending = new Set<string>();

  return {
    claim(key) {
      if (pending.has(key)) {
        return false;
      }

      pending.add(key);
      return true;
    },
    release(key) {
      pending.delete(key);
    },
    isPending(key) {
      return pending.has(key);
    },
  };
}
