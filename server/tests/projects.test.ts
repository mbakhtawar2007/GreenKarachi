import assert from 'node:assert/strict';
import test, { describe } from 'node:test';
import type { Response } from 'express';
import { requireAuth, requireRoles, type RequestWithUser } from '../src/middleware/auth';
import {
  canOrganizerTransitionPledge,
  canPledgeToProject,
  canSupporterTransitionPledge,
  canTransitionProject,
  canViewProject,
  findLivePledge,
  isLivePledge,
  isOrganizer,
  isPledgeSupporter,
  latestTreesPlanted,
  pledgeInputSchema,
  progressPercent,
  progressUpdateInputSchema,
  projectFilterSchema,
  projectInputSchema,
  projectStatusInputSchema,
  requirementsFitTarget,
  requirementsTotal,
  sanitizeProjectForViewer,
  summarizePledges,
  type PledgeStatus,
  type PledgeType
} from '../src/services/projects.service';

const validProject = {
  title: 'Clifton Urban Forest',
  description: 'Planting native trees along the Clifton beachfront.',
  location: 'Clifton, Karachi',
  startDate: '2027-01-15',
  endDate: '2027-03-15',
  treeTarget: 500,
  fundingTarget: 250000,
  photoUrls: ['https://example.com/clifton.jpg'],
  contactPreference: 'PLATFORM_ONLY' as const,
  contactDetails: '',
  requirements: [
    { plantName: 'Neem', species: 'Azadirachta indica', quantity: 300, notes: '' },
    { plantName: 'Peepal', species: 'Ficus religiosa', quantity: 200, notes: '' }
  ]
};

const pledge = (type: PledgeType, status: PledgeStatus, extra: Record<string, unknown> = {}) => ({
  pledge_type: type,
  status,
  amount: null as number | null,
  quantity: null as number | null,
  ...extra
});

describe('plantation project validation', () => {
  test('accepts a valid project whose requirements sum to the tree target', () => {
    const parsed = projectInputSchema.parse(validProject);
    assert.equal(parsed.treeTarget, 500);
    assert.equal(parsed.requirements.length, 2);
    assert.equal(requirementsTotal(parsed.requirements), 500);
  });

  test('rejects a project with no plant requirements', () => {
    assert.equal(projectInputSchema.safeParse({ ...validProject, requirements: [] }).success, false);
  });

  test('rejects requirements that add up to more than the tree target', () => {
    const tooMuch = {
      ...validProject,
      requirements: [{ plantName: 'Neem', species: '', quantity: 501, notes: '' }]
    };
    assert.equal(projectInputSchema.safeParse(tooMuch).success, false);
    assert.equal(requirementsFitTarget(500, [{ quantity: 501 }]), false);
    assert.equal(requirementsFitTarget(500, [{ quantity: 300 }, { quantity: 200 }]), true);
    assert.equal(requirementsFitTarget(500, []), false);
  });

  test('rejects an end date before the start date and malformed dates', () => {
    assert.equal(projectInputSchema.safeParse({ ...validProject, endDate: '2027-01-01' }).success, false);
    assert.equal(projectInputSchema.safeParse({ ...validProject, startDate: '15/01/2027' }).success, false);
  });

  test('funding target is optional but must be a positive amount with at most two decimals', () => {
    const noFunding = { ...validProject, fundingTarget: null };
    assert.equal(projectInputSchema.safeParse(noFunding).success, true);
    assert.equal(projectInputSchema.safeParse({ ...validProject, fundingTarget: 0 }).success, false);
    assert.equal(projectInputSchema.safeParse({ ...validProject, fundingTarget: -100 }).success, false);
    assert.equal(projectInputSchema.safeParse({ ...validProject, fundingTarget: 100.999 }).success, false);
  });

  test('rejects non-positive or fractional tree targets and bad photo URLs', () => {
    assert.equal(projectInputSchema.safeParse({ ...validProject, treeTarget: 0 }).success, false);
    assert.equal(projectInputSchema.safeParse({ ...validProject, treeTarget: 10.5 }).success, false);
    assert.equal(projectInputSchema.safeParse({ ...validProject, photoUrls: ['ftp://example.com/x.jpg'] }).success, false);
    assert.equal(projectInputSchema.safeParse({ ...validProject, photoUrls: ['not-a-url'] }).success, false);
    assert.equal(projectInputSchema.safeParse({ ...validProject, title: '' }).success, false);
    assert.equal(projectInputSchema.safeParse({ ...validProject, location: '' }).success, false);
  });

  test('contact details are required unless the preference is platform-only', () => {
    assert.equal(projectInputSchema.safeParse(validProject).success, true);
    assert.equal(projectInputSchema.safeParse({ ...validProject, contactPreference: 'EMAIL', contactDetails: '' }).success, false);
    assert.equal(projectInputSchema.safeParse({ ...validProject, contactPreference: 'EMAIL', contactDetails: 'organizer@example.com' }).success, true);
  });

  test('project status input only allows publish, complete, or archive', () => {
    assert.equal(projectStatusInputSchema.safeParse({ status: 'PUBLISHED' }).success, true);
    assert.equal(projectStatusInputSchema.safeParse({ status: 'ARCHIVED' }).success, true);
    assert.equal(projectStatusInputSchema.safeParse({ status: 'DRAFT' }).success, false);
  });

  test('discovery filters default to published projects and validate ranges', () => {
    const parsed = projectFilterSchema.parse({});
    assert.equal(parsed.status, 'PUBLISHED');
    assert.equal(parsed.page, 1);
    assert.equal(projectFilterSchema.safeParse({ status: 'DRAFT' }).success, false);
    assert.equal(projectFilterSchema.safeParse({ minTreeTarget: 100, maxTreeTarget: 10 }).success, false);
  });
});

describe('project status transitions', () => {
  test('drafts publish or archive, published projects complete or archive, archived is terminal', () => {
    assert.equal(canTransitionProject('DRAFT', 'PUBLISHED'), true);
    assert.equal(canTransitionProject('DRAFT', 'ARCHIVED'), true);
    assert.equal(canTransitionProject('DRAFT', 'COMPLETED'), false);
    assert.equal(canTransitionProject('PUBLISHED', 'COMPLETED'), true);
    assert.equal(canTransitionProject('PUBLISHED', 'ARCHIVED'), true);
    assert.equal(canTransitionProject('COMPLETED', 'ARCHIVED'), true);
    assert.equal(canTransitionProject('ARCHIVED', 'PUBLISHED'), false);
    assert.equal(canTransitionProject('PUBLISHED', 'DRAFT'), false);
  });
});

describe('progress updates and progress calculation', () => {
  test('accepts a valid progress update and rejects negative trees', () => {
    assert.equal(progressUpdateInputSchema.safeParse({ title: 'Week 1', body: 'Planted the first row.', treesPlanted: 50, photoUrls: [] }).success, true);
    assert.equal(progressUpdateInputSchema.safeParse({ title: 'Week 1', body: 'Update.', treesPlanted: -1, photoUrls: [] }).success, false);
    assert.equal(progressUpdateInputSchema.safeParse({ title: '', body: 'Update.', photoUrls: [] }).success, false);
  });

  test('progress percent is capped at 100 and based on the latest reported planting total', () => {
    assert.equal(progressPercent(250, 500), 50);
    assert.equal(progressPercent(600, 500), 100);
    assert.equal(progressPercent(0, 500), 0);
    assert.equal(latestTreesPlanted([{ trees_planted: 50 }, { trees_planted: 120 }, { trees_planted: null }]), 120);
    assert.equal(latestTreesPlanted([]), 0);
  });
});

describe('pledge validation: a pledge is an intention, not a payment', () => {
  test('a funds pledge needs an intended amount and no quantity', () => {
    assert.equal(pledgeInputSchema.safeParse({ pledgeType: 'FUNDS', amount: 5000 }).success, true);
    assert.equal(pledgeInputSchema.safeParse({ pledgeType: 'FUNDS' }).success, false);
    assert.equal(pledgeInputSchema.safeParse({ pledgeType: 'FUNDS', amount: 0 }).success, false);
    assert.equal(pledgeInputSchema.safeParse({ pledgeType: 'FUNDS', amount: 5000, quantity: 10 }).success, false);
  });

  test('tree and material pledges need an intended quantity and no amount', () => {
    assert.equal(pledgeInputSchema.safeParse({ pledgeType: 'TREES', quantity: 40 }).success, true);
    assert.equal(pledgeInputSchema.safeParse({ pledgeType: 'MATERIALS', quantity: 10, description: 'Grow bags' }).success, true);
    assert.equal(pledgeInputSchema.safeParse({ pledgeType: 'TREES' }).success, false);
    assert.equal(pledgeInputSchema.safeParse({ pledgeType: 'TREES', quantity: 0 }).success, false);
    assert.equal(pledgeInputSchema.safeParse({ pledgeType: 'TREES', quantity: 40, amount: 100 }).success, false);
  });

  test('volunteer-time and other pledges need a description', () => {
    assert.equal(pledgeInputSchema.safeParse({ pledgeType: 'VOLUNTEER_TIME', description: 'Weekend planting crew of 6.' }).success, true);
    assert.equal(pledgeInputSchema.safeParse({ pledgeType: 'VOLUNTEER_TIME' }).success, false);
    assert.equal(pledgeInputSchema.safeParse({ pledgeType: 'OTHER', description: 'Water tanker for the first month.' }).success, true);
    assert.equal(pledgeInputSchema.safeParse({ pledgeType: 'OTHER' }).success, false);
  });

  test('the pledge schema has no payment or receipt fields to abuse', () => {
    const parsed = pledgeInputSchema.parse({ pledgeType: 'FUNDS', amount: 5000, paid: true, fundsReceived: 5000 } as never);
    assert.equal('paid' in parsed, false);
    assert.equal('fundsReceived' in parsed, false);
  });
});

describe('pledge status accuracy', () => {
  test('only live pledges count toward intended totals, and funds received is always zero', () => {
    const summary = summarizePledges([
      pledge('FUNDS', 'PLEDGED', { amount: 5000 }),
      pledge('FUNDS', 'CONFIRMED', { amount: 10000 }),
      pledge('FUNDS', 'WITHDRAWN', { amount: 7000 }),
      pledge('FUNDS', 'DECLINED', { amount: 3000 }),
      pledge('TREES', 'PLEDGED', { quantity: 40 }),
      pledge('TREES', 'WITHDRAWN', { quantity: 25 })
    ]);
    assert.equal(summary.pledge_count, 6);
    assert.equal(summary.active_count, 3);
    assert.equal(summary.withdrawn_count, 2);
    assert.equal(summary.declined_count, 1);
    // Withdrawn and declined intentions are excluded: 5000 + 10000 only.
    assert.equal(summary.intended_funds_total, 15000);
    assert.equal(summary.intended_trees_total, 40);
    // A CONFIRMED pledge is an acknowledged intention, not a receipt.
    assert.equal(summary.funds_received, 0);
  });

  test('an empty project reports zero intended support and zero received', () => {
    const summary = summarizePledges([]);
    assert.equal(summary.intended_funds_total, 0);
    assert.equal(summary.intended_trees_total, 0);
    assert.equal(summary.funds_received, 0);
  });

  test('supporters can withdraw live pledges only; organizers can confirm or decline pledged ones only', () => {
    assert.equal(canSupporterTransitionPledge('PLEDGED', 'WITHDRAWN'), true);
    assert.equal(canSupporterTransitionPledge('CONFIRMED', 'WITHDRAWN'), true);
    assert.equal(canSupporterTransitionPledge('WITHDRAWN', 'WITHDRAWN'), false);
    assert.equal(canSupporterTransitionPledge('PLEDGED', 'CONFIRMED'), false);
    assert.equal(canOrganizerTransitionPledge('PLEDGED', 'CONFIRMED'), true);
    assert.equal(canOrganizerTransitionPledge('PLEDGED', 'DECLINED'), true);
    assert.equal(canOrganizerTransitionPledge('CONFIRMED', 'DECLINED'), false);
    assert.equal(canOrganizerTransitionPledge('WITHDRAWN', 'CONFIRMED'), false);
  });

  test('duplicate live pledges of the same type are detected per supporter', () => {
    const pledges = [
      { supporter_user_id: 'donor-1', pledge_type: 'FUNDS', status: 'PLEDGED' },
      { supporter_user_id: 'donor-1', pledge_type: 'TREES', status: 'WITHDRAWN' },
      { supporter_user_id: 'donor-2', pledge_type: 'FUNDS', status: 'CONFIRMED' }
    ];
    assert.ok(findLivePledge(pledges, 'donor-1', 'FUNDS'));
    // The withdrawn TREES pledge no longer blocks a fresh one.
    assert.equal(findLivePledge(pledges, 'donor-1', 'TREES'), undefined);
    assert.ok(findLivePledge(pledges, 'donor-2', 'FUNDS'));
    assert.equal(isLivePledge({ status: 'CONFIRMED' }), true);
    assert.equal(isLivePledge({ status: 'DECLINED' }), false);
  });
});

describe('project visibility, pledging eligibility, and privacy', () => {
  const draft = { organizer_user_id: 'organizer-1', status: 'DRAFT' as const };
  const published = { organizer_user_id: 'organizer-1', status: 'PUBLISHED' as const };
  const archived = { organizer_user_id: 'organizer-1', status: 'ARCHIVED' as const };

  test('published and completed projects are visible to anyone, including guests', () => {
    assert.equal(canViewProject(published, null), true);
    assert.equal(canViewProject({ ...published, status: 'COMPLETED' }, null), true);
  });

  test('draft and archived projects are visible only to their organizer or an existing pledge participant', () => {
    assert.equal(canViewProject(draft, null), false);
    assert.equal(canViewProject(draft, 'someone-else'), false);
    assert.equal(canViewProject(draft, 'organizer-1'), true);
    assert.equal(canViewProject(archived, 'donor-1', true), true);
    assert.equal(canViewProject(archived, 'donor-1', false), false);
  });

  test('only published projects accept pledges, and never from their own organizer', () => {
    assert.equal(canPledgeToProject(published, 'donor-1'), true);
    assert.equal(canPledgeToProject(published, 'organizer-1'), false);
    assert.equal(canPledgeToProject(draft, 'donor-1'), false);
    assert.equal(canPledgeToProject(archived, 'donor-1'), false);
    assert.equal(isOrganizer(published, 'organizer-1'), true);
    assert.equal(isPledgeSupporter({ supporter_user_id: 'donor-1' }, 'donor-1'), true);
    assert.equal(isPledgeSupporter({ supporter_user_id: 'donor-1' }, 'donor-2'), false);
  });

  test('platform-only contact details are stripped for everyone except the organizer', () => {
    const project = {
      organizer_user_id: 'organizer-1',
      contact_preference: 'PLATFORM_ONLY',
      contact_details: 'secret-phone'
    };
    assert.equal(sanitizeProjectForViewer(project, 'donor-1').contact_details, null);
    assert.equal(sanitizeProjectForViewer(project, null).contact_details, null);
    assert.equal(sanitizeProjectForViewer(project, 'organizer-1').contact_details, 'secret-phone');
    const shared = { ...project, contact_preference: 'EMAIL' };
    assert.equal(sanitizeProjectForViewer(shared, 'donor-1').contact_details, 'secret-phone');
  });
});

describe('role permissions for project endpoints', () => {
  const makeResponse = () => {
    const state = { statusCode: 200 };
    const response = {
      status(code: number) { state.statusCode = code; return this; },
      json() { return this; }
    } as unknown as Response;
    return { state, response };
  };
  const asUser = (id: string, roles: string[]) => ({
    user: { id, email: `${id}@example.test`, name: id, roles }
  }) as unknown as RequestWithUser;

  test('unauthenticated requests are rejected by requireAuth', () => {
    let statusCode = 200;
    let continued = false;
    const response = {
      status(code: number) { statusCode = code; return this; },
      json() { return this; }
    } as unknown as Response;
    requireAuth({ headers: {} } as RequestWithUser, response, () => { continued = true; });
    assert.equal(statusCode, 401);
    assert.equal(continued, false);
  });

  test('only plantation organizers pass the organizer role guard', () => {
    for (const role of ['BUYER', 'NURSERY_OWNER', 'DONOR_INVESTOR']) {
      const { state, response } = makeResponse();
      let continued = false;
      requireRoles('PLANTATION_ORGANIZER')(asUser('user-1', [role]), response, () => { continued = true; });
      assert.equal(state.statusCode, 403, `${role} should be rejected`);
      assert.equal(continued, false);
    }
    const { state, response } = makeResponse();
    let continued = false;
    requireRoles('PLANTATION_ORGANIZER')(asUser('organizer-1', ['PLANTATION_ORGANIZER']), response, () => { continued = true; });
    assert.equal(state.statusCode, 200);
    assert.equal(continued, true);
  });

  test('donors, buyers, nursery owners, and organizers all pass the pledge role guard', () => {
    for (const role of ['BUYER', 'NURSERY_OWNER', 'PLANTATION_ORGANIZER', 'DONOR_INVESTOR', 'ADMIN']) {
      const { state, response } = makeResponse();
      let continued = false;
      requireRoles('BUYER', 'NURSERY_OWNER', 'PLANTATION_ORGANIZER', 'DONOR_INVESTOR', 'ADMIN')(
        asUser('supporter-1', [role]), response, () => { continued = true; }
      );
      assert.equal(state.statusCode, 200, `${role} should be allowed to pledge`);
      assert.equal(continued, true);
    }
  });
});
