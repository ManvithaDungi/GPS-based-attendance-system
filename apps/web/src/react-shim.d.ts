// Minimal React type shims to satisfy codebase references while
// the proper @types/react resolution is fixed.
// These use broad `any` types to avoid requiring code changes.
declare module 'react' {
  // Basic types used across the project
  export type ReactNode = any;
  export type FC<P = {}> = (props: P & { children?: ReactNode }) => any;
  export type Key = string | number;
  export type MouseEventHandler<T = Element> = (e: any) => void;
  export type ChangeEvent<T = Element> = any;
  export type FormEvent<T = Element> = any;

  // Hooks (minimal signatures)
  export function useState<S = any>(initialState?: S | (() => S)):
    [S, (value: S | ((prev: S) => S)) => void];
  export function useEffect(effect: () => void | (() => void), deps?: any[]): void;
  export function useRef<T = any>(initialValue?: T | null): { current: T | null };

  // JSX runtime helper (no-op here)
  export const Fragment: any;

  // Allow default import compatibility
  const React: {
    useState: typeof useState;
    useEffect: typeof useEffect;
    useRef: typeof useRef;
    Fragment: any;
  };
  export default React;
}

export {};
