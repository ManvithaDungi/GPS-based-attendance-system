import React, { useState } from 'react';
import { NeumorphicCard } from '../components/common/NeumorphicCard';
import { cn } from '../lib/utils';
import { RefreshCw, Mail, Check, X } from 'lucide-react';
import api from '../lib/api';

type FormState = {
  name: string;
  email: string;
  subject: string;
  description: string;
};

export const HelpCenter = () => {
  const [form, setForm] = useState<FormState>({ name: '', email: '', subject: '', description: '' });
  const [errors, setErrors] = useState<Partial<FormState>>({});
  const [submitting, setSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const validate = (): boolean => {
    const next: Partial<FormState> = {};
    if (!form.name.trim()) next.name = 'Full name is required';
    if (!form.email.trim()) next.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) next.email = 'Invalid email address';
    if (!form.subject.trim()) next.subject = 'Subject is required';
    if (!form.description.trim()) next.description = 'Description is required';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleChange = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [k]: e.target.value });
    setErrors({ ...errors, [k]: undefined });
    setStatusMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    setStatusMessage(null);

    try {
      const res = await api.post('/support/report-issue', form);
      setStatusMessage({ type: 'success', text: res.data?.message || 'Report submitted — thank you! We will follow up via email.' });
      setForm({ name: '', email: '', subject: '', description: '' });
    } catch (err: any) {
      console.error('Report submission error', err);
      const remoteMsg = err?.response?.data?.message;
      const status = err?.response?.status;
      if (status === 401) {
        setStatusMessage({ type: 'error', text: 'Unauthorized — please log in and try again.' });
      } else if (remoteMsg) {
        setStatusMessage({ type: 'error', text: remoteMsg });
      } else {
        setStatusMessage({ type: 'error', text: err?.message || 'An error occurred while submitting your report.' });
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      <div>
        <h2 className="text-3xl font-black text-slate-800 dark:text-slate-100 font-headline tracking-tight">
          Help Center
        </h2>
        <p className="text-slate-500 mt-1">Find guides, FAQs and troubleshooting steps for using InDaZone.</p>
      </div>

      {/* SECTION 1 — Welcome message */}
      <NeumorphicCard className="p-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">Hello</h3>
            <p className="text-slate-600 dark:text-slate-300 mt-2">
              Quick steps to get started:
            </p>
            <ul className="list-disc ml-5 mt-2 text-slate-600 dark:text-slate-300 text-sm space-y-1">
              <li>Register students on the Students page (Admin → Students).</li>
              <li>Ask students to mark attendance using the mobile app.</li>
              <li>Verify and review attendance records on the Dashboard.</li>
            </ul>
            <p className="text-slate-600 dark:text-slate-300 mt-3">
              Thank you for using InDaZone. We're constantly improving the platform to provide a better
              attendance and geofencing experience. If you encounter any bugs, technical issues, or unexpected
              behavior, please report them using the form below.
            </p>
            <p className="text-slate-500 dark:text-slate-400 mt-3 font-medium">We appreciate your feedback and support.</p>
          </div>
        </div>
      </NeumorphicCard>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* SECTION 2 — Report Issue form (left) */}
        <NeumorphicCard className="lg:col-span-2 p-8">
          <h4 className="text-xl font-bold text-slate-800 dark:text-slate-100 font-headline mb-4">Report an Issue</h4>

          {statusMessage && (
            <div
              className={cn(
                'mb-4 p-3 rounded-lg flex items-start gap-3',
                statusMessage.type === 'success'
                  ? 'bg-success/10 text-success neumorphic-inset'
                  : 'bg-danger/10 text-danger neumorphic-inset'
              )}
              role="status"
            >
              {statusMessage.type === 'success' ? <Check className="w-5 h-5" /> : <X className="w-5 h-5" />}
              <div className="text-sm">{statusMessage.text}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="flex flex-col">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">Full Name</span>
                <input
                  aria-label="Full name"
                  value={form.name}
                  onChange={handleChange('name')}
                  className={cn(
                    'w-full rounded-xl py-2 px-3 bg-surface-light dark:bg-surface-dark neumorphic-inset focus:outline-none focus:ring-2 focus:ring-primary',
                    errors.name ? 'ring-danger/60' : ''
                  )}
                />
                {errors.name && <span className="text-xs text-danger mt-1">{errors.name}</span>}
              </label>

              <label className="flex flex-col">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">Email Address</span>
                <input
                  aria-label="Email address"
                  type="email"
                  value={form.email}
                  onChange={handleChange('email')}
                  className={cn(
                    'w-full rounded-xl py-2 px-3 bg-surface-light dark:bg-surface-dark neumorphic-inset focus:outline-none focus:ring-2 focus:ring-primary',
                    errors.email ? 'ring-danger/60' : ''
                  )}
                />
                {errors.email && <span className="text-xs text-danger mt-1">{errors.email}</span>}
              </label>
            </div>

            <label className="flex flex-col">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">Issue Subject</span>
              <input
                aria-label="Issue subject"
                value={form.subject}
                onChange={handleChange('subject')}
                className={cn(
                  'w-full rounded-xl py-2 px-3 bg-surface-light dark:bg-surface-dark neumorphic-inset focus:outline-none focus:ring-2 focus:ring-primary',
                  errors.subject ? 'ring-danger/60' : ''
                )}
              />
              {errors.subject && <span className="text-xs text-danger mt-1">{errors.subject}</span>}
            </label>

            <label className="flex flex-col">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">Issue Description</span>
              <textarea
                aria-label="Issue description"
                value={form.description}
                onChange={handleChange('description')}
                rows={6}
                className={cn(
                  'w-full rounded-xl py-2 px-3 bg-surface-light dark:bg-surface-dark neumorphic-inset focus:outline-none focus:ring-2 focus:ring-primary',
                  errors.description ? 'ring-danger/60' : ''
                )}
              />
              {errors.description && <span className="text-xs text-danger mt-1">{errors.description}</span>}
            </label>

            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={submitting}
                className={cn(
                  'px-4 py-2 rounded-xl neumorphic-raised flex items-center gap-2 transition-all',
                  submitting ? 'opacity-60 cursor-not-allowed' : 'hover:translate-y-[-2px]'
                )}
              >
                {submitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                <span className="font-medium">Report Issue</span>
              </button>
              <button
                type="button"
                onClick={() => setForm({ name: '', email: '', subject: '', description: '' })}
                className="px-4 py-2 rounded-xl neumorphic-raised bg-surface-light dark:bg-surface-dark hover:neumorphic-inset transition-all"
              >
                Clear
              </button>
            </div>
          </form>
        </NeumorphicCard>

        {/* Existing Help Center content preserved (right column) */}
        <NeumorphicCard className="p-8">
          <h4 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-3">Frequently Asked Questions</h4>
          <div className="space-y-3 text-slate-600">
            <div>
              <p className="font-medium">How do I reset a student's attendance?</p>
              <p className="text-sm">Open the Attendance detail for that student and use the edit options to correct the record.</p>
            </div>
            <div>
              <p className="font-medium">Why is a location not appearing?</p>
              <p className="text-sm">Ensure the premises is active and that coordinates were saved when creating the location.</p>
            </div>
          </div>
        </NeumorphicCard>
      </div>
    </div>
  );
};

export default HelpCenter;
