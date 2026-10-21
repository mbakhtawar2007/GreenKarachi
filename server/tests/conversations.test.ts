import assert from 'node:assert/strict';
import test, { describe } from 'node:test';
import type { Response } from 'express';
import { requireAuth, type RequestWithUser } from '../src/middleware/auth';
import {
  canAccessConversation,
  canPostToConversation,
  conversationTitleFor,
  createConversationSchema,
  isConversationParticipant,
  messageInputSchema,
  participantsForBuyerNurseryAnchor,
  participantsForProjectAnchor,
  participantsForSupplyAnchor,
  sanitizeConversation,
  sanitizeMessage
} from '../src/services/conversations.service';

const buyer = '11111111-1111-4111-8111-111111111111';
const nursery = '22222222-2222-4222-8222-222222222222';
const supplier = '44444444-4444-4444-8444-444444444444';
const organizer = '55555555-5555-4555-8555-555555555555';
const stranger = '66666666-6666-4666-8666-666666666666';
const recordId = '77777777-7777-4777-8777-777777777777';

const asUser = (id: string, roles: string[]) => ({ id, roles });

describe('participant derivation', () => {
  test('quote and order threads include exactly the buyer and the nursery', () => {
    const ids = participantsForBuyerNurseryAnchor({ buyer_user_id: buyer, nursery_user_id: nursery });
    assert.deepEqual(ids.sort(), [buyer, nursery].sort());
  });

  test('a supply-gap thread includes the requester and every offering supplier, once each', () => {
    const ids = participantsForSupplyAnchor(
      { requester_user_id: nursery },
      [
        { supplier_user_id: supplier },
        { supplier_user_id: supplier },
        { supplier_user_id: buyer }
      ]
    );
    assert.deepEqual(ids.sort(), [buyer, nursery, supplier].sort());
  });

  test('a project thread includes the organizer and every supporter with a pledge', () => {
    const ids = participantsForProjectAnchor(
      { organizer_user_id: organizer },
      [{ supporter_user_id: buyer }, { supporter_user_id: nursery }]
    );
    assert.deepEqual(ids.sort(), [buyer, nursery, organizer].sort());
  });

  test('anchors with no counterparties yet still include their owner', () => {
    assert.deepEqual(participantsForSupplyAnchor({ requester_user_id: nursery }), [nursery]);
    assert.deepEqual(participantsForProjectAnchor({ organizer_user_id: organizer }), [organizer]);
  });
});

describe('message access control', () => {
  const participants = [buyer, nursery];

  test('participants can read and post whatever their role is', () => {
    assert.equal(canAccessConversation(participants, asUser(buyer, ['BUYER'])), true);
    assert.equal(canAccessConversation(participants, asUser(nursery, ['NURSERY_OWNER'])), true);
    assert.equal(canPostToConversation(participants, asUser(buyer, ['BUYER'])), true);
    assert.equal(canPostToConversation(participants, asUser(nursery, ['NURSERY_OWNER'])), true);
    assert.equal(isConversationParticipant(participants, buyer), true);
  });

  test('non-participants cannot read or post, whatever their role is', () => {
    for (const roles of [['BUYER'], ['NURSERY_OWNER'], ['PLANTATION_ORGANIZER'], ['DONOR_INVESTOR']]) {
      assert.equal(canAccessConversation(participants, asUser(stranger, roles)), false);
      assert.equal(canPostToConversation(participants, asUser(stranger, roles)), false);
    }
    assert.equal(isConversationParticipant(participants, stranger), false);
  });

  test('admins can read and post in any thread for moderation and support', () => {
    assert.equal(canAccessConversation(participants, asUser(stranger, ['ADMIN'])), true);
    assert.equal(canPostToConversation(participants, asUser(stranger, ['ADMIN'])), true);
    assert.equal(canAccessConversation([], asUser(stranger, ['ADMIN'])), true);
  });

  test('a supplier who has not offered yet is not a supply-gap participant', () => {
    const supplyParticipants = participantsForSupplyAnchor({ requester_user_id: nursery }, []);
    assert.equal(canAccessConversation(supplyParticipants, asUser(supplier, ['NURSERY_OWNER'])), false);
    const withOffer = participantsForSupplyAnchor({ requester_user_id: nursery }, [{ supplier_user_id: supplier }]);
    assert.equal(canAccessConversation(withOffer, asUser(supplier, ['NURSERY_OWNER'])), true);
  });

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
});

describe('conversation and message validation', () => {
  test('creating a thread requires a known workflow anchor and a uuid', () => {
    assert.equal(createConversationSchema.safeParse({ refType: 'QUOTE_REQUEST', refId: recordId }).success, true);
    assert.equal(createConversationSchema.safeParse({ refType: 'ORDER', refId: recordId }).success, true);
    assert.equal(createConversationSchema.safeParse({ refType: 'SUPPLY_GAP_REQUEST', refId: recordId }).success, true);
    assert.equal(createConversationSchema.safeParse({ refType: 'PROJECT', refId: recordId }).success, true);
    assert.equal(createConversationSchema.safeParse({ refType: 'LISTING', refId: recordId }).success, false);
    assert.equal(createConversationSchema.safeParse({ refType: 'QUOTE_REQUEST', refId: 'not-a-uuid' }).success, false);
    // The client can never name the participants itself.
    const parsed = createConversationSchema.parse({ refType: 'ORDER', refId: recordId, participantIds: [stranger] } as never);
    assert.equal('participantIds' in parsed, false);
  });

  test('messages must be non-empty and within the length limit, and are trimmed', () => {
    assert.equal(messageInputSchema.safeParse({ body: '' }).success, false);
    assert.equal(messageInputSchema.safeParse({ body: '   ' }).success, false);
    assert.equal(messageInputSchema.safeParse({ body: 'x'.repeat(2001) }).success, false);
    const parsed = messageInputSchema.parse({ body: '  Delivery is confirmed for Friday.  ' });
    assert.equal(parsed.body, 'Delivery is confirmed for Friday.');
  });

  test('thread titles name the workflow and the record', () => {
    assert.equal(conversationTitleFor('QUOTE_REQUEST', { listing: { name: 'Neem' } }), 'Quote request · Neem');
    assert.equal(conversationTitleFor('ORDER', { plant_name: 'Neem' }), 'Order · Neem');
    assert.equal(conversationTitleFor('SUPPLY_GAP_REQUEST', { plant_name: 'Mango' }), 'Supply gap · Mango');
    assert.equal(conversationTitleFor('PROJECT', { title: 'Lyari Green Belt' }), 'Project · Lyari Green Belt');
  });

  test('sanitizers whitelist thread and message fields only', () => {
    const message = sanitizeMessage({
      id: recordId, conversation_id: recordId, sender_user_id: buyer,
      body: 'Hello', created_at: '2026-10-21T00:00:00.000Z',
      sender_email: 'buyer@example.test', sender_password_hash: 'secret'
    } as Record<string, unknown>);
    assert.deepEqual(Object.keys(message).sort(), ['body', 'conversation_id', 'created_at', 'id', 'sender_user_id']);
    const thread = sanitizeConversation({
      id: recordId, ref_type: 'ORDER', ref_id: recordId,
      created_at: '2026-10-21T00:00:00.000Z', updated_at: '2026-10-21T01:00:00.000Z',
      created_by_user_id: buyer
    } as Record<string, unknown>);
    assert.equal('created_by_user_id' in thread, false);
  });
});
