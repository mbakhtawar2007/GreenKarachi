import { z } from 'zod';
import { getSupabaseClient } from '../lib/auth';
export declare const projectStatuses: readonly ["DRAFT", "PUBLISHED", "COMPLETED", "ARCHIVED"];
export declare const pledgeTypes: readonly ["FUNDS", "TREES", "MATERIALS", "VOLUNTEER_TIME", "OTHER"];
export declare const pledgeStatuses: readonly ["PLEDGED", "CONFIRMED", "WITHDRAWN", "DECLINED"];
export declare const contactPreferences: readonly ["PLATFORM_ONLY", "EMAIL", "PHONE", "EMAIL_AND_PHONE"];
export type ProjectStatus = (typeof projectStatuses)[number];
export type PledgeType = (typeof pledgeTypes)[number];
export type PledgeStatus = (typeof pledgeStatuses)[number];
export type ContactPreference = (typeof contactPreferences)[number];
export declare const pledgeEligibleRoles: readonly ["BUYER", "NURSERY_OWNER", "PLANTATION_ORGANIZER", "DONOR_INVESTOR", "ADMIN"];
export declare const projectRequirementInputSchema: z.ZodObject<{
    plantName: z.ZodString;
    species: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
    quantity: z.ZodNumber;
    notes: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
}, "strip", z.ZodTypeAny, {
    quantity: number;
    plantName: string;
    notes?: string | undefined;
    species?: string | undefined;
}, {
    quantity: number;
    plantName: string;
    notes?: string | undefined;
    species?: string | undefined;
}>;
export declare const projectInputSchema: z.ZodEffects<z.ZodObject<{
    title: z.ZodString;
    description: z.ZodString;
    location: z.ZodString;
    startDate: z.ZodEffects<z.ZodString, string, string>;
    endDate: z.ZodEffects<z.ZodString, string, string>;
    treeTarget: z.ZodNumber;
    fundingTarget: z.ZodNullable<z.ZodOptional<z.ZodEffects<z.ZodNumber, number, number>>>;
    photoUrls: z.ZodDefault<z.ZodArray<z.ZodEffects<z.ZodString, string, string>, "many">>;
    contactPreference: z.ZodDefault<z.ZodEnum<["PLATFORM_ONLY", "EMAIL", "PHONE", "EMAIL_AND_PHONE"]>>;
    contactDetails: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
    requirements: z.ZodArray<z.ZodObject<{
        plantName: z.ZodString;
        species: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
        quantity: z.ZodNumber;
        notes: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
    }, "strip", z.ZodTypeAny, {
        quantity: number;
        plantName: string;
        notes?: string | undefined;
        species?: string | undefined;
    }, {
        quantity: number;
        plantName: string;
        notes?: string | undefined;
        species?: string | undefined;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    title: string;
    description: string;
    location: string;
    requirements: {
        quantity: number;
        plantName: string;
        notes?: string | undefined;
        species?: string | undefined;
    }[];
    startDate: string;
    endDate: string;
    treeTarget: number;
    photoUrls: string[];
    contactPreference: "PLATFORM_ONLY" | "EMAIL" | "PHONE" | "EMAIL_AND_PHONE";
    fundingTarget?: number | null | undefined;
    contactDetails?: string | undefined;
}, {
    title: string;
    description: string;
    location: string;
    requirements: {
        quantity: number;
        plantName: string;
        notes?: string | undefined;
        species?: string | undefined;
    }[];
    startDate: string;
    endDate: string;
    treeTarget: number;
    fundingTarget?: number | null | undefined;
    photoUrls?: string[] | undefined;
    contactPreference?: "PLATFORM_ONLY" | "EMAIL" | "PHONE" | "EMAIL_AND_PHONE" | undefined;
    contactDetails?: string | undefined;
}>, {
    title: string;
    description: string;
    location: string;
    requirements: {
        quantity: number;
        plantName: string;
        notes?: string | undefined;
        species?: string | undefined;
    }[];
    startDate: string;
    endDate: string;
    treeTarget: number;
    photoUrls: string[];
    contactPreference: "PLATFORM_ONLY" | "EMAIL" | "PHONE" | "EMAIL_AND_PHONE";
    fundingTarget?: number | null | undefined;
    contactDetails?: string | undefined;
}, {
    title: string;
    description: string;
    location: string;
    requirements: {
        quantity: number;
        plantName: string;
        notes?: string | undefined;
        species?: string | undefined;
    }[];
    startDate: string;
    endDate: string;
    treeTarget: number;
    fundingTarget?: number | null | undefined;
    photoUrls?: string[] | undefined;
    contactPreference?: "PLATFORM_ONLY" | "EMAIL" | "PHONE" | "EMAIL_AND_PHONE" | undefined;
    contactDetails?: string | undefined;
}>;
export declare const projectStatusInputSchema: z.ZodObject<{
    status: z.ZodEnum<["PUBLISHED", "COMPLETED", "ARCHIVED"]>;
}, "strip", z.ZodTypeAny, {
    status: "ARCHIVED" | "PUBLISHED" | "COMPLETED";
}, {
    status: "ARCHIVED" | "PUBLISHED" | "COMPLETED";
}>;
export declare const progressUpdateInputSchema: z.ZodObject<{
    title: z.ZodString;
    body: z.ZodString;
    treesPlanted: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
    photoUrls: z.ZodDefault<z.ZodArray<z.ZodEffects<z.ZodString, string, string>, "many">>;
}, "strip", z.ZodTypeAny, {
    title: string;
    body: string;
    photoUrls: string[];
    treesPlanted?: number | null | undefined;
}, {
    title: string;
    body: string;
    photoUrls?: string[] | undefined;
    treesPlanted?: number | null | undefined;
}>;
export declare const pledgeInputSchema: z.ZodEffects<z.ZodObject<{
    pledgeType: z.ZodEnum<["FUNDS", "TREES", "MATERIALS", "VOLUNTEER_TIME", "OTHER"]>;
    amount: z.ZodNullable<z.ZodOptional<z.ZodEffects<z.ZodNumber, number, number>>>;
    quantity: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
    description: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
}, "strip", z.ZodTypeAny, {
    pledgeType: "OTHER" | "FUNDS" | "TREES" | "MATERIALS" | "VOLUNTEER_TIME";
    description?: string | undefined;
    quantity?: number | null | undefined;
    amount?: number | null | undefined;
}, {
    pledgeType: "OTHER" | "FUNDS" | "TREES" | "MATERIALS" | "VOLUNTEER_TIME";
    description?: string | undefined;
    quantity?: number | null | undefined;
    amount?: number | null | undefined;
}>, {
    pledgeType: "OTHER" | "FUNDS" | "TREES" | "MATERIALS" | "VOLUNTEER_TIME";
    description?: string | undefined;
    quantity?: number | null | undefined;
    amount?: number | null | undefined;
}, {
    pledgeType: "OTHER" | "FUNDS" | "TREES" | "MATERIALS" | "VOLUNTEER_TIME";
    description?: string | undefined;
    quantity?: number | null | undefined;
    amount?: number | null | undefined;
}>;
export declare const projectFilterSchema: z.ZodEffects<z.ZodObject<{
    query: z.ZodOptional<z.ZodString>;
    location: z.ZodOptional<z.ZodString>;
    species: z.ZodOptional<z.ZodString>;
    status: z.ZodDefault<z.ZodEnum<["PUBLISHED", "COMPLETED"]>>;
    minTreeTarget: z.ZodOptional<z.ZodNumber>;
    maxTreeTarget: z.ZodOptional<z.ZodNumber>;
    page: z.ZodDefault<z.ZodNumber>;
    pageSize: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    status: "PUBLISHED" | "COMPLETED";
    page: number;
    pageSize: number;
    query?: string | undefined;
    species?: string | undefined;
    location?: string | undefined;
    minTreeTarget?: number | undefined;
    maxTreeTarget?: number | undefined;
}, {
    status?: "PUBLISHED" | "COMPLETED" | undefined;
    page?: number | undefined;
    pageSize?: number | undefined;
    query?: string | undefined;
    species?: string | undefined;
    location?: string | undefined;
    minTreeTarget?: number | undefined;
    maxTreeTarget?: number | undefined;
}>, {
    status: "PUBLISHED" | "COMPLETED";
    page: number;
    pageSize: number;
    query?: string | undefined;
    species?: string | undefined;
    location?: string | undefined;
    minTreeTarget?: number | undefined;
    maxTreeTarget?: number | undefined;
}, {
    status?: "PUBLISHED" | "COMPLETED" | undefined;
    page?: number | undefined;
    pageSize?: number | undefined;
    query?: string | undefined;
    species?: string | undefined;
    location?: string | undefined;
    minTreeTarget?: number | undefined;
    maxTreeTarget?: number | undefined;
}>;
export type ProjectRequirementInput = z.infer<typeof projectRequirementInputSchema>;
export type ProjectInput = z.infer<typeof projectInputSchema>;
export type ProgressUpdateInput = z.infer<typeof progressUpdateInputSchema>;
export type PledgeInput = z.infer<typeof pledgeInputSchema>;
export type ProjectFilters = z.infer<typeof projectFilterSchema>;
export declare const requirementsTotal: (requirements: Array<{
    quantity: number;
}>) => number;
export declare const requirementsFitTarget: (treeTarget: number, requirements: Array<{
    quantity: number;
}>) => boolean;
export declare const projectTransitions: Record<ProjectStatus, ProjectStatus[]>;
export declare const canTransitionProject: (from: ProjectStatus, to: ProjectStatus) => boolean;
export declare const pledgeTransitionsForSupporter: Record<PledgeStatus, PledgeStatus[]>;
export declare const pledgeTransitionsForOrganizer: Record<PledgeStatus, PledgeStatus[]>;
export declare const canSupporterTransitionPledge: (from: PledgeStatus, to: PledgeStatus) => boolean;
export declare const canOrganizerTransitionPledge: (from: PledgeStatus, to: PledgeStatus) => boolean;
export type PledgeSummary = {
    pledge_count: number;
    active_count: number;
    withdrawn_count: number;
    declined_count: number;
    intended_funds_total: number;
    intended_trees_total: number;
    funds_received: 0;
};
type PledgeLike = {
    pledge_type: PledgeType | string;
    status: PledgeStatus | string;
    amount?: string | number | null;
    quantity?: number | null;
};
export declare const summarizePledges: (pledges: PledgeLike[]) => PledgeSummary;
export declare const isLivePledge: (pledge: {
    status: PledgeStatus | string;
}) => boolean;
export declare const findLivePledge: <T extends {
    supporter_user_id: string;
    pledge_type: string;
    status: string;
}>(pledges: T[], supporterUserId: string, pledgeType: PledgeType) => T | undefined;
export declare const isOrganizer: (project: {
    organizer_user_id: string;
}, userId: string) => boolean;
export declare const isPledgeSupporter: (pledge: {
    supporter_user_id: string;
}, userId: string) => boolean;
export declare const canPledgeToProject: (project: {
    organizer_user_id: string;
    status: ProjectStatus | string;
}, userId: string) => boolean;
export declare const canViewProject: (project: {
    organizer_user_id: string;
    status: ProjectStatus | string;
    moderation_status?: string | null;
}, viewerUserId: string | null, viewerHasPledge?: boolean) => boolean;
export declare const progressPercent: (treesPlanted: number, treeTarget: number) => number;
export declare const latestTreesPlanted: (updates: Array<{
    trees_planted?: number | null;
}>) => number;
export declare const sanitizeProjectForViewer: <T extends {
    organizer_user_id: string;
    contact_preference: string;
    contact_details?: string | null;
}>(project: T, viewerUserId: string | null) => T;
type SupabaseClient = ReturnType<typeof getSupabaseClient>;
export declare const createProject: (organizerUserId: string, input: ProjectInput, supabase?: SupabaseClient) => Promise<{
    requirements: any[];
    progress_updates: any[];
    trees_planted: number;
    progress_percent: number;
    pledge_summary: PledgeSummary;
    pledges: any[];
    id: string;
    organizer_user_id: string;
    tree_target: number;
    contact_preference: string;
    contact_details?: string | null;
}>;
export declare const updateProject: (organizerUserId: string, projectId: string, input: ProjectInput, supabase?: SupabaseClient) => Promise<{
    requirements: any[];
    progress_updates: any[];
    trees_planted: number;
    progress_percent: number;
    pledge_summary: PledgeSummary;
    pledges: any[];
    id: string;
    organizer_user_id: string;
    tree_target: number;
    contact_preference: string;
    contact_details?: string | null;
}>;
export declare const changeProjectStatus: (organizerUserId: string, projectId: string, target: ProjectStatus, supabase?: SupabaseClient) => Promise<{
    requirements: any[];
    progress_updates: any[];
    trees_planted: number;
    progress_percent: number;
    pledge_summary: PledgeSummary;
    pledges: any[];
    id: string;
    organizer_user_id: string;
    tree_target: number;
    contact_preference: string;
    contact_details?: string | null;
}>;
export declare const getMyProjects: (organizerUserId: string, supabase?: SupabaseClient) => Promise<{
    requirements: any[];
    progress_updates: any[];
    trees_planted: number;
    progress_percent: number;
    pledge_summary: PledgeSummary;
    pledges: any[];
    id: string;
    organizer_user_id: string;
    tree_target: number;
    contact_preference: string;
    contact_details?: string | null;
}[]>;
export declare const discoverProjects: (filters: ProjectFilters, viewerUserId?: string | null, supabase?: SupabaseClient) => Promise<{
    projects: {
        requirements: any[];
        progress_updates: any[];
        trees_planted: number;
        progress_percent: number;
        pledge_summary: PledgeSummary;
        pledges: any[];
        id: string;
        organizer_user_id: string;
        tree_target: number;
        contact_preference: string;
        contact_details?: string | null;
    }[];
    pagination: {
        page: number;
        pageSize: number;
        total: number;
        totalPages: number;
    };
}>;
export declare const getProjectForViewer: (projectId: string, viewerUserId: string | null, supabase?: SupabaseClient) => Promise<{
    requirements: any[];
    progress_updates: any[];
    trees_planted: number;
    progress_percent: number;
    pledge_summary: PledgeSummary;
    pledges: any[];
    id: string;
    organizer_user_id: string;
    tree_target: number;
    contact_preference: string;
    contact_details?: string | null;
}>;
export declare const addProgressUpdate: (organizerUserId: string, projectId: string, input: ProgressUpdateInput, supabase?: SupabaseClient) => Promise<any>;
export declare const submitPledge: (supporterUserId: string, supporterRoles: string[], projectId: string, input: PledgeInput, supabase?: SupabaseClient) => Promise<any>;
export declare const getMyPledges: (supporterUserId: string, supabase?: SupabaseClient) => Promise<any[]>;
export declare const withdrawPledge: (supporterUserId: string, pledgeId: string, supabase?: SupabaseClient) => Promise<{
    pledge: any;
    project: {
        requirements: any[];
        progress_updates: any[];
        trees_planted: number;
        progress_percent: number;
        pledge_summary: PledgeSummary;
        pledges: any[];
        id: string;
        organizer_user_id: string;
        tree_target: number;
        contact_preference: string;
        contact_details?: string | null;
    };
}>;
export declare const confirmPledge: (organizerUserId: string, pledgeId: string, supabase?: SupabaseClient) => Promise<{
    pledge: any;
    project: {
        requirements: any[];
        progress_updates: any[];
        trees_planted: number;
        progress_percent: number;
        pledge_summary: PledgeSummary;
        pledges: any[];
        id: string;
        organizer_user_id: string;
        tree_target: number;
        contact_preference: string;
        contact_details?: string | null;
    };
}>;
export declare const declinePledge: (organizerUserId: string, pledgeId: string, supabase?: SupabaseClient) => Promise<{
    pledge: any;
    project: {
        requirements: any[];
        progress_updates: any[];
        trees_planted: number;
        progress_percent: number;
        pledge_summary: PledgeSummary;
        pledges: any[];
        id: string;
        organizer_user_id: string;
        tree_target: number;
        contact_preference: string;
        contact_details?: string | null;
    };
}>;
export {};
