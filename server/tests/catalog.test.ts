import assert from 'node:assert/strict';
import test, { describe } from 'node:test';
import type { Response } from 'express';
import { requireRoles, type RequestWithUser } from '../src/middleware/auth';
import { listingFilterSchema, listingInputSchema, nurseryFilterSchema } from '../src/services/catalog.service';

const validListing = {
  name: 'Neem',
  species: 'Azadirachta indica',
  category: 'Native tree',
  unitPrice: 125.5,
  availableQuantity: 40,
  minimumOrderQuantity: 2,
  imageUrls: ['https://images.example.test/neem.jpg']
};

describe('catalog validation', () => {
  test('accepts a valid listing including a zero-stock listing', () => {
    const parsed = listingInputSchema.parse({ ...validListing, availableQuantity: 0 });
    assert.equal(parsed.availableQuantity, 0);
  });

  test('rejects negative stock and non-positive prices', () => {
    assert.equal(listingInputSchema.safeParse({ ...validListing, availableQuantity: -1 }).success, false);
    assert.equal(listingInputSchema.safeParse({ ...validListing, unitPrice: 0 }).success, false);
  });

  test('rejects image URLs with unsafe protocols and prices with excess precision', () => {
    assert.equal(listingInputSchema.safeParse({ ...validListing, imageUrls: ['javascript:alert(1)'] }).success, false);
    assert.equal(listingInputSchema.safeParse({ ...validListing, unitPrice: 1.239 }).success, false);
  });

  test('coerces pagination and rejects inverted filter ranges', () => {
    const filters = listingFilterSchema.parse({ page: '2', pageSize: '24', minPrice: '10', maxPrice: '20' });
    assert.equal(filters.page, 2);
    assert.equal(filters.pageSize, 24);
    assert.equal(listingFilterSchema.safeParse({ minQuantity: '10', maxQuantity: '2' }).success, false);
  });

  test('validates nursery-directory search and pagination filters', () => {
    const filters = nurseryFilterSchema.parse({ location: 'Karachi', verified: 'true', page: '3' });
    assert.equal(filters.page, 3);
    assert.equal(filters.location, 'Karachi');
    assert.equal(filters.verified, 'true');
  });
});

describe('catalog route authorization', () => {
  test('rejects a buyer from nursery-owner endpoints', () => {
    let statusCode = 200;
    let continued = false;
    const response = {
      status(code: number) { statusCode = code; return this; },
      json() { return this; }
    } as unknown as Response;
    const request = { user: { id: 'buyer-1', email: 'buyer@example.test', name: 'Buyer', roles: ['BUYER'] } } as RequestWithUser;

    requireRoles('NURSERY_OWNER')(request, response, () => { continued = true; });

    assert.equal(statusCode, 403);
    assert.equal(continued, false);
  });
});