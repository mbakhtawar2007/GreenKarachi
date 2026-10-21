"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.declinePledge = exports.confirmPledge = exports.withdrawPledge = exports.getMyPledges = exports.submitPledge = exports.addProgressUpdate = exports.getProjectForViewer = exports.discoverProjects = exports.getMyProjects = exports.changeProjectStatus = exports.updateProject = exports.createProject = exports.sanitizeProjectForViewer = exports.latestTreesPlanted = exports.progressPercent = exports.canViewProject = exports.canPledgeToProject = exports.isPledgeSupporter = exports.isOrganizer = exports.findLivePledge = exports.isLivePledge = exports.summarizePledges = exports.canOrganizerTransitionPledge = exports.canSupporterTransitionPledge = exports.pledgeTransitionsForOrganizer = exports.pledgeTransitionsForSupporter = exports.canTransitionProject = exports.projectTransitions = exports.requirementsFitTarget = exports.requirementsTotal = exports.projectFilterSchema = exports.pledgeInputSchema = exports.progressUpdateInputSchema = exports.projectStatusInputSchema = exports.projectInputSchema = exports.projectRequirementInputSchema = exports.pledgeEligibleRoles = exports.contactPreferences = exports.pledgeStatuses = exports.pledgeTypes = exports.projectStatuses = void 0;
const zod_1 = require("zod");
const auth_1 = require("../lib/auth");
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
exports.projectStatuses = ['DRAFT', 'PUBLISHED', 'COMPLETED', 'ARCHIVED'];
exports.pledgeTypes = ['FUNDS', 'TREES', 'MATERIALS', 'VOLUNTEER_TIME', 'OTHER'];
exports.pledgeStatuses = ['PLEDGED', 'CONFIRMED', 'WITHDRAWN', 'DECLINED'];
exports.contactPreferences = ['PLATFORM_ONLY', 'EMAIL', 'PHONE', 'EMAIL_AND_PHONE'];
// Roles that may submit support interest / pledges. The organizer role is
// included because organizers may support other organizers' projects; a
// project's own organizer is still blocked from pledging to it below.
exports.pledgeEligibleRoles = ['BUYER', 'NURSERY_OWNER', 'PLANTATION_ORGANIZER', 'DONOR_INVESTOR', 'ADMIN'];
const positiveMoney = zod_1.z.number().finite().positive().max(9999999999.99)
    .refine((value) => Math.abs(value * 100 - Math.round(value * 100)) < 0.0000001, 'Amounts can have at most two decimal places.');
const dateSchema = zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must use YYYY-MM-DD format.')
    .refine((value) => !Number.isNaN(Date.parse(value)), 'Date must be a valid date.');
const imageUrlSchema = zod_1.z.string().trim().url().max(2048).refine((value) => {
    try {
        const protocol = new URL(value).protocol;
        return protocol === 'https:' || protocol === 'http:';
    }
    catch {
        return false;
    }
}, 'Image URLs must use HTTP or HTTPS.');
exports.projectRequirementInputSchema = zod_1.z.object({
    plantName: zod_1.z.string().trim().min(1).max(120),
    species: zod_1.z.string().trim().max(120).optional().or(zod_1.z.literal('')),
    quantity: zod_1.z.number().int().positive().max(100000000),
    notes: zod_1.z.string().trim().max(500).optional().or(zod_1.z.literal(''))
});
exports.projectInputSchema = zod_1.z.object({
    title: zod_1.z.string().trim().min(1).max(160),
    description: zod_1.z.string().trim().min(1).max(4000),
    location: zod_1.z.string().trim().min(1).max(160),
    startDate: dateSchema,
    endDate: dateSchema,
    treeTarget: zod_1.z.number().int().positive().max(100000000),
    fundingTarget: positiveMoney.optional().nullable(),
    photoUrls: zod_1.z.array(imageUrlSchema).max(8).default([]),
    contactPreference: zod_1.z.enum(exports.contactPreferences).default('PLATFORM_ONLY'),
    contactDetails: zod_1.z.string().trim().max(300).optional().or(zod_1.z.literal('')),
    requirements: zod_1.z.array(exports.projectRequirementInputSchema).min(1, 'A project needs at least one plant requirement.').max(50)
}).superRefine((input, ctx) => {
    if (input.endDate < input.startDate) {
        ctx.addIssue({ code: zod_1.z.ZodIssueCode.custom, path: ['endDate'], message: 'End date cannot be before the start date.' });
    }
    const total = input.requirements.reduce((sum, requirement) => sum + requirement.quantity, 0);
    if (total > input.treeTarget) {
        ctx.addIssue({
            code: zod_1.z.ZodIssueCode.custom,
            path: ['requirements'],
            message: 'Plant requirement quantities cannot add up to more than the tree target.'
        });
    }
    if (input.contactPreference !== 'PLATFORM_ONLY' && !(input.contactDetails ?? '').trim()) {
        ctx.addIssue({
            code: zod_1.z.ZodIssueCode.custom,
            path: ['contactDetails'],
            message: 'Contact details are required when the contact preference is not platform-only.'
        });
    }
});
exports.projectStatusInputSchema = zod_1.z.object({
    status: zod_1.z.enum(['PUBLISHED', 'COMPLETED', 'ARCHIVED'])
});
exports.progressUpdateInputSchema = zod_1.z.object({
    title: zod_1.z.string().trim().min(1).max(160),
    body: zod_1.z.string().trim().min(1).max(4000),
    treesPlanted: zod_1.z.number().int().min(0).max(100000000).optional().nullable(),
    photoUrls: zod_1.z.array(imageUrlSchema).max(8).default([])
});
exports.pledgeInputSchema = zod_1.z.object({
    pledgeType: zod_1.z.enum(exports.pledgeTypes),
    amount: positiveMoney.optional().nullable(),
    quantity: zod_1.z.number().int().positive().max(100000000).optional().nullable(),
    description: zod_1.z.string().trim().max(2000).optional().or(zod_1.z.literal(''))
}).superRefine((input, ctx) => {
    if (input.pledgeType === 'FUNDS') {
        if (input.amount === undefined || input.amount === null) {
            ctx.addIssue({ code: zod_1.z.ZodIssueCode.custom, path: ['amount'], message: 'A funds pledge needs an intended amount.' });
        }
        if (input.quantity !== undefined && input.quantity !== null) {
            ctx.addIssue({ code: zod_1.z.ZodIssueCode.custom, path: ['quantity'], message: 'A funds pledge cannot also set a quantity.' });
        }
    }
    if (input.pledgeType === 'TREES' || input.pledgeType === 'MATERIALS') {
        if (input.quantity === undefined || input.quantity === null) {
            ctx.addIssue({ code: zod_1.z.ZodIssueCode.custom, path: ['quantity'], message: 'This pledge type needs an intended quantity.' });
        }
        if (input.amount !== undefined && input.amount !== null) {
            ctx.addIssue({ code: zod_1.z.ZodIssueCode.custom, path: ['amount'], message: 'Only a funds pledge can set an amount.' });
        }
    }
    if (input.pledgeType === 'VOLUNTEER_TIME' || input.pledgeType === 'OTHER') {
        if (!(input.description ?? '').trim()) {
            ctx.addIssue({ code: zod_1.z.ZodIssueCode.custom, path: ['description'], message: 'This pledge type needs a short description of the intended support.' });
        }
    }
});
exports.projectFilterSchema = zod_1.z.object({
    query: zod_1.z.string().trim().max(120).optional(),
    location: zod_1.z.string().trim().max(120).optional(),
    species: zod_1.z.string().trim().max(120).optional(),
    status: zod_1.z.enum(['PUBLISHED', 'COMPLETED']).default('PUBLISHED'),
    minTreeTarget: zod_1.z.coerce.number().int().min(0).optional(),
    maxTreeTarget: zod_1.z.coerce.number().int().min(0).optional(),
    page: zod_1.z.coerce.number().int().min(1).default(1),
    pageSize: zod_1.z.coerce.number().int().min(1).max(50).default(12)
}).refine((filters) => filters.minTreeTarget === undefined || filters.maxTreeTarget === undefined || filters.minTreeTarget <= filters.maxTreeTarget, {
    message: 'Minimum tree target must not exceed maximum tree target.'
});
// ---------------------------------------------------------------------------
// Pure business rules (unit tested without a database)
// ---------------------------------------------------------------------------
const requirementsTotal = (requirements) => requirements.reduce((sum, requirement) => sum + requirement.quantity, 0);
exports.requirementsTotal = requirementsTotal;
// Plant requirements describe how the tree target is broken down by
// species, so their quantities may not add up to more than the target.
const requirementsFitTarget = (treeTarget, requirements) => requirements.length >= 1 && (0, exports.requirementsTotal)(requirements) <= treeTarget;
exports.requirementsFitTarget = requirementsFitTarget;
exports.projectTransitions = {
    DRAFT: ['PUBLISHED', 'ARCHIVED'],
    PUBLISHED: ['COMPLETED', 'ARCHIVED'],
    COMPLETED: ['ARCHIVED'],
    ARCHIVED: []
};
const canTransitionProject = (from, to) => exports.projectTransitions[from]?.includes(to) ?? false;
exports.canTransitionProject = canTransitionProject;
// Pledge transitions depend on who is acting. A supporter may withdraw
// their own live pledge; only the project's organizer may confirm or
// decline a pledged intention. Nothing here can move a pledge into a
// "paid" or "received" state, because no such state exists.
exports.pledgeTransitionsForSupporter = {
    PLEDGED: ['WITHDRAWN'],
    CONFIRMED: ['WITHDRAWN'],
    WITHDRAWN: [],
    DECLINED: []
};
exports.pledgeTransitionsForOrganizer = {
    PLEDGED: ['CONFIRMED', 'DECLINED'],
    CONFIRMED: [],
    WITHDRAWN: [],
    DECLINED: []
};
const canSupporterTransitionPledge = (from, to) => exports.pledgeTransitionsForSupporter[from]?.includes(to) ?? false;
exports.canSupporterTransitionPledge = canSupporterTransitionPledge;
const canOrganizerTransitionPledge = (from, to) => exports.pledgeTransitionsForOrganizer[from]?.includes(to) ?? false;
exports.canOrganizerTransitionPledge = canOrganizerTransitionPledge;
// Accurate pledge accounting: only live pledges (PLEDGED or CONFIRMED)
// count toward intended totals. Withdrawn and declined pledges count
// toward nothing but their own tallies.
const summarizePledges = (pledges) => {
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
exports.summarizePledges = summarizePledges;
const isLivePledge = (pledge) => pledge.status === 'PLEDGED' || pledge.status === 'CONFIRMED';
exports.isLivePledge = isLivePledge;
const findLivePledge = (pledges, supporterUserId, pledgeType) => pledges.find((pledge) => pledge.supporter_user_id === supporterUserId
    && pledge.pledge_type === pledgeType
    && (0, exports.isLivePledge)(pledge));
exports.findLivePledge = findLivePledge;
const isOrganizer = (project, userId) => project.organizer_user_id === userId;
exports.isOrganizer = isOrganizer;
const isPledgeSupporter = (pledge, userId) => pledge.supporter_user_id === userId;
exports.isPledgeSupporter = isPledgeSupporter;
// A project's own organizer coordinates support; they do not pledge to
// their own project.
const canPledgeToProject = (project, userId) => project.organizer_user_id !== userId && project.status === 'PUBLISHED';
exports.canPledgeToProject = canPledgeToProject;
// Published and completed projects are discoverable by anyone. Draft and
// archived projects are visible only to their organizer, and to users who
// already hold a pledge on the project (so they can still see the record
// their pledge belongs to).
const canViewProject = (project, viewerUserId, viewerHasPledge = false) => {
    if (project.status === 'PUBLISHED' || project.status === 'COMPLETED')
        return true;
    if (viewerUserId && (0, exports.isOrganizer)(project, viewerUserId))
        return true;
    return viewerHasPledge;
};
exports.canViewProject = canViewProject;
const progressPercent = (treesPlanted, treeTarget) => {
    if (treeTarget <= 0)
        return 0;
    return Math.min(100, Math.round((Math.max(0, treesPlanted) / treeTarget) * 100));
};
exports.progressPercent = progressPercent;
// The latest reported cumulative trees-planted figure across progress
// updates (updates arrive newest-first from the database helper below,
// but taking the max keeps this correct for any ordering).
const latestTreesPlanted = (updates) => updates.reduce((max, update) => Math.max(max, update.trees_planted ?? 0), 0);
exports.latestTreesPlanted = latestTreesPlanted;
// Contact details are the organizer's private contact channel. They are
// exposed only when the organizer chose a non-platform contact preference;
// with PLATFORM_ONLY they are stripped for everyone but the organizer.
const sanitizeProjectForViewer = (project, viewerUserId) => {
    if (viewerUserId && (0, exports.isOrganizer)(project, viewerUserId))
        return project;
    if (project.contact_preference !== 'PLATFORM_ONLY')
        return project;
    return { ...project, contact_details: null };
};
exports.sanitizeProjectForViewer = sanitizeProjectForViewer;
const escapeSearchValue = (value) => value.replace(/[\\%_*,.()]/g, '\\$&');
const getProject = async (supabase, projectId) => {
    const { data, error } = await supabase
        .from('plantation_projects')
        .select('*')
        .eq('id', projectId)
        .maybeSingle();
    if (error)
        throw new Error(error.message);
    if (!data)
        throw new Error('Plantation project not found.');
    return data;
};
const getRequirements = async (supabase, projectId) => {
    const { data, error } = await supabase
        .from('project_requirements')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: true });
    if (error)
        throw new Error(error.message);
    return data ?? [];
};
const getProgressUpdates = async (supabase, projectId) => {
    const { data, error } = await supabase
        .from('project_progress_updates')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });
    if (error)
        throw new Error(error.message);
    return data ?? [];
};
const getPledgesForProject = async (supabase, projectId) => {
    const { data, error } = await supabase
        .from('project_pledges')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: true });
    if (error)
        throw new Error(error.message);
    return data ?? [];
};
const recordPledgeEvent = async (supabase, pledge, actorUserId, fromStatus, toStatus) => {
    const { error } = await supabase
        .from('project_pledge_events')
        .insert({
        pledge_id: pledge.id,
        project_id: pledge.project_id,
        actor_user_id: actorUserId,
        from_status: fromStatus,
        to_status: toStatus
    });
    if (error)
        throw new Error(error.message);
};
// Attaches requirements, progress updates, and the pledge summary to a
// project. The full pledge list is attached only for participants who are
// allowed to see it (the organizer sees every pledge on their project; a
// supporter sees only their own). Everyone else gets counts and intended
// totals only, never other supporters' private records.
const enrichProject = async (supabase, project, viewerUserId) => {
    const [requirements, updates, pledges] = await Promise.all([
        getRequirements(supabase, project.id),
        getProgressUpdates(supabase, project.id),
        getPledgesForProject(supabase, project.id)
    ]);
    const treesPlanted = (0, exports.latestTreesPlanted)(updates);
    const visiblePledges = viewerUserId && (0, exports.isOrganizer)(project, viewerUserId)
        ? pledges
        : pledges.filter((pledge) => pledge.supporter_user_id === viewerUserId);
    return {
        ...(0, exports.sanitizeProjectForViewer)(project, viewerUserId),
        requirements,
        progress_updates: updates,
        trees_planted: treesPlanted,
        progress_percent: (0, exports.progressPercent)(treesPlanted, project.tree_target),
        pledge_summary: (0, exports.summarizePledges)(pledges),
        pledges: visiblePledges
    };
};
const insertRequirements = async (supabase, projectId, requirements) => {
    const { error } = await supabase
        .from('project_requirements')
        .insert(requirements.map((requirement) => ({
        project_id: projectId,
        plant_name: requirement.plantName,
        species: requirement.species || null,
        quantity: requirement.quantity,
        notes: requirement.notes || null
    })));
    if (error)
        throw new Error(error.message);
};
const toProjectRow = (input, organizerUserId) => ({
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
const createProject = async (organizerUserId, input, supabase = (0, auth_1.getSupabaseClient)()) => {
    const { data, error } = await supabase
        .from('plantation_projects')
        .insert({ ...toProjectRow(input, organizerUserId), status: 'DRAFT' })
        .select('*')
        .single();
    if (error)
        throw new Error(error.message);
    try {
        await insertRequirements(supabase, data.id, input.requirements);
    }
    catch (requirementError) {
        // Saga-style cleanup, as in earlier phases: a project without its
        // requirements would be invalid, so remove the row just created.
        await supabase.from('plantation_projects').delete().eq('id', data.id);
        throw requirementError;
    }
    return enrichProject(supabase, data, organizerUserId);
};
exports.createProject = createProject;
const updateProject = async (organizerUserId, projectId, input, supabase = (0, auth_1.getSupabaseClient)()) => {
    const project = await getProject(supabase, projectId);
    if (!(0, exports.isOrganizer)(project, organizerUserId)) {
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
    if (error)
        throw new Error(error.message);
    if (!data)
        throw new Error('Plantation project not found.');
    // Requirements are replaced as a set so the breakdown always matches
    // the form the organizer just submitted.
    const { error: deleteError } = await supabase
        .from('project_requirements')
        .delete()
        .eq('project_id', projectId);
    if (deleteError)
        throw new Error(deleteError.message);
    await insertRequirements(supabase, projectId, input.requirements);
    return enrichProject(supabase, data, organizerUserId);
};
exports.updateProject = updateProject;
const changeProjectStatus = async (organizerUserId, projectId, target, supabase = (0, auth_1.getSupabaseClient)()) => {
    const project = await getProject(supabase, projectId);
    if (!(0, exports.isOrganizer)(project, organizerUserId)) {
        throw new Error('You do not have permission to change this plantation project.');
    }
    if (!(0, exports.canTransitionProject)(project.status, target)) {
        throw new Error(`Invalid status transition from ${project.status} to ${target}.`);
    }
    const { data, error } = await supabase
        .from('plantation_projects')
        .update({ status: target, updated_at: new Date().toISOString() })
        .eq('id', projectId)
        .eq('status', project.status)
        .select('*')
        .maybeSingle();
    if (error)
        throw new Error(error.message);
    if (!data)
        throw new Error(`Invalid status transition from ${project.status} to ${target}.`);
    return enrichProject(supabase, data, organizerUserId);
};
exports.changeProjectStatus = changeProjectStatus;
const getMyProjects = async (organizerUserId, supabase = (0, auth_1.getSupabaseClient)()) => {
    const { data, error } = await supabase
        .from('plantation_projects')
        .select('*')
        .eq('organizer_user_id', organizerUserId)
        .order('created_at', { ascending: false });
    if (error)
        throw new Error(error.message);
    const projects = [];
    for (const project of data ?? [])
        projects.push(await enrichProject(supabase, project, organizerUserId));
    return projects;
};
exports.getMyProjects = getMyProjects;
// Public discovery: published projects by default, completed projects on
// request. Draft and archived projects never appear here.
const discoverProjects = async (filters, viewerUserId = null, supabase = (0, auth_1.getSupabaseClient)()) => {
    const from = (filters.page - 1) * filters.pageSize;
    let projectIdsForSpecies;
    if (filters.species) {
        const { data: requirementRows, error: requirementError } = await supabase
            .from('project_requirements')
            .select('project_id')
            .or(`plant_name.ilike.%${escapeSearchValue(filters.species)}%,species.ilike.%${escapeSearchValue(filters.species)}%`);
        if (requirementError)
            throw new Error(requirementError.message);
        projectIdsForSpecies = [...new Set((requirementRows ?? []).map((row) => row.project_id))];
        if (projectIdsForSpecies.length === 0) {
            return { projects: [], pagination: { page: filters.page, pageSize: filters.pageSize, total: 0, totalPages: 0 } };
        }
    }
    let query = supabase
        .from('plantation_projects')
        .select('*', { count: 'exact' })
        .eq('status', filters.status)
        .order('start_date', { ascending: true })
        .range(from, from + filters.pageSize - 1);
    if (filters.query) {
        const term = escapeSearchValue(filters.query);
        query = query.or(`title.ilike.%${term}%,description.ilike.%${term}%,location.ilike.%${term}%`);
    }
    if (filters.location)
        query = query.ilike('location', `%${escapeSearchValue(filters.location)}%`);
    if (projectIdsForSpecies)
        query = query.in('id', projectIdsForSpecies);
    if (filters.minTreeTarget !== undefined)
        query = query.gte('tree_target', filters.minTreeTarget);
    if (filters.maxTreeTarget !== undefined)
        query = query.lte('tree_target', filters.maxTreeTarget);
    const { data, count, error } = await query;
    if (error)
        throw new Error(error.message);
    const projects = [];
    for (const project of data ?? [])
        projects.push(await enrichProject(supabase, project, viewerUserId));
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
exports.discoverProjects = discoverProjects;
const getProjectForViewer = async (projectId, viewerUserId, supabase = (0, auth_1.getSupabaseClient)()) => {
    const project = await getProject(supabase, projectId);
    let viewerHasPledge = false;
    if (viewerUserId && !(0, exports.isOrganizer)(project, viewerUserId)) {
        const pledges = await getPledgesForProject(supabase, projectId);
        viewerHasPledge = pledges.some((pledge) => pledge.supporter_user_id === viewerUserId);
    }
    if (!(0, exports.canViewProject)(project, viewerUserId, viewerHasPledge)) {
        throw new Error('You do not have permission to access this plantation project.');
    }
    return enrichProject(supabase, project, viewerUserId);
};
exports.getProjectForViewer = getProjectForViewer;
const addProgressUpdate = async (organizerUserId, projectId, input, supabase = (0, auth_1.getSupabaseClient)()) => {
    const project = await getProject(supabase, projectId);
    if (!(0, exports.isOrganizer)(project, organizerUserId)) {
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
    if (error)
        throw new Error(error.message);
    return data;
};
exports.addProgressUpdate = addProgressUpdate;
const submitPledge = async (supporterUserId, supporterRoles, projectId, input, supabase = (0, auth_1.getSupabaseClient)()) => {
    if (!supporterRoles.some((role) => exports.pledgeEligibleRoles.includes(role))) {
        throw new Error('You do not have permission to pledge support to this project.');
    }
    const project = await getProject(supabase, projectId);
    if ((0, exports.isOrganizer)(project, supporterUserId)) {
        throw new Error('You do not have permission to pledge to your own plantation project.');
    }
    if (!(0, exports.canPledgeToProject)(project, supporterUserId)) {
        throw new Error('This project is not published and does not accept pledges.');
    }
    const existingPledges = await getPledgesForProject(supabase, projectId);
    if ((0, exports.findLivePledge)(existingPledges, supporterUserId, input.pledgeType)) {
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
    return data;
};
exports.submitPledge = submitPledge;
const getMyPledges = async (supporterUserId, supabase = (0, auth_1.getSupabaseClient)()) => {
    const { data, error } = await supabase
        .from('project_pledges')
        .select('*, project:plantation_projects(title, location, status, tree_target, funding_target)')
        .eq('supporter_user_id', supporterUserId)
        .order('created_at', { ascending: false });
    if (error)
        throw new Error(error.message);
    return data ?? [];
};
exports.getMyPledges = getMyPledges;
const getPledge = async (supabase, pledgeId) => {
    const { data, error } = await supabase
        .from('project_pledges')
        .select('*')
        .eq('id', pledgeId)
        .maybeSingle();
    if (error)
        throw new Error(error.message);
    if (!data)
        throw new Error('Pledge not found.');
    return data;
};
const setPledgeStatus = async (supabase, pledge, actorUserId, target, allowed) => {
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
    if (error)
        throw new Error(error.message);
    if (!data)
        throw new Error(`Invalid status transition from ${pledge.status} to ${target}.`);
    await recordPledgeEvent(supabase, data, actorUserId, pledge.status, target);
    return data;
};
const withdrawPledge = async (supporterUserId, pledgeId, supabase = (0, auth_1.getSupabaseClient)()) => {
    const pledge = await getPledge(supabase, pledgeId);
    if (!(0, exports.isPledgeSupporter)(pledge, supporterUserId)) {
        throw new Error('You do not have permission to withdraw this pledge.');
    }
    const updated = await setPledgeStatus(supabase, pledge, supporterUserId, 'WITHDRAWN', exports.canSupporterTransitionPledge);
    const project = await getProject(supabase, pledge.project_id);
    return { pledge: updated, project: await enrichProject(supabase, project, supporterUserId) };
};
exports.withdrawPledge = withdrawPledge;
const confirmPledge = async (organizerUserId, pledgeId, supabase = (0, auth_1.getSupabaseClient)()) => {
    const pledge = await getPledge(supabase, pledgeId);
    const project = await getProject(supabase, pledge.project_id);
    if (!(0, exports.isOrganizer)(project, organizerUserId)) {
        throw new Error('You do not have permission to confirm this pledge.');
    }
    // Confirming acknowledges the intended support for coordination. It
    // does NOT record any money as received, because no receipt exists.
    const updated = await setPledgeStatus(supabase, pledge, organizerUserId, 'CONFIRMED', exports.canOrganizerTransitionPledge);
    return { pledge: updated, project: await enrichProject(supabase, project, organizerUserId) };
};
exports.confirmPledge = confirmPledge;
const declinePledge = async (organizerUserId, pledgeId, supabase = (0, auth_1.getSupabaseClient)()) => {
    const pledge = await getPledge(supabase, pledgeId);
    const project = await getProject(supabase, pledge.project_id);
    if (!(0, exports.isOrganizer)(project, organizerUserId)) {
        throw new Error('You do not have permission to decline this pledge.');
    }
    const updated = await setPledgeStatus(supabase, pledge, organizerUserId, 'DECLINED', exports.canOrganizerTransitionPledge);
    return { pledge: updated, project: await enrichProject(supabase, project, organizerUserId) };
};
exports.declinePledge = declinePledge;
