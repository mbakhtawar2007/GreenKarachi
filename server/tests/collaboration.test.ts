import assert from 'node:assert/strict';
import test, { describe } from 'node:test';
import type { Response } from 'express';
import { requireAuth, requireRoles, type RequestWithUser } from '../src/middleware/auth';
import {
  canAcceptOffer,
  canTransitionSupplyGapRequest,
  canTransitionSupplyOffer,
  computeQuantityNeeded,
  findPendingOfferFromSupplier,
  isEligibleSupplier,
  isOfferSupplier,
  isOpenForOffers,
  isRequester,
  remainingGap,
  simulateConcurrentAcceptances,
  summarizeOffers,
  supplyGapRequestInputSchema,
  supplyGapRequestStatusInputSchema,
  supplyOfferInputSchema,
  type SupplyOfferStatus
} from '../src/services/collaboration.service';

const validRequest = {
  plantName: 'Neem',
  species: 'Azadirachta indica',
  totalRequired: 100,
  stockAvailable: 60,
  requirements: 'Healthy saplings, at least 3 feet tall.',
  neededBy: '2027-02-01',
  area: 'Clifton, Karachi',
  notes: 'For a school plantation drive.'
};

const validOffer = {
  quantity: 25,
  unitPrice: 300,
  availabilityCondition: 'Ready now, 3-4 feet tall, in grow bags.',
  deliveryArrangement: 'Supplier delivers to Clifton within 3 days.',
  notes: ''
};

const offer = (quantity: number, status: SupplyOfferStatus) => ({ quantity, status });

describe('supply gap request validation', () => {
  test('accepts a valid supply gap request', () => {
    const parsed = supplyGapRequestInputSchema.parse(validRequest);
    assert.equal(parsed.totalRequired, 100);
    assert.equal(parsed.stockAvailable, 60);
  });

  test('rejects fractional or negative quantities and malformed dates', () => {
    assert.equal(supplyGapRequestInputSchema.safeParse({ ...validRequest, totalRequired: 0 }).success, false);
    assert.equal(supplyGapRequestInputSchema.safeParse({ ...validRequest, totalRequired: 2.5 }).success, false);
    assert.equal(supplyGapRequestInputSchema.safeParse({ ...validRequest, stockAvailable: -1 }).success, false);
    assert.equal(supplyGapRequestInputSchema.safeParse({ ...validRequest, stockAvailable: 1.5 }).success, false);
    assert.equal(supplyGapRequestInputSchema.safeParse({ ...validRequest, neededBy: '01/02/2027' }).success, false);
    assert.equal(supplyGapRequestInputSchema.safeParse({ ...validRequest, plantName: '' }).success, false);
    assert.equal(supplyGapRequestInputSchema.safeParse({ ...validRequest, area: '' }).success, false);
  });

  test('a client-supplied quantityNeeded is ignored: the gap is derived on the server', () => {
    const parsed = supplyGapRequestInputSchema.parse({ ...validRequest, quantityNeeded: 999 } as never);
    assert.equal('quantityNeeded' in parsed, false);
  });

  test('request status input only allows closing or cancelling', () => {
    assert.equal(supplyGapRequestStatusInputSchema.safeParse({ status: 'CLOSED' }).success, true);
    assert.equal(supplyGapRequestStatusInputSchema.safeParse({ status: 'FULFILLED' }).success, false);
    assert.equal(supplyGapRequestStatusInputSchema.safeParse({ status: 'OPEN' }).success, false);
  });
});

describe('quantity needed calculation', () => {
  test('the demo scenario: 100 required and 60 available creates a 40 gap', () => {
    assert.equal(computeQuantityNeeded(100, 60), 40);
  });

  test('zero gap when the nursery already has enough stock', () => {
    assert.equal(computeQuantityNeeded(60, 60), 0);
    assert.equal(computeQuantityNeeded(50, 80), 0);
  });

  test('full gap when the nursery has no stock at all', () => {
    assert.equal(computeQuantityNeeded(100, 0), 100);
  });
});

describe('supply offer validation', () => {
  test('accepts a valid offer with a positive integer quantity and a price', () => {
    const parsed = supplyOfferInputSchema.parse(validOffer);
    assert.equal(parsed.quantity, 25);
    assert.equal(parsed.unitPrice, 300);
  });

  test('rejects zero, negative, and fractional offer quantities', () => {
    assert.equal(supplyOfferInputSchema.safeParse({ ...validOffer, quantity: 0 }).success, false);
    assert.equal(supplyOfferInputSchema.safeParse({ ...validOffer, quantity: -5 }).success, false);
    assert.equal(supplyOfferInputSchema.safeParse({ ...validOffer, quantity: 2.5 }).success, false);
  });

  test('rejects non-positive prices, excess price precision, and missing delivery details', () => {
    assert.equal(supplyOfferInputSchema.safeParse({ ...validOffer, unitPrice: 0 }).success, false);
    assert.equal(supplyOfferInputSchema.safeParse({ ...validOffer, unitPrice: -10 }).success, false);
    assert.equal(supplyOfferInputSchema.safeParse({ ...validOffer, unitPrice: 10.999 }).success, false);
    assert.equal(supplyOfferInputSchema.safeParse({ ...validOffer, availabilityCondition: '' }).success, false);
    assert.equal(supplyOfferInputSchema.safeParse({ ...validOffer, deliveryArrangement: '' }).success, false);
  });
});

describe('committed supply and remaining gap', () => {
  test('pending offers do not count as committed supply', () => {
    const summary = summarizeOffers(40, [offer(25, 'PENDING'), offer(15, 'PENDING')]);
    assert.deepEqual(summary, {
      quantity_needed: 40,
      offered_quantity: 40,
      committed_quantity: 0,
      remaining_gap: 40
    });
  });

  test('partial fulfillment: only the accepted part reduces the remaining gap', () => {
    const summary = summarizeOffers(40, [offer(25, 'ACCEPTED'), offer(15, 'PENDING')]);
    assert.equal(summary.committed_quantity, 25);
    assert.equal(summary.remaining_gap, 15);
  });

  test('multiple suppliers: offers of 25 and 15 accepted cover the 40 gap exactly', () => {
    const summary = summarizeOffers(40, [offer(25, 'ACCEPTED'), offer(15, 'ACCEPTED')]);
    assert.equal(summary.committed_quantity, 40);
    assert.equal(summary.remaining_gap, 0);
  });

  test('rejected and withdrawn offers count toward nothing', () => {
    const summary = summarizeOffers(40, [
      offer(25, 'REJECTED'),
      offer(15, 'WITHDRAWN'),
      offer(10, 'ACCEPTED')
    ]);
    assert.equal(summary.offered_quantity, 0);
    assert.equal(summary.committed_quantity, 10);
    assert.equal(summary.remaining_gap, 30);
  });

  test('remaining gap never goes negative', () => {
    assert.equal(remainingGap(40, 40), 0);
    assert.equal(remainingGap(40, 55), 0);
    assert.equal(remainingGap(0, 0), 0);
  });
});

describe('offer acceptance rules and overcommit prevention', () => {
  const openRequest = { status: 'OPEN' as const, quantity_needed: 40 };

  test('accepts an offer that exactly fills the remaining gap', () => {
    assert.equal(canAcceptOffer(openRequest, 25, offer(15, 'PENDING')), true);
    assert.equal(canAcceptOffer(openRequest, 0, offer(40, 'PENDING')), true);
  });

  test('rejects an acceptance that would overcommit the request', () => {
    assert.equal(canAcceptOffer(openRequest, 25, offer(16, 'PENDING')), false);
    assert.equal(canAcceptOffer(openRequest, 40, offer(1, 'PENDING')), false);
  });

  test('rejects acceptance against a zero-gap request', () => {
    assert.equal(canAcceptOffer({ status: 'OPEN', quantity_needed: 0 }, 0, offer(1, 'PENDING')), false);
  });

  test('rejects offers against closed, fulfilled, and cancelled requests', () => {
    assert.equal(isOpenForOffers('OPEN'), true);
    assert.equal(isOpenForOffers('FULFILLED'), false);
    assert.equal(isOpenForOffers('CLOSED'), false);
    assert.equal(isOpenForOffers('CANCELLED'), false);
    assert.equal(canAcceptOffer({ status: 'CLOSED', quantity_needed: 40 }, 0, offer(10, 'PENDING')), false);
    assert.equal(canAcceptOffer({ status: 'FULFILLED', quantity_needed: 40 }, 40, offer(10, 'PENDING')), false);
  });

  test('only pending offers can be accepted', () => {
    assert.equal(canAcceptOffer(openRequest, 0, offer(10, 'ACCEPTED')), false);
    assert.equal(canAcceptOffer(openRequest, 0, offer(10, 'REJECTED')), false);
    assert.equal(canAcceptOffer(openRequest, 0, offer(10, 'WITHDRAWN')), false);
  });

  test('concurrent acceptance: two nurseries racing for the same capacity cannot both claim it', () => {
    // Gap of 40, two simultaneous acceptances of 25 each. One claim wins,
    // the second is re-validated against the remaining 15 and rejected.
    const { results, committed } = simulateConcurrentAcceptances(40, 0, [25, 25]);
    assert.deepEqual(results, [true, false]);
    assert.equal(committed, 25);
  });

  test('concurrent acceptance: the demo offers of 25 and 15 both fit, a third racing offer does not', () => {
    const { results, committed } = simulateConcurrentAcceptances(40, 0, [25, 15, 10]);
    assert.deepEqual(results, [true, true, false]);
    assert.equal(committed, 40);
  });

  test('concurrent acceptance: committed supply never exceeds the gap in any claim order', () => {
    for (const order of [[30, 30, 30], [40, 40], [10, 20, 30, 40], [15, 25, 15, 25]]) {
      const { committed } = simulateConcurrentAcceptances(40, 0, order);
      assert.ok(committed <= 40, `committed ${committed} exceeded gap for order ${order.join(',')}`);
    }
    const exact = simulateConcurrentAcceptances(40, 15, [25]);
    assert.deepEqual(exact.results, [true]);
    assert.equal(exact.committed, 40);
  });
});

describe('offer and request status transitions', () => {
  test('offers move only from pending to a terminal state', () => {
    assert.equal(canTransitionSupplyOffer('PENDING', 'ACCEPTED'), true);
    assert.equal(canTransitionSupplyOffer('PENDING', 'REJECTED'), true);
    assert.equal(canTransitionSupplyOffer('PENDING', 'WITHDRAWN'), true);
    assert.equal(canTransitionSupplyOffer('ACCEPTED', 'WITHDRAWN'), false);
    assert.equal(canTransitionSupplyOffer('REJECTED', 'ACCEPTED'), false);
    assert.equal(canTransitionSupplyOffer('WITHDRAWN', 'ACCEPTED'), false);
  });

  test('requests close, cancel, or fulfil only from open', () => {
    assert.equal(canTransitionSupplyGapRequest('OPEN', 'FULFILLED'), true);
    assert.equal(canTransitionSupplyGapRequest('OPEN', 'CLOSED'), true);
    assert.equal(canTransitionSupplyGapRequest('OPEN', 'CANCELLED'), true);
    assert.equal(canTransitionSupplyGapRequest('FULFILLED', 'CLOSED'), false);
    assert.equal(canTransitionSupplyGapRequest('CLOSED', 'CANCELLED'), false);
    assert.equal(canTransitionSupplyGapRequest('CANCELLED', 'CLOSED'), false);
  });
});

describe('eligibility and unauthorized offers', () => {
  const request = { requester_user_id: 'nursery-a' };

  test('the requester cannot offer on their own request, other nurseries can', () => {
    assert.equal(isEligibleSupplier(request, 'nursery-a'), false);
    assert.equal(isEligibleSupplier(request, 'nursery-b'), true);
    assert.equal(isRequester(request, 'nursery-a'), true);
    assert.equal(isRequester(request, 'nursery-b'), false);
  });

  test('only the supplier who made an offer can withdraw it', () => {
    const myOffer = { supplier_user_id: 'nursery-b' };
    assert.equal(isOfferSupplier(myOffer, 'nursery-b'), true);
    assert.equal(isOfferSupplier(myOffer, 'nursery-c'), false);
  });

  test('a supplier with a live pending offer cannot submit a second one', () => {
    const offers = [
      { supplier_user_id: 'nursery-b', status: 'PENDING' },
      { supplier_user_id: 'nursery-c', status: 'REJECTED' }
    ];
    assert.ok(findPendingOfferFromSupplier(offers, 'nursery-b'));
    assert.equal(findPendingOfferFromSupplier(offers, 'nursery-c'), undefined);
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

  test('buyers and other non-nursery roles are rejected from collaboration endpoints', () => {
    const makeResponse = () => {
      const state = { statusCode: 200 };
      const response = {
        status(code: number) { state.statusCode = code; return this; },
        json() { return this; }
      } as unknown as Response;
      return { state, response };
    };

    const buyer = makeResponse();
    let buyerContinued = false;
    requireRoles('NURSERY_OWNER')(
      { user: { id: 'buyer-1', email: 'b@example.test', name: 'Buyer', roles: ['BUYER'] } } as RequestWithUser,
      buyer.response,
      () => { buyerContinued = true; }
    );
    assert.equal(buyer.state.statusCode, 403);
    assert.equal(buyerContinued, false);

    const nursery = makeResponse();
    let nurseryContinued = false;
    requireRoles('NURSERY_OWNER')(
      { user: { id: 'nursery-1', email: 'n@example.test', name: 'Nursery', roles: ['NURSERY_OWNER'] } } as RequestWithUser,
      nursery.response,
      () => { nurseryContinued = true; }
    );
    assert.equal(nursery.state.statusCode, 200);
    assert.equal(nurseryContinued, true);
  });
});
