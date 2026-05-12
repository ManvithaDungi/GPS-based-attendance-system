import type {
  ReactNode as RN,
  FC as RFC,
  Key as RKey,
  MouseEventHandler as RMouseEventHandler,
  ChangeEvent as RChangeEvent,
  FormEvent as RFormEvent,
} from 'react';

declare global {
  namespace React {
    // Common aliases used across the codebase — map them to the module's exported types
    type ReactNode = RN;
    type FC<P = {}> = RFC<P>;
    type Key = RKey;
    type MouseEventHandler<T = Element> = RMouseEventHandler<T>;
    type ChangeEvent<T = Element> = RChangeEvent<T>;
    type FormEvent<T = Element> = RFormEvent<T>;
  }
}

export {};
