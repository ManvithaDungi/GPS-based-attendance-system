// Minimal shims to help the editor/TypeScript server resolve untyped modules
// and to provide a fallback JSX IntrinsicElements interface when @types/react
// aren't installed in the workspace. These are temporary developer shims.

declare module 'react';
declare module 'react/jsx-runtime';
declare module 'lucide-react';
declare module '../lib/api';
declare module '../lib/utils';
declare module '../components/common/NeumorphicCard';

// Allow JSX elements when full React types are not present in the editor.
declare namespace JSX {
  interface IntrinsicElements {
    [elemName: string]: any;
  }
}
