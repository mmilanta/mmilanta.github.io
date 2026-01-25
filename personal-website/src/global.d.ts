export {};

declare global {
  interface Window {
    MathJax?: {
      startup?: {
        promise?: Promise<void>;
      };
      typesetPromise?: (elements?: Element[]) => Promise<unknown>;
    };
  }
}


