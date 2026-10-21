import assert from 'node:assert/strict';
import test, { describe } from 'node:test';
import {
  accountSuspensionNotification,
  applyNotificationRead,
  buildNotification,
  canMarkNotificationRead,
  contentModerationNotification,
  countUnreadNotifications,
  createNotification,
  isUnreadNotification,
  messageReceivedNotification,
  notificationLinkFor,
  notificationListFilterSchema,
  orderConfirmedNotification,
  orderStatusNotification,
  pledgeReceivedNotification,
  pledgeStatusNotification,
  quotationReceivedNotification,
  quoteRequestReceivedNotification,
  reportUpdatedNotification,
  sanitizeNotification,
  supplyOfferStatusNotification,
  verificationDecisionNotification
} from '../src/services/notifications.service';

const buyer = '11111111-1111-4111-8111-111111111111';
const nursery = '22222222-2222-4222-8222-222222222222';
const admin = '33333333-3333-4333-8333-333333333333';
const requestId = '44444444-4444-4444-8444-444444444444';
const orderId = '55555555-5555-4555-8555-555555555555';
const projectId = '66666666-6666-4666-8666-666666666666';

describe('notification building', () => {
  test('a user is never notified about their own action', () => {
    const row = buildNotification({
      recipientUserId: buyer,
      actorUserId: buyer,
      type: 'ORDER_CONFIRMED',
      title: 'Order confirmed',
      body: 'Body'
    });
    assert.equal(row, null);
  });

  test('a notification without a recipient is skipped', () => {
    const row = buildNotification({
      recipientUserId: '',
      actorUserId: buyer,
      type: 'ORDER_CONFIRMED',
      title: 'Order confirmed',
      body: 'Body'
    });
    assert.equal(row, null);
  });

  test('the stored row targets the other participant and carries the link for its record', () => {
    const row = quoteRequestReceivedNotification({
      recipientUserId: nursery, actorUserId: buyer, requestId,
      plantName: 'Neem', quantity: 100, deliveryArea: 'Clifton, Karachi'
    });
    assert.ok(row);
    assert.equal(row.recipient_user_id, nursery);
    assert.equal(row.actor_user_id, buyer);
    assert.equal(row.type, 'QUOTE_REQUEST_RECEIVED');
    assert.equal(row.ref_type, 'QUOTE_REQUEST');
    assert.equal(row.ref_id, requestId);
    assert.equal(row.link, '/quotes');
    assert.match(row.body, /not an order/);
  });

  test('links point at the page where the recipient acts on the record', () => {
    assert.equal(notificationLinkFor('QUOTE_REQUEST', requestId), '/quotes');
    assert.equal(notificationLinkFor('ORDER', orderId), '/quotes');
    assert.equal(notificationLinkFor('SUPPLY_GAP_REQUEST', requestId), '/collaboration');
    assert.equal(notificationLinkFor('SUPPLY_OFFER', requestId), '/collaboration');
    assert.equal(notificationLinkFor('PROJECT', projectId), '/projects');
    assert.equal(notificationLinkFor('PLEDGE', projectId), '/projects');
    assert.equal(notificationLinkFor('LISTING', requestId), '/inventory');
    assert.equal(notificationLinkFor('NURSERY', nursery), '/inventory');
    assert.equal(notificationLinkFor('CONVERSATION', requestId), `/messages/${requestId}`);
    assert.equal(notificationLinkFor('REPORT', requestId), null);
    assert.equal(notificationLinkFor(null, null), null);
  });
});

describe('workflow event notifications', () => {
  test('quotation and order notifications reach the right participant with the right type', () => {
    const quotation = quotationReceivedNotification({
      recipientUserId: buyer, actorUserId: nursery, requestId, plantName: 'Neem', quantity: 100
    });
    assert.equal(quotation?.type, 'QUOTATION_RECEIVED');
    assert.equal(quotation?.recipient_user_id, buyer);

    const confirmed = orderConfirmedNotification({
      recipientUserId: nursery, actorUserId: buyer, orderId, plantName: 'Neem', quantity: 100
    });
    assert.equal(confirmed?.type, 'ORDER_CONFIRMED');
    assert.match(confirmed?.body ?? '', /No payment has been processed/);

    const fulfilled = orderStatusNotification({
      recipientUserId: buyer, actorUserId: nursery, orderId, plantName: 'Neem', status: 'FULFILLED'
    });
    assert.equal(fulfilled?.type, 'ORDER_FULFILLED');
    const cancelled = orderStatusNotification({
      recipientUserId: nursery, actorUserId: buyer, orderId, plantName: 'Neem', status: 'CANCELLED'
    });
    assert.equal(cancelled?.type, 'ORDER_CANCELLED');
    assert.match(cancelled?.body ?? '', /reserved stock was released/);
  });

  test('an accepted supply offer is a commitment, not proof of delivery', () => {
    const accepted = supplyOfferStatusNotification({
      recipientUserId: nursery, actorUserId: buyer, requestId,
      plantName: 'Neem', quantity: 25, status: 'ACCEPTED'
    });
    assert.equal(accepted?.type, 'SUPPLY_OFFER_ACCEPTED');
    assert.match(accepted?.body ?? '', /not proof of delivery/);
    const withdrawn = supplyOfferStatusNotification({
      recipientUserId: buyer, actorUserId: nursery, requestId,
      plantName: 'Neem', quantity: 25, status: 'WITHDRAWN'
    });
    assert.equal(withdrawn?.type, 'SUPPLY_OFFER_WITHDRAWN');
    assert.match(withdrawn?.body ?? '', /do not count/);
  });
});

describe('notifications cannot leak private data', () => {
  test('a pledge notification never contains the pledged amount', () => {
    // The shape a pledge row carries in the database; the service passes
    // only the safe fields to the builder.
    const pledge = { amount: 5000, quantity: 40, pledge_type: 'FUNDS', project_title: 'Lyari Green Belt' };
    const row = pledgeReceivedNotification({
      recipientUserId: nursery,
      actorUserId: buyer,
      projectId,
      projectTitle: pledge.project_title,
      pledgeType: pledge.pledge_type
    });
    assert.ok(row);
    const serialized = JSON.stringify(row);
    assert.equal(serialized.includes('5000'), false);
    assert.equal(serialized.includes('funds received'), false);
    assert.match(row.body, /not money received/);
  });

  test('a confirmed pledge is never phrased as funds received', () => {
    const row = pledgeStatusNotification({
      recipientUserId: buyer, actorUserId: nursery, projectId,
      projectTitle: 'Lyari Green Belt', status: 'CONFIRMED'
    });
    assert.equal(row?.type, 'PLEDGE_CONFIRMED');
    assert.match(row?.body ?? '', /does not record any funds as received/);
  });

  test('a verification notification carries the status and never the admin notes', () => {
    const row = verificationDecisionNotification({
      recipientUserId: nursery, actorUserId: admin, subject: 'NURSERY', status: 'REJECTED'
    });
    assert.ok(row);
    assert.equal(row.body, 'Your nursery verification status is now REJECTED.');
    assert.equal(JSON.stringify(row).includes('documents looked forged'), false);
  });

  test('a suspension notification never carries the admin reason', () => {
    const row = accountSuspensionNotification({ recipientUserId: buyer, actorUserId: admin, suspended: true });
    assert.equal(row?.type, 'ACCOUNT_SUSPENDED');
    assert.equal(JSON.stringify(row).includes('Repeated fraud reports'), false);
    const restored = accountSuspensionNotification({ recipientUserId: buyer, actorUserId: admin, suspended: false });
    assert.equal(restored?.type, 'ACCOUNT_REACTIVATED');
  });

  test('moderation and report notifications carry outcomes, never reasons or resolution notes', () => {
    const hidden = contentModerationNotification({
      recipientUserId: nursery, actorUserId: admin, kind: 'LISTING',
      targetId: requestId, name: 'Neem Sapling', hidden: true
    });
    assert.equal(hidden?.type, 'LISTING_HIDDEN');
    assert.match(hidden?.body ?? '', /Neem Sapling/);
    assert.equal(JSON.stringify(hidden).includes('spam listing'), false);

    const report = reportUpdatedNotification({
      recipientUserId: buyer, actorUserId: admin, reportId: requestId, status: 'RESOLVED'
    });
    assert.equal(report?.type, 'REPORT_UPDATED');
    assert.equal(report?.link, null);
    assert.equal(JSON.stringify(report).includes('warned the seller privately'), false);
  });

  test('a message notification names the conversation but never quotes the message', () => {
    const row = messageReceivedNotification({
      recipientUserId: nursery, actorUserId: buyer,
      conversationId: requestId, conversationTitle: 'Order · Neem'
    });
    assert.equal(row?.type, 'MESSAGE_RECEIVED');
    assert.equal(row?.link, `/messages/${requestId}`);
    assert.equal(JSON.stringify(row).includes('meet me at the godown at 6'), false);
  });

  test('sanitizeNotification whitelists recipient-safe fields only', () => {
    const safe = sanitizeNotification({
      id: requestId, type: 'PLEDGE_RECEIVED', title: 'T', body: 'B',
      ref_type: 'PROJECT', ref_id: projectId, link: '/projects',
      is_read: false, read_at: null, created_at: '2026-10-21T00:00:00.000Z',
      amount: 5000, verification_notes: 'internal', actor_email: 'admin@example.test'
    } as Record<string, unknown>);
    assert.deepEqual(Object.keys(safe).sort(), [
      'body', 'created_at', 'id', 'is_read', 'link', 'read_at', 'ref_id', 'ref_type', 'title', 'type'
    ]);
    assert.equal(JSON.stringify(safe).includes('5000'), false);
    assert.equal(JSON.stringify(safe).includes('internal'), false);
  });
});

describe('read and unread rules', () => {
  const mine = { recipient_user_id: buyer, is_read: false, read_at: null as string | null };

  test('only the recipient can mark a notification read', () => {
    assert.equal(canMarkNotificationRead(mine, buyer), true);
    assert.equal(canMarkNotificationRead(mine, nursery), false);
    assert.equal(canMarkNotificationRead(mine, admin), false);
  });

  test('marking read sets the flag and timestamp once, and is idempotent', () => {
    const now = new Date('2026-10-21T10:00:00.000Z');
    const read = applyNotificationRead(mine, now);
    assert.equal(read.is_read, true);
    assert.equal(read.read_at, '2026-10-21T10:00:00.000Z');
    const again = applyNotificationRead(read, new Date('2026-10-22T10:00:00.000Z'));
    assert.equal(again.read_at, '2026-10-21T10:00:00.000Z');
  });

  test('unread state and counts follow the read flag', () => {
    const list = [{ is_read: false }, { is_read: true }, { is_read: false }];
    assert.equal(isUnreadNotification(list[0]), true);
    assert.equal(isUnreadNotification(list[1]), false);
    assert.equal(countUnreadNotifications(list), 2);
    assert.equal(countUnreadNotifications([]), 0);
  });

  test('list filters default to the first page and reject bad paging', () => {
    const parsed = notificationListFilterSchema.parse({});
    assert.equal(parsed.page, 1);
    assert.equal(parsed.pageSize, 20);
    assert.equal(notificationListFilterSchema.safeParse({ page: '0' }).success, false);
    assert.equal(notificationListFilterSchema.safeParse({ pageSize: '500' }).success, false);
    assert.equal(notificationListFilterSchema.safeParse({ unreadOnly: 'yes' }).success, false);
    assert.equal(notificationListFilterSchema.safeParse({ unreadOnly: 'true' }).success, true);
  });
});

describe('failure-safe delivery', () => {
  test('delivering nothing sends nothing', async () => {
    let calls = 0;
    const fake = { from: () => { calls += 1; return { insert: async () => ({ error: null }) }; } };
    assert.equal(await createNotification(fake as never, null), false);
    assert.equal(calls, 0);
  });

  test('a failing insert returns false instead of throwing', async () => {
    const failing = { from: () => ({ insert: async () => ({ error: { message: 'db down' } }) }) };
    const row = buildNotification({
      recipientUserId: buyer, actorUserId: nursery, type: 'ORDER_CONFIRMED', title: 'T', body: 'B'
    });
    assert.equal(await createNotification(failing as never, row), false);
  });

  test('a client that throws synchronously still cannot fail the caller', async () => {
    const throwing = { from: () => { throw new Error('client exploded'); } };
    const row = buildNotification({
      recipientUserId: buyer, actorUserId: nursery, type: 'ORDER_CONFIRMED', title: 'T', body: 'B'
    });
    assert.equal(await createNotification(throwing as never, row), false);
  });
});
