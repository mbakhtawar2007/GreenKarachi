import { apiFetch } from './catalog';
import type { ReportTargetType } from './admin';

export type ReportReason = 'SPAM' | 'FRAUD' | 'INAPPROPRIATE' | 'INCORRECT_INFORMATION' | 'SAFETY' | 'OTHER';

export type ReportInput = {
  targetType: ReportTargetType;
  targetId: string;
  reason: ReportReason;
  details?: string;
};

export const reportReasons: Array<{ value: ReportReason; label: string }> = [
  { value: 'SPAM', label: 'Spam' },
  { value: 'FRAUD', label: 'Fraud or scam' },
  { value: 'INAPPROPRIATE', label: 'Inappropriate content' },
  { value: 'INCORRECT_INFORMATION', label: 'Incorrect information' },
  { value: 'SAFETY', label: 'Safety concern' },
  { value: 'OTHER', label: 'Other' }
];

export const submitReport = (token: string, input: ReportInput) =>
  apiFetch<{ report: { id: string; status: string } }>('/api/reports', token, {
    method: 'POST',
    body: JSON.stringify(input)
  });
