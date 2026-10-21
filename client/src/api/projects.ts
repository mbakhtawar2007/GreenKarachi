import { apiFetch } from './catalog';

export type ProjectStatus = 'DRAFT' | 'PUBLISHED' | 'COMPLETED' | 'ARCHIVED';
export type PledgeType = 'FUNDS' | 'TREES' | 'MATERIALS' | 'VOLUNTEER_TIME' | 'OTHER';
export type PledgeStatus = 'PLEDGED' | 'CONFIRMED' | 'WITHDRAWN' | 'DECLINED';
export type ContactPreference = 'PLATFORM_ONLY' | 'EMAIL' | 'PHONE' | 'EMAIL_AND_PHONE';

export type ProjectRequirement = {
  id?: string;
  project_id?: string;
  plant_name: string;
  species: string | null;
  quantity: number;
  notes: string | null;
};

export type ProgressUpdate = {
  id: string;
  project_id: string;
  title: string;
  body: string;
  trees_planted: number | null;
  photo_urls: string[];
  created_at: string;
};

export type Pledge = {
  id: string;
  project_id: string;
  supporter_user_id: string;
  pledge_type: PledgeType;
  // Intended amount/quantity only. A pledge is not a payment, and an
  // amount here is never money GreenKarachi has received.
  amount: string | number | null;
  quantity: number | null;
  description: string | null;
  status: PledgeStatus;
  created_at: string;
  project?: {
    title?: string;
    location?: string;
    status?: ProjectStatus;
    tree_target?: number;
    funding_target?: string | number | null;
  } | null;
};

// Intended support totals only. funds_received is always 0 because there
// is no verified receipt process in the MVP.
export type PledgeSummary = {
  pledge_count: number;
  active_count: number;
  withdrawn_count: number;
  declined_count: number;
  intended_funds_total: number;
  intended_trees_total: number;
  funds_received: 0;
};

export type PlantationProject = {
  id: string;
  organizer_user_id: string;
  title: string;
  description: string;
  location: string;
  start_date: string;
  end_date: string;
  tree_target: number;
  funding_target: string | number | null;
  photo_urls: string[];
  contact_preference: ContactPreference;
  contact_details: string | null;
  status: ProjectStatus;
  created_at: string;
  requirements?: ProjectRequirement[];
  progress_updates?: ProgressUpdate[];
  trees_planted?: number;
  progress_percent?: number;
  pledge_summary?: PledgeSummary;
  pledges?: Pledge[];
};

export type ProjectRequirementInput = {
  plantName: string;
  species: string;
  quantity: number;
  notes: string;
};

export type ProjectInput = {
  title: string;
  description: string;
  location: string;
  startDate: string;
  endDate: string;
  treeTarget: number;
  fundingTarget: number | null;
  photoUrls: string[];
  contactPreference: ContactPreference;
  contactDetails: string;
  requirements: ProjectRequirementInput[];
};

export type ProgressUpdateInput = {
  title: string;
  body: string;
  treesPlanted: number | null;
  photoUrls: string[];
};

export type PledgeInput = {
  pledgeType: PledgeType;
  amount: number | null;
  quantity: number | null;
  description: string;
};

export type ProjectFilters = {
  query?: string;
  location?: string;
  species?: string;
  status?: 'PUBLISHED' | 'COMPLETED';
  minTreeTarget?: number;
  maxTreeTarget?: number;
  page?: number;
  pageSize?: number;
};

const filterQuery = (filters: ProjectFilters) => {
  const params = new URLSearchParams();
  if (filters.query) params.set('query', filters.query);
  if (filters.location) params.set('location', filters.location);
  if (filters.species) params.set('species', filters.species);
  if (filters.status) params.set('status', filters.status);
  if (filters.minTreeTarget !== undefined) params.set('minTreeTarget', String(filters.minTreeTarget));
  if (filters.maxTreeTarget !== undefined) params.set('maxTreeTarget', String(filters.maxTreeTarget));
  if (filters.page) params.set('page', String(filters.page));
  if (filters.pageSize) params.set('pageSize', String(filters.pageSize));
  const query = params.toString();
  return query ? `?${query}` : '';
};

export const discoverProjects = (filters: ProjectFilters = {}, token?: string) =>
  apiFetch<{ projects: PlantationProject[]; pagination: { page: number; pageSize: number; total: number; totalPages: number } }>(
    `/api/projects${filterQuery(filters)}`, token
  );

export const getProject = (projectId: string, token?: string) =>
  apiFetch<{ project: PlantationProject }>(`/api/projects/${projectId}`, token);

export const createProject = (token: string, input: ProjectInput) =>
  apiFetch<{ project: PlantationProject }>('/api/projects', token, {
    method: 'POST',
    body: JSON.stringify(input)
  });

export const updateProject = (token: string, projectId: string, input: ProjectInput) =>
  apiFetch<{ project: PlantationProject }>(`/api/projects/${projectId}`, token, {
    method: 'PATCH',
    body: JSON.stringify(input)
  });

export const getMyProjects = (token: string) =>
  apiFetch<{ projects: PlantationProject[] }>('/api/projects/mine/list', token);

export const changeProjectStatus = (token: string, projectId: string, status: 'PUBLISHED' | 'COMPLETED' | 'ARCHIVED') =>
  apiFetch<{ project: PlantationProject }>(`/api/projects/${projectId}/status`, token, {
    method: 'PATCH',
    body: JSON.stringify({ status })
  });

export const addProgressUpdate = (token: string, projectId: string, input: ProgressUpdateInput) =>
  apiFetch<{ progressUpdate: ProgressUpdate }>(`/api/projects/${projectId}/progress`, token, {
    method: 'POST',
    body: JSON.stringify(input)
  });

export const submitPledge = (token: string, projectId: string, input: PledgeInput) =>
  apiFetch<{ pledge: Pledge }>(`/api/projects/${projectId}/pledges`, token, {
    method: 'POST',
    body: JSON.stringify(input)
  });

export const getMyPledges = (token: string) =>
  apiFetch<{ pledges: Pledge[] }>('/api/projects/pledges/mine', token);

export const withdrawPledge = (token: string, pledgeId: string) =>
  apiFetch<{ pledge: Pledge; project: PlantationProject }>(`/api/projects/pledges/${pledgeId}/withdraw`, token, { method: 'POST' });

export const confirmPledge = (token: string, pledgeId: string) =>
  apiFetch<{ pledge: Pledge; project: PlantationProject }>(`/api/projects/pledges/${pledgeId}/confirm`, token, { method: 'POST' });

export const declinePledge = (token: string, pledgeId: string) =>
  apiFetch<{ pledge: Pledge; project: PlantationProject }>(`/api/projects/pledges/${pledgeId}/decline`, token, { method: 'POST' });
