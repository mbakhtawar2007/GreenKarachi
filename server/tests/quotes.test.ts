import assert from 'node:assert/strict';
import test, { describe } from 'node:test';
import type { Response } from 'express';
import { requireAuth, requireRoles, type RequestWithUser } from '../src/middleware/auth';
import {
  canChangeOrderStatus,
  canTransitionOrder,
  canTransitionQuoteRequest,
  computeOrderTotals,
  findOpenDuplicate,
  hasSufficientStock,
  isOrderParticipant,
  isQuotationExpired,
  isQuoteParticipant,
  orderStatusInputSchema,
  quotationInputSchema,
  quoteRequestInputSchema,
  type QuoteRequestSummary
} from '../src/services/quotes.service';

const listingId = '11111111-1111-4111-8111-111111111111';

const validRequest = {
  listingId,
  quantity: 100,
  deliveryArea: 'Clifton, Karachi',
  deliveryDate: '2027-01-15',
  notes: 'For a school plantation drive.'
};

const validQuotation = {
  unitPrice: 250,
  quantity: 100,
  deliveryCharge: 5000,
  terms: 'Payment arranged directly between buyer and nursery. Delivery within 5 days.',
  validUntil: '2027-01-10T00:00:00.000Z'
};

describe('quote request validation', () => {
  test('accepts a valid quote request', () => {
    const parsed = quoteRequestInputSchema.parse(validRequest);
    assert.equal(parsed.quantity, 100);
    assert.equal(parsed.deliveryArea, 'Clifton, Karachi');
  });

  test('rejects non-positive, fractional, and malformed quantities and dates', () => {
    assert.equal(quoteRequestInputSchema.safeParse({ ...validRequest, quantity: 0 }).success, false);
    assert.equal(quoteRequestInputSchema.safeParse({ ...validRequest, quantity: -5 }).success, false);
    assert.equal(quoteRequestInputSchema.safeParse({ ...validRequest, quantity: 2.5 }).success, false);
    assert.equal(quoteRequestInputSchema.safeParse({ ...validRequest, deliveryDate: '15/01/2027' }).success, false);
    assert.equal(quoteRequestInputSchema.safeParse({ ...validRequest, listingId: 'not-a-uuid' }).success, false);
  });

  test('a quote request is not an order: the input creates no order or payment fields', () => {
    const parsed = quoteRequestInputSchema.parse({ ...validRequest, status: 'ACCEPTED', paid: true } as never);
    assert.equal('status' in parsed, false);
    assert.equal('paid' in parsed, false);
  });
});

describe('quotation validation', () => {
  test('accepts a valid quotation with price, quantity, delivery charge, and validity', () => {
    const parsed = quotationInputSchema.parse(validQuotation);
    assert.equal(parsed.unitPrice, 250);
    assert.equal(parsed.deliveryCharge, 5000);
  });

  test('rejects non-positive prices, negative delivery charges, and excess price precision', () => {
    assert.equal(quotationInputSchema.safeParse({ ...validQuotation, unitPrice: 0 }).success, false);
    assert.equal(quotationInputSchema.safeParse({ ...validQuotation, unitPrice: -10 }).success, false);
    assert.equal(quotationInputSchema.safeParse({ ...validQuotation, deliveryCharge: -1 }).success, false);
    assert.equal(quotationInputSchema.safeParse({ ...validQuotation, unitPrice: 10.999 }).success, false);
    assert.equal(quotationInputSchema.safeParse({ ...validQuotation, quantity: 0 }).success, false);
  });

  test('rejects a quotation without a valid expiration', () => {
    assert.equal(quotationInputSchema.safeParse({ ...validQuotation, validUntil: 'tomorrow' }).success, false);
    const { validUntil: _validUntil, ...withoutValidity } = validQuotation;
    assert.equal(quotationInputSchema.safeParse(withoutValidity).success, false);
  });
});

describe('quote expiration', () => {
  test('a quotation past its valid-until time is expired', () => {
    const now = new Date('2027-01-10T00:00:00.000Z');
    assert.equal(isQuotationExpired('2027-01-09T23:59:59.000Z', now), true);
    assert.equal(isQuotationExpired('2027-01-10T00:00:00.000Z', now), true);
    assert.equal(isQuotationExpired('2027-01-11T00:00:00.000Z', now), false);
  });
});

describe('duplicate quote requests', () => {
  const open: QuoteRequestSummary[] = [
    { listing_id: listingId, quantity: 100, delivery_date: '2027-01-15', status: 'PENDING' },
    { listing_id: listingId, quantity: 50, delivery_date: '2027-01-15', status: 'CANCELLED' }
  ];

  test('detects a duplicate open request for the same listing, quantity, and date', () => {
    const duplicate = findOpenDuplicate(open, { listing_id: listingId, quantity: 100, delivery_date: '2027-01-15', status: 'PENDING' });
    assert.ok(duplicate);
  });

  test('allows a different quantity and ignores cancelled requests', () => {
    assert.equal(findOpenDuplicate(open, { listing_id: listingId, quantity: 60, delivery_date: '2027-01-15', status: 'PENDING' }), undefined);
    assert.equal(findOpenDuplicate(open, { listing_id: listingId, quantity: 50, delivery_date: '2027-01-15', status: 'PENDING' }), undefined);
  });
});

describe('stock checks', () => {
  test('acceptance requires enough available stock', () => {
    assert.equal(hasSufficientStock(100, 100), true);
    assert.equal(hasSufficientStock(60, 100), false);
    assert.equal(hasSufficientStock(0, 1), false);
  });

  test('order totals snapshot unit price, quantity, and delivery charge without floating point drift', () => {
    assert.deepEqual(computeOrderTotals(250, 100, 5000), { subtotal: 25000, total: 30000 });
    assert.deepEqual(computeOrderTotals(125.5, 3, 0), { subtotal: 376.5, total: 376.5 });
    assert.deepEqual(computeOrderTotals(0.1, 3, 0.05), { subtotal: 0.3, total: 0.35 });
  });
});

describe('status transitions', () => {
  test('quote requests follow the request-to-quote-to-order lifecycle', () => {
    assert.equal(canTransitionQuoteRequest('PENDING', 'QUOTED'), true);
    assert.equal(canTransitionQuoteRequest('QUOTED', 'ACCEPTED'), true);
    assert.equal(canTransitionQuoteRequest('PENDING', 'ACCEPTED'), false);
    assert.equal(canTransitionQuoteRequest('ACCEPTED', 'CANCELLED'), false);
    assert.equal(canTransitionQuoteRequest('CANCELLED', 'QUOTED'), false);
    assert.equal(canTransitionQuoteRequest('EXPIRED', 'ACCEPTED'), false);
  });

  test('quote requests can be cancelled or declined while open only', () => {
    assert.equal(canTransitionQuoteRequest('PENDING', 'CANCELLED'), true);
    assert.equal(canTransitionQuoteRequest('QUOTED', 'CANCELLED'), true);
    assert.equal(canTransitionQuoteRequest('QUOTED', 'DECLINED'), true);
    assert.equal(canTransitionQuoteRequest('ACCEPTED', 'DECLINED'), false);
  });

  test('orders can be fulfilled or cancelled only from confirmed', () => {
    assert.equal(canTransitionOrder('CONFIRMED', 'FULFILLED'), true);
    assert.equal(canTransitionOrder('CONFIRMED', 'CANCELLED'), true);
    assert.equal(canTransitionOrder('FULFILLED', 'CANCELLED'), false);
    assert.equal(canTransitionOrder('CANCELLED', 'FULFILLED'), false);
  });

  test('order status input only allows fulfilment or cancellation', () => {
    assert.equal(orderStatusInputSchema.safeParse({ status: 'FULFILLED' }).success, true);
    assert.equal(orderStatusInputSchema.safeParse({ status: 'CONFIRMED' }).success, false);
    assert.equal(orderStatusInputSchema.safeParse({ status: 'PAID' }).success, false);
  });
});

describe('participants and unauthorized access', () => {
  const order = { buyer_user_id: 'buyer-1', nursery_user_id: 'nursery-1', status: 'CONFIRMED' as const };

  test('only the buyer and the nursery are quote or order participants', () => {
    const request = { buyer_user_id: 'buyer-1', nursery_user_id: 'nursery-1' };
    assert.equal(isQuoteParticipant(request, 'buyer-1'), true);
    assert.equal(isQuoteParticipant(request, 'nursery-1'), true);
    assert.equal(isQuoteParticipant(request, 'stranger'), false);
    assert.equal(isOrderParticipant(order, 'stranger'), false);
  });

  test('only the nursery can fulfil an order, while either participant can cancel a confirmed one', () => {
    assert.equal(canChangeOrderStatus(order, 'nursery-1', 'FULFILLED'), true);
    assert.equal(canChangeOrderStatus(order, 'buyer-1', 'FULFILLED'), false);
    assert.equal(canChangeOrderStatus(order, 'buyer-1', 'CANCELLED'), true);
    assert.equal(canChangeOrderStatus(order, 'nursery-1', 'CANCELLED'), true);
    assert.equal(canChangeOrderStatus(order, 'stranger', 'CANCELLED'), false);
  });

  test('a fulfilled or cancelled order cannot change status again', () => {
    assert.equal(canChangeOrderStatus({ ...order, status: 'FULFILLED' }, 'nursery-1', 'CANCELLED'), false);
    assert.equal(canChangeOrderStatus({ ...order, status: 'CANCELLED' }, 'buyer-1', 'CANCELLED'), false);
  });

  test('unauthenticated requests are rejected by requireAuth', () => {
    let statusCode = 200;
    let continued = false;
    const response = {
      status(code: number) { statusCode = code; return this; },
      json() { return this; }
    } as unknown as Response;
    const request = { headers: {} } as RequestWithUser;

    requireAuth(request, response, () => { continued = true; });

    assert.equal(statusCode, 401);
    assert.equal(continued, false);
  });

  test('a nursery owner is rejected from buyer-only endpoints and a buyer from nursery-only ones', () => {
    const makeResponse = () => {
      const state = { statusCode: 200 };
      const response = {
        status(code: number) { state.statusCode = code; return this; },
        json() { return this; }
      } as unknown as Response;
      return { state, response };
    };

    const nursery = makeResponse();
    let nurseryContinued = false;
    requireRoles('BUYER')(
      { user: { id: 'nursery-1', email: 'n@example.test', name: 'Nursery', roles: ['NURSERY_OWNER'] } } as RequestWithUser,
      nursery.response,
      () => { nurseryContinued = true; }
    );
    assert.equal(nursery.state.statusCode, 403);
    assert.equal(nurseryContinued, false);

    const buyer = makeResponse();
    let buyerContinued = false;
    requireRoles('NURSERY_OWNER')(
      { user: { id: 'buyer-1', email: 'b@example.test', name: 'Buyer', roles: ['BUYER'] } } as RequestWithUser,
      buyer.response,
      () => { buyerContinued = true; }
    );
    assert.equal(buyer.state.statusCode, 403);
    assert.equal(buyerContinued, false);
  });
});
