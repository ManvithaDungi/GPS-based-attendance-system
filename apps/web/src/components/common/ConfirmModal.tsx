import React from 'react';
import { AlertTriangle, Check } from 'lucide-react';
import { NeumorphicCard } from './NeumorphicCard';

type Props = {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirming?: boolean;
  danger?: boolean;
  onConfirm: () => void;
  onClose: () => void;
};

export const ConfirmModal: React.FC<Props> = ({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  confirming = false,
  danger = false,
  onConfirm,
  onClose,
}) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop — plain dim overlay, no blur */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={confirming ? undefined : onClose}
      />

      {/* Modal card */}
      <div className="relative z-10 w-full max-w-sm mx-4">
        <NeumorphicCard className="p-8">

          {/* Icon + Title */}
          <div className="flex items-center gap-4 mb-4">
            <div
              className={[
                'w-12 h-12 rounded-xl flex items-center justify-center shrink-0',
                danger
                  ? 'bg-danger/10 text-danger'
                  : 'bg-primary/10 text-primary',
              ].join(' ')}
            >
              {danger
                ? <AlertTriangle className="w-5 h-5" />
                : <Check className="w-5 h-5" />
              }
            </div>
            <h3 className="text-xl font-black text-slate-800 dark:text-slate-100 font-headline">
              {title}
            </h3>
          </div>

          {/* Message */}
          <p className="text-sm text-slate-500 font-medium leading-relaxed pl-16">
            {message}
          </p>

          {/* Divider */}
          <div className="mt-6 mb-6 border-t border-slate-200 dark:border-slate-700" />

          {/* Actions */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={confirming}
              className="flex-1 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-sm font-bold hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 transition-colors"
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={confirming}
              className={[
                'flex-1 py-3 rounded-xl text-white text-sm font-bold disabled:opacity-50 transition-colors flex items-center justify-center gap-2',
                danger ? 'bg-danger hover:bg-danger/90' : 'bg-primary hover:bg-primary/90',
              ].join(' ')}
            >
              {confirming ? (
                <>
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Please wait…
                </>
              ) : confirmLabel}
            </button>
          </div>

        </NeumorphicCard>
      </div>
    </div>
  );
};