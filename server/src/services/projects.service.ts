import { z } from 'zod';
import { getSupabaseClient } from '../lib/auth';
import {
  createNotification,
  pledgeReceivedNotification,
  pledgeStatusNotification
} from './notifications.service';

// Phase 6 domain rules.
// Plantation organizers publish projects with plant requirements, a
// timeline, an optional funding target, photos, and progress updates.
// Authenticated users (donors, investors, businesses, and other relevant
// roles) register support interest or pledges against a published project.
//
// A pledge is an intention or commitment recorded for coordination only.
// It is NOT a payment, and it is never proof that money has been received:
// this service has no payment gateway, no receipt process, and no field
// anywhere that records funds as received. Pledge summaries therefore
// report intended support only, with funds_received fixed at 0.

export const projectStatuses = ['DRAFT', 'PUBLISHED', 'COMPLETED', 'ARCHIVED'] as const;
export const pledgeTypes = ['FUNDS', 'TREES', 'MATERIALS', 'VOLUNTEER_TIME', 'OTHER'] as const;
export const pledgeStatuses = ['PLEDGED', 'CONFIRMED', 'WITHDRAWN', 'DECLINED'] as const;
export const contactPreferences = ['PLATFORM_ONLY', 'EMAIL', 'PHONE', 'EMAIL_AND_PHONE'] as const;

export type ProjectStatus = (typeof projectStatuses)[number];
export type PledgeType = (typeof pledgeTypes)[number];
export type PledgeStatus = (typeof pledgeStatuses)[number];
export type ContactPreference = (typeof contactPreferences)[number];

// Roles that may submit support interest / pledges. The organizer role is
// included because organizers may support other organizers' projects; a
// project's own organizer is still blocked from pledging to it below.
export const pledgeEligibleRoles = ['BUYER', 'NURSERY_OWNER', 'PLANTATION_ORGANIZER', 'DONOR_INVESTOR', 'ADMIN'] as const;

const positiveMoney = z.number().finite().positive().max(9999999999.99)
  .refine((value) => Math.abs(value * 100 - Math.round(value * 100)) < 0.0000001, 'Amounts can have at most two decimal places.');

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must use YYYY-MM-DD format.')
  .refine((value) => !Number.isNaN(Date.parse(value)), 'Date must be a valid date.');

const imageUrlSchema = z.string().trim().url().max(2048).refine((value) => {
  try {
    const protocol = new URL(value).protocol;
    return protocol === 'https:' || protocol === 'http:';
  } catch {
    return false;
  }
}, 'Image URLs must use HTTP or HTTPS.');

export const projectRequirementInputSchema = z.object({
  plantName: z.string().trim().min(1).max(120),
  species: z.string().trim().max(120).optional().or(z.literal('')),
  quantity: z.number().int().positive().max(100000000),
  notes: z.string().trim().max(500).optional().or(z.literal(''))
});

export const projectInputSchema = z.object({
  title: z.string().trim().min(1).max(160),
  description: z.string().trim().min(1).max(4000),
  location: z.string().trim().min(1).max(160),
  startDate: dateSchema,
  endDate: dateSchema,
  treeTarget: z.number().int().positive().max(100000000),
  fundingTarget: positiveMoney.optional().nullable(),
  photoUrls: z.array(imageUrlSchema).max(8).default([]),
  contactPreference: z.enum(contactPreferences).default('PLATFORM_ONLY'),
  contactDetails: z.string().trim().max(300).optional().or(z.literal('')),
  requirements: z.array(projectRequirementInputSchema).min(1, 'A project needs at least one plant requirement.').max(50)
}).superRefine((input, ctx) => {
  if (input.endDate < input.startDate) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['endDate'], message: 'End date cannot be before the start date.' });
  }
  const total = input.requirements.reduce((sum, requirement) => sum + requirement.quantity, 0);
  if (total > input.treeTarget) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['requirements'],
      message: 'Plant requirement quantities cannot add up to more than the tree target.'
    });
  }
  if (input.contactPreference !== 'PLATFORM_ONLY' && !(input.contactDetails ?? '').trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['contactDetails'],
      message: 'Contact details are required when the contact preference is not platform-only.'
    });
  }
});

export const projectStatusInputSchema = z.object({
  status: z.enum(['PUBLISHED', 'COMPLETED', 'ARCHIVED'])
});

export const progressUpdateInputSchema = z.object({
  title: z.string().trim().min(1).max(160),
  body: z.string().trim().min(1).max(4000),
  treesPlanted: z.number().int().min(0).max(100000000).optional().nullable(),
  photoUrls: z.array(imageUrlSchema).max(8).default([])
});

export const pledgeInputSchema = z.object({
  pledgeType: z.enum(pledgeTypes),
  amount: positiveMoney.optional().nullable(),
  quantity: z.number().int().positive().max(100000000).optional().nullable(),
  description: z.string().trim().max(2000).optional().or(z.literal(''))
}).superRefine((input, ctx) => {
  if (input.pledgeType === 'FUNDS') {
    if (input.amount === undefined || input.amount === null) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['amount'], message: 'A funds pledge needs an intended amount.' });
    }
    if (input.quantity !== undefined && input.quantity !== null) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['quantity'], message: 'A funds pledge cannot also set a quantity.' });
    }
  }
  if (input.pledgeType === 'TREES' || input.pledgeType === 'MATERIALS') {
    if (input.quantity === undefined || input.quantity === null) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['quantity'], message: 'This pledge type needs an intended quantity.' });
    }
    if (input.amount !== undefined && input.amount !== null) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['amount'], message: 'Only a funds pledge can set an amount.' });
    }
  }
  if (input.pledgeType === 'VOLUNTEER_TIME' || input.pledgeType === 'OTHER') {
    if (!(input.description ?? '').trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['description'], message: 'This pledge type needs a short description of the intended support.' });
    }
  }
});

export const projectFilterSchema = z.object({
  query: z.string().trim().max(120).optional(),
  location: z.string().trim().max(120).optional(),
  species: z.string().trim().max(120).optional(),
  status: z.enum(['PUBLISHED', 'COMPLETED']).default('PUBLISHED'),
  minTreeTarget: z.coerce.number().int().min(0).optional(),
  maxTreeTarget: z.coerce.number().int().min(0).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(12)
}).refine((filters) => filters.minTreeTarget === undefined || filters.maxTreeTarget === undefined || filters.minTreeTarget <= filters.maxTreeTarget, {
  message: 'Minimum tree target must not exceed maximum tree target.'
});

export type ProjectRequirementInput = z.infer<typeof projectRequirementInputSchema>;
export type ProjectInput = z.infer<typeof projectInputSchema>;
export type ProgressUpdateInput = z.infer<typeof progressUpdateInputSchema>;
export type PledgeInput = z.infer<typeof pledgeInputSchema>;
export type ProjectFilters = z.infer<typeof projectFilterSchema>;

// ---------------------------------------------------------------------------
// Pure business rules (unit tested without a database)
// ---------------------------------------------------------------------------

export const requirementsTotal = (requirements: Array<{ quantity: number }>): number =>
  requirements.reduce((sum, requirement) => sum + requirement.quantity, 0);

// Plant requirements describe how the tree target is broken down by
// species, so their quantities may not add up to more than the target.
export const requirementsFitTarget = (treeTarget: number, requirements: Array<{ quantity: number }>): boolean =>
  requirements.length >= 1 && requirementsTotal(requirements) <= treeTarget;

export const projectTransitions: Record<ProjectStatus, ProjectStatus[]> = {
  DRAFT: ['PUBLISHED', 'ARCHIVED'],
  PUBLISHED: ['COMPLETED', 'ARCHIVED'],
  COMPLETED: ['ARCHIVED'],
  ARCHIVED: []
};

export const canTransitionProject = (from: ProjectStatus, to: ProjectStatus): boolean =>
  projectTransitions[from]?.includes(to) ?? false;

// Pledge transitions depend on who is acting. A supporter may withdraw
// their own live pledge; only the project's organizer may confirm or
// decline a pledged intention. Nothing here can move a pledge into a
// "paid" or "received" state, because no such state exists.
export const pledgeTransitionsForSupporter: Record<PledgeStatus, PledgeStatus[]> = {
  PLEDGED: ['WITHDRAWN'],
  CONFIRMED: ['WITHDRAWN'],
  WITHDRAWN: [],
  DECLINED: []
};

export const pledgeTransitionsForOrganizer: Record<PledgeStatus, PledgeStatus[]> = {
  PLEDGED: ['CONFIRMED', 'DECLINED'],
  CONFIRMED: [],
  WITHDRAWN: [],
  DECLINED: []
};

export const canSupporterTransitionPledge = (from: PledgeStatus, to: PledgeStatus): boolean =>
  pledgeTransitionsForSupporter[from]?.includes(to) ?? false;

export const canOrganizerTransitionPledge = (from: PledgeStatus, to: PledgeStatus): boolean =>
  pledgeTransitionsForOrganizer[from]?.includes(to) ?? false;

export type PledgeSummary = {
  pledge_count: number;
  active_count: number;
  withdrawn_count: number;
  declined_count: number;
  // Intended support only. These totals describe what supporters have
  // said they intend to contribute, NOT money or plants received.
  intended_funds_total: number;
  intended_trees_total: number;
  // No verified receipt process exists in the MVP, so funds received is
  // always 0 and must never be presented as anything else.
  funds_received: 0;
};

type PledgeLike = {
  pledge_type: PledgeType | string;
  status: PledgeStatus | string;
  amount?: string | number | null;
  quantity?: number | null;
};

// Accurate pledge accounting: only live pledges (PLEDGED or CONFIRMED)
// count toward intended totals. Withdrawn and declined pledges count
// toward nothing but their own tallies.
export const summarizePledges = (pledges: PledgeLike[]): PledgeSummary => {
  const live = pledges.filter((pledge) => pledge.status === 'PLEDGED' || pledge.status === 'CONFIRMED');
  return {
    pledge_count: pledges.length,
    active_count: live.length,
    withdrawn_count: pledges.filter((pledge) => pledge.status === 'WITHDRAWN').length,
    declined_count: pledges.filter((pledge) => pledge.status === 'DECLINED').length,
    intended_funds_total: live
      .filter((pledge) => pledge.pledge_type === 'FUNDS')
      .reduce((sum, pledge) => sum + Number(pledge.amount ?? 0), 0),
    intended_trees_total: live
      .filter((pledge) => pledge.pledge_type === 'TREES')
      .reduce((sum, pledge) => sum + (pledge.quantity ?? 0), 0),
    funds_received: 0
  };
};

export const isLivePledge = (pledge: { status: PledgeStatus | string }): boolean =>
  pledge.status === 'PLEDGED' || pledge.status === 'CONFIRMED';

export const findLivePledge = <T extends { supporter_user_id: string; pledge_type: string; status: string }>(
  pledges: T[],
  supporterUserId: string,
  pledgeType: PledgeType
): T | undefined => pledges.find(
  (pledge) => pledge.supporter_user_id === supporterUserId
    && pledge.pledge_type === pledgeType
    && isLivePledge(pledge)
);

export const isOrganizer = (
  project: { organizer_user_id: string },
  userId: string
): boolean => project.organizer_user_id === userId;

export const isPledgeSupporter = (
  pledge: { supporter_user_id: string },
  userId: string
): boolean => pledge.supporter_user_id === userId;

// A project's own organizer coordinates support; they do not pledge to
// their own project.
export const canPledgeToProject = (
  project: { organizer_user_id: string; status: ProjectStatus | string },
  userId: string
): boolean => project.organizer_user_id !== userId && project.status === 'PUBLISHED';

// Published and completed projects are discoverable by anyone. Draft and
// archived projects are visible only to their organizer, and to users who
// already hold a pledge on the project (so they can still see the record
// their pledge belongs to).
export const canViewProject = (
  project: { organizer_user_id: string; status: ProjectStatus | string; moderation_status?: string | null },
  viewerUserId: string | null,
  viewerHasPledge = false
): boolean => {
  // Phase 7 moderation: an admin-hidden project is visible only to its
  // organizer (admins use the admin API). Rows from before Phase 7 have
  // no moderation_status in memory, which means VISIBLE.
  if ((project.moderation_status ?? 'VISIBLE') === 'HIDDEN') {
    return Boolean(viewerUserId && isOrganizer(project, viewerUserId));
  }
  if (project.status === 'PUBLISHED' || project.status === 'COMPLETED') return true;
  if (viewerUserId && isOrganizer(project, viewerUserId)) return true;
  return viewerHasPledge;
};

export const progressPercent = (treesPlanted: number, treeTarget: number): number => {
  if (treeTarget <= 0) return 0;
  return Math.min(100, Math.round((Math.max(0, treesPlanted) / treeTarget) * 100));
};

// The latest reported cumulative trees-planted figure across progress
// updates (updates arrive newest-first from the database helper below,
// but taking the max keeps this correct for any ordering).
export const latestTreesPlanted = (updates: Array<{ trees_planted?: number | null }>): number =>
  updates.reduce((max, update) => Math.max(max, update.trees_planted ?? 0), 0);

// Contact details are the organizer's private contact channel. They are
// exposed only when the organizer chose a non-platform contact preference;
// with PLATFORM_ONLY they are stripped for everyone but the organizer.
export const sanitizeProjectForViewer = <T extends {
  organizer_user_id: string;
  contact_preference: string;
  contact_details?: string | null;
}>(project: T, viewerUserId: string | null): T => {
  if (viewerUserId && isOrganizer(project, viewerUserId)) return project;
  if (project.contact_preference !== 'PLATFORM_ONLY') return project;
  return { ...project, contact_details: null };
};

// ---------------------------------------------------------------------------
// Database operations (Supabase, following the catalog/collaboration pattern)
// ---------------------------------------------------------------------------

type SupabaseClient = ReturnType<typeof getSupabaseClient>;

const escapeSearchValue = (value: string) => value.replace(/[\\%_*,.()]/g, '\\$&');

const getProject = async (supabase: SupabaseClient, projectId: string) => {
  const { data, error } = await supabase
    .from('plantation_projects')
    .select('*')
    .eq('id', projectId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error('Plantation project not found.');
  return data;
};

const getRequirements = async (supabase: SupabaseClient, projectId: string) => {
  const { data, error } = await supabase
    .from('project_requirements')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
};

const getProgressUpdates = async (supabase: SupabaseClient, projectId: string) => {
  const { data, error } = await supabase
    .from('project_progress_updates')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
};

const getPledgesForProject = async (supabase: SupabaseClient, projectId: string) => {
  const { data, error } = await supabase
    .from('project_pledges')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
};

const recordPledgeEvent = async (
  supabase: SupabaseClient,
  pledge: { id: string; project_id: string },
  actorUserId: string,
  fromStatus: PledgeStatus | null,
  toStatus: PledgeStatus
) => {
  const { error } = await supabase
    .from('project_pledge_events')
    .insert({
      pledge_id: pledge.id,
      project_id: pledge.project_id,
      actor_user_id: actorUserId,
      from_status: fromStatus,
      to_status: toStatus
    });
  if (error) throw new Error(error.message);
};

// Attaches requirements, progress updates, and the pledge summary to a
// project. The full pledge list is attached only for participants who are
// allowed to see it (the organizer sees every pledge on their project; a
// supporter sees only their own). Everyone else gets counts and intended
// totals only, never other supporters' private records.
const enrichProject = async (
  supabase: SupabaseClient,
  project: Record<string, unknown> & {
    id: string;
    organizer_user_id: string;
    tree_target: number;
    contact_preference: string;
    contact_details?: string | null;
  },
  viewerUserId: string | null
) => {
  const [requirements, updates, pledges] = await Promise.all([
    getRequirements(supabase, project.id),
    getProgressUpdates(supabase, project.id),
    getPledgesForProject(supabase, project.id)
  ]);
  const treesPlanted = latestTreesPlanted(updates);
  const visiblePledges = viewerUserId && isOrganizer(project, viewerUserId)
    ? pledges
    : pledges.filter((pledge) => pledge.supporter_user_id === viewerUserId);
  return {
    ...sanitizeProjectForViewer(project, viewerUserId),
    requirements,
    progress_updates: updates,
    trees_planted: treesPlanted,
    progress_percent: progressPercent(treesPlanted, project.tree_target),
    pledge_summary: summarizePledges(pledges as PledgeLike[]),
    pledges: visiblePledges
  };
};

const insertRequirements = async (
  supabase: SupabaseClient,
  projectId: string,
  requirements: ProjectRequirementInput[]
) => {
  const { error } = await supabase
    .from('project_requirements')
    .insert(requirements.map((requirement) => ({
      project_id: projectId,
      plant_name: requirement.plantName,
      species: requirement.species || null,
      quantity: requirement.quantity,
      notes: requirement.notes || null
    })));
  if (error) throw new Error(error.message);
};

const toProjectRow = (input: ProjectInput, organizerUserId: string) => ({
  organizer_user_id: organizerUserId,
  title: input.title,
  description: input.description,
  location: input.location,
  start_date: input.startDate,
  end_date: input.endDate,
  tree_target: input.treeTarget,
  funding_target: input.fundingTarget ?? null,
  photo_urls: input.photoUrls,
  contact_preference: input.contactPreference,
  contact_details: input.contactPreference === 'PLATFORM_ONLY' ? null : (input.contactDetails || null),
  updated_at: new Date().toISOString()
});

export const createProject = async (
  organizerUserId: string,
  input: ProjectInput,
  supabase: SupabaseClient = getSupabaseClient()
) => {
  const { data, error } = await supabase
    .from('plantation_projects')
    .insert({ ...toProjectRow(input, organizerUserId), status: 'DRAFT' })
    .select('*')
    .single();
  if (error) throw new Error(error.message);
  try {
    await insertRequirements(supabase, data.id, input.requirements);
  } catch (requirementError) {
    // Saga-style cleanup, as in earlier phases: a project without its
    // requirements would be invalid, so remove the row just created.
    await supabase.from('plantation_projects').delete().eq('id', data.id);
    throw requirementError;
  }
  return enrichProject(supabase, data, organizerUserId);
};

export const updateProject = async (
  organizerUserId: string,
  projectId: string,
  input: ProjectInput,
  supabase: SupabaseClient = getSupabaseClient()
) => {
  const project = await getProject(supabase, projectId);
  if (!isOrganizer(project, organizerUserId)) {
    throw new Error('You do not have permission to edit this plantation project.');
  }
  if (project.status === 'ARCHIVED') {
    throw new Error('Invalid status transition from ARCHIVED to editing.');
  }
  const { data, error } = await supabase
    .from('plantation_projects')
    .update(toProjectRow(input, organizerUserId))
    .eq('id', projectId)
    .eq('organizer_user_id', organizerUserId)
    .select('*')
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error('Plantation project not found.');

  // Requirements are replaced as a set so the breakdown always matches
  // the form the organizer just submitted.
  const { error: deleteError } = await supabase
    .from('project_requirements')
    .delete()
    .eq('project_id', projectId);
  if (deleteError) throw new Error(deleteError.message);
  await insertRequirements(supabase, projectId, input.requirements);
  return enrichProject(supabase, data, organizerUserId);
};

export const changeProjectStatus = async (
  organizerUserId: string,
  projectId: string,
  target: ProjectStatus,
  supabase: SupabaseClient = getSupabaseClient()
) => {
  const project = await getProject(supabase, projectId);
  if (!isOrganizer(project, organizerUserId)) {
    throw new Error('You do not have permission to change this plantation project.');
  }
  if (!canTransitionProject(project.status as ProjectStatus, target)) {
    throw new Error(`Invalid status transition from ${project.status} to ${target}.`);
  }
  const { data, error } = await supabase
    .from('plantation_projects')
    .update({ status: target, updated_at: new Date().toISOString() })
    .eq('id', projectId)
    .eq('status', project.status)
    .select('*')
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error(`Invalid status transition from ${project.status} to ${target}.`);
  return enrichProject(supabase, data, organizerUserId);
};

export const getMyProjects = async (organizerUserId: string, supabase: SupabaseClient = getSupabaseClient()) => {
  const { data, error } = await supabase
    .from('plantation_projects')
    .select('*')
    .eq('organizer_user_id', organizerUserId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  const projects = [];
  for (const project of data ?? []) projects.push(await enrichProject(supabase, project, organizerUserId));
  return projects;
};

// Public discovery: published projects by default, completed projects on
// request. Draft and archived projects never appear here.
export const discoverProjects = async (
  filters: ProjectFilters,
  viewerUserId: string | null = null,
  supabase: SupabaseClient = getSupabaseClient()
) => {
  const from = (filters.page - 1) * filters.pageSize;
  let projectIdsForSpecies: string[] | undefined;
  if (filters.species) {
    const { data: requirementRows, error: requirementError } = await supabase
      .from('project_requirements')
      .select('project_id')
      .or(`plant_name.ilike.%${escapeSearchValue(filters.species)}%,species.ilike.%${escapeSearchValue(filters.species)}%`);
    if (requirementError) throw new Error(requirementError.message);
    projectIdsForSpecies = [...new Set((requirementRows ?? []).map((row) => row.project_id as string))];
    if (projectIdsForSpecies.length === 0) {
      return { projects: [], pagination: { page: filters.page, pageSize: filters.pageSize, total: 0, totalPages: 0 } };
    }
  }

  let query = supabase
    .from('plantation_projects')
    .select('*', { count: 'exact' })
    .eq('status', filters.status)
    // Phase 7 moderation: admin-hidden projects are never discoverable.
    .eq('moderation_status', 'VISIBLE')
    .order('start_date', { ascending: true })
    .range(from, from + filters.pageSize - 1);
  if (filters.query) {
    const term = escapeSearchValue(filters.query);
    query = query.or(`title.ilike.%${term}%,description.ilike.%${term}%,location.ilike.%${term}%`);
  }
  if (filters.location) query = query.ilike('location', `%${escapeSearchValue(filters.location)}%`);
  if (projectIdsForSpecies) query = query.in('id', projectIdsForSpecies);
  if (filters.minTreeTarget !== undefined) query = query.gte('tree_target', filters.minTreeTarget);
  if (filters.maxTreeTarget !== undefined) query = query.lte('tree_target', filters.maxTreeTarget);

  const { data, count, error } = await query;
  if (error) throw new Error(error.message);
  const projects = [];
  for (const project of data ?? []) projects.push(await enrichProject(supabase, project, viewerUserId));
  return {
    projects,
    pagination: {
      page: filters.page,
      pageSize: filters.pageSize,
      total: count ?? 0,
      totalPages: Math.ceil((count ?? 0) / filters.pageSize)
    }
  };
};

export const getProjectForViewer = async (
  projectId: string,
  viewerUserId: string | null,
  supabase: SupabaseClient = getSupabaseClient()
) => {
  const project = await getProject(supabase, projectId);
  let viewerHasPledge = false;
  if (viewerUserId && !isOrganizer(project, viewerUserId)) {
    const pledges = await getPledgesForProject(supabase, projectId);
    viewerHasPledge = pledges.some((pledge) => pledge.supporter_user_id === viewerUserId);
  }
  if (!canViewProject(project, viewerUserId, viewerHasPledge)) {
    throw new Error('You do not have permission to access this plantation project.');
  }
  return enrichProject(supabase, project, viewerUserId);
};

export const addProgressUpdate = async (
  organizerUserId: string,
  projectId: string,
  input: ProgressUpdateInput,
  supabase: SupabaseClient = getSupabaseClient()
) => {
  const project = await getProject(supabase, projectId);
  if (!isOrganizer(project, organizerUserId)) {
    throw new Error('You do not have permission to add progress updates to this plantation project.');
  }
  if (project.status === 'ARCHIVED') {
    throw new Error('Invalid status transition from ARCHIVED to a progress update.');
  }
  if (input.treesPlanted !== undefined && input.treesPlanted !== null && input.treesPlanted > project.tree_target) {
    throw new Error('Trees planted cannot exceed the project tree target.');
  }
  const { data, error } = await supabase
    .from('project_progress_updates')
    .insert({
      project_id: projectId,
      author_user_id: organizerUserId,
      title: input.title,
      body: input.body,
      trees_planted: input.treesPlanted ?? null,
      photo_urls: input.photoUrls
    })
    .select('*')
    .single();
  if (error) throw new Error(error.message);
  return data;
};

export const submitPledge = async (
  supporterUserId: string,
  supporterRoles: string[],
  projectId: string,
  input: PledgeInput,
  supabase: SupabaseClient = getSupabaseClient()
) => {
  if (!supporterRoles.some((role) => (pledgeEligibleRoles as readonly string[]).includes(role))) {
    throw new Error('You do not have permission to pledge support to this project.');
  }
  const project = await getProject(supabase, projectId);
  if (isOrganizer(project, supporterUserId)) {
    throw new Error('You do not have permission to pledge to your own plantation project.');
  }
  if (!canPledgeToProject(project, supporterUserId)) {
    throw new Error('This project is not published and does not accept pledges.');
  }
  const existingPledges = await getPledgesForProject(supabase, projectId);
  if (findLivePledge(existingPledges, supporterUserId, input.pledgeType)) {
    throw new Error(`You already have a live ${input.pledgeType.toLowerCase()} pledge on this project. Withdraw it before pledging this type again.`);
  }

  const { data, error } = await supabase
    .from('project_pledges')
    .insert({
      project_id: projectId,
      supporter_user_id: supporterUserId,
      pledge_type: input.pledgeType,
      amount: input.pledgeType === 'FUNDS' ? input.amount : null,
      quantity: input.pledgeType === 'TREES' || input.pledgeType === 'MATERIALS' ? input.quantity : null,
      description: input.description || null,
      status: 'PLEDGED'
    })
    .select('*')
    .single();
  if (error) {
    if (error.code === '23505') {
      throw new Error(`You already have a live ${input.pledgeType.toLowerCase()} pledge on this project. Withdraw it before pledging this type again.`);
    }
    throw new Error(error.message);
  }
  await recordPledgeEvent(supabase, data, supporterUserId, null, 'PLEDGED');
  // Phase 8: tell the organizer a pledge arrived. The notification names
  // the pledge type only — never the pledged amount (failure-safe).
  await createNotification(supabase, pledgeReceivedNotification({
    recipientUserId: project.organizer_user_id,
    actorUserId: supporterUserId,
    projectId,
    projectTitle: project.title,
    pledgeType: input.pledgeType
  }));
  return data;
};

export const getMyPledges = async (supporterUserId: string, supabase: SupabaseClient = getSupabaseClient()) => {
  const { data, error } = await supabase
    .from('project_pledges')
    .select('*, project:plantation_projects(title, location, status, tree_target, funding_target)')
    .eq('supporter_user_id', supporterUserId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
};

const getPledge = async (supabase: SupabaseClient, pledgeId: string) => {
  const { data, error } = await supabase
    .from('project_pledges')
    .select('*')
    .eq('id', pledgeId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error('Pledge not found.');
  return data;
};

const setPledgeStatus = async (
  supabase: SupabaseClient,
  pledge: { id: string; project_id: string; status: PledgeStatus },
  actorUserId: string,
  target: PledgeStatus,
  allowed: (from: PledgeStatus, to: PledgeStatus) => boolean
) => {
  if (!allowed(pledge.status, target)) {
    throw new Error(`Invalid status transition from ${pledge.status} to ${target}.`);
  }
  const { data, error } = await supabase
    .from('project_pledges')
    .update({ status: target, updated_at: new Date().toISOString() })
    .eq('id', pledge.id)
    .eq('status', pledge.status)
    .select('*')
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error(`Invalid status transition from ${pledge.status} to ${target}.`);
  await recordPledgeEvent(supabase, data, actorUserId, pledge.status, target);
  return data;
};

export const withdrawPledge = async (
  supporterUserId: string,
  pledgeId: string,
  supabase: SupabaseClient = getSupabaseClient()
) => {
  const pledge = await getPledge(supabase, pledgeId);
  if (!isPledgeSupporter(pledge, supporterUserId)) {
    throw new Error('You do not have permission to withdraw this pledge.');
  }
  const updated = await setPledgeStatus(supabase, pledge, supporterUserId, 'WITHDRAWN', canSupporterTransitionPledge);
  const project = await getProject(supabase, pledge.project_id);
  // Phase 8: tell the organizer the pledge was withdrawn (failure-safe).
  await createNotification(supabase, pledgeStatusNotification({
    recipientUserId: project.organizer_user_id,
    actorUserId: supporterUserId,
    projectId: project.id as string,
    projectTitle: project.title,
    status: 'WITHDRAWN'
  }));
  return { pledge: updated, project: await enrichProject(supabase, project, supporterUserId) };
};

export const confirmPledge = async (
  organizerUserId: string,
  pledgeId: string,
  supabase: SupabaseClient = getSupabaseClient()
) => {
  const pledge = await getPledge(supabase, pledgeId);
  const project = await getProject(supabase, pledge.project_id);
  if (!isOrganizer(project, organizerUserId)) {
    throw new Error('You do not have permission to confirm this pledge.');
  }
  // Confirming acknowledges the intended support for coordination. It
  // does NOT record any money as received, because no receipt exists.
  const updated = await setPledgeStatus(supabase, pledge, organizerUserId, 'CONFIRMED', canOrganizerTransitionPledge);
  // Phase 8: tell the supporter their pledge was confirmed, without
  // implying any funds were received (failure-safe).
  await createNotification(supabase, pledgeStatusNotification({
    recipientUserId: pledge.supporter_user_id,
    actorUserId: organizerUserId,
    projectId: project.id as string,
    projectTitle: project.title,
    status: 'CONFIRMED'
  }));
  return { pledge: updated, project: await enrichProject(supabase, project, organizerUserId) };
};

export const declinePledge = async (
  organizerUserId: string,
  pledgeId: string,
  supabase: SupabaseClient = getSupabaseClient()
) => {
  const pledge = await getPledge(supabase, pledgeId);
  const project = await getProject(supabase, pledge.project_id);
  if (!isOrganizer(project, organizerUserId)) {
    throw new Error('You do not have permission to decline this pledge.');
  }
  const updated = await setPledgeStatus(supabase, pledge, organizerUserId, 'DECLINED', canOrganizerTransitionPledge);
  // Phase 8: tell the supporter their pledge was declined (failure-safe).
  await createNotification(supabase, pledgeStatusNotification({
    recipientUserId: pledge.supporter_user_id,
    actorUserId: organizerUserId,
    projectId: project.id as string,
    projectTitle: project.title,
    status: 'DECLINED'
  }));
  return { pledge: updated, project: await enrichProject(supabase, project, organizerUserId) };
};
