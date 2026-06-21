import { HttpErrorResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import { ProfileComponent } from './profile';
import { ProfileOrder, ProfileOrderItem } from '../../services/auth.service';

describe('ProfileComponent order reviews', () => {
  const router = { navigate: vi.fn() };
  const cdr = { markForCheck: vi.fn(), detectChanges: vi.fn() };

  const authService = {
    getMyOrders: vi.fn(() => of({ body: [] })),
    getMyAddresses: vi.fn(() => of({ body: [] })),
    deleteAddress: vi.fn(() => of({ body: null })),
    createOrderProductReview: vi.fn(() => of({ body: { rating: 5, review: 'Great' } })),
    updateOrderProductReview: vi.fn(() => of({ body: { rating: 4, review: 'Updated' } }))
  };

  const order: ProfileOrder = {
    id: '101',
    date: '2026-06-21',
    total: '₹999',
    status: 'DELIVERED'
  };

  const textInputEvent = (value: string) => ({ target: { value } }) as unknown as Event;

  let component: ProfileComponent;

  beforeEach(() => {
    vi.clearAllMocks();
    component = new ProfileComponent(router as never, authService as never, cdr as never);
  });

  it('disables submit when canReview is false', () => {
    const item: ProfileOrderItem = { id: 1, productId: 1, productName: 'Dhyana', canReview: false };

    component.toggleItemReview(order, item, 0);
    component.setItemReviewRating(order, item, 0, 5);
    component.updateItemReviewText(order, item, 0, textInputEvent('Nice product'));

    expect(component.canSubmitItemReview(order, item, 0)).toBe(false);
  });

  it('prefills existing review and enters update mode', () => {
    const item: ProfileOrderItem = {
      id: 2,
      productId: 2,
      productName: 'Bloom',
      canReview: true,
      review: { rating: 4, review: 'Loved it' }
    };

    component.toggleItemReview(order, item, 0);

    expect(component.getItemReviewRating(order, item, 0)).toBe(4);
    expect(component.getItemReviewText(order, item, 0)).toBe('Loved it');
    expect(component.getReviewActionLabel(order, item, 0)).toBe('Update');
  });

  it('creates review when item has no existing review', () => {
    const item: ProfileOrderItem = { id: 3, productId: 3, productName: 'Breeze', canReview: true, review: null };

    component.toggleItemReview(order, item, 0);
    component.setItemReviewRating(order, item, 0, 5);
    component.updateItemReviewText(order, item, 0, textInputEvent('Excellent fragrance'));

    component.submitItemReview(order, item, 0);

    expect(authService.createOrderProductReview).toHaveBeenCalledWith(101, 3, {
      rating: 5,
      review: 'Excellent fragrance'
    });
    expect(authService.updateOrderProductReview).not.toHaveBeenCalled();
    expect(component.getItemReviewSuccess(order, item, 0)).toContain('posted');
  });

  it('updates review when item already has review', () => {
    const item: ProfileOrderItem = {
      id: 4,
      productId: 4,
      productName: 'Nirvaan',
      canReview: true,
      review: { rating: 3, review: 'Okay' }
    };

    component.toggleItemReview(order, item, 0);
    component.setItemReviewRating(order, item, 0, 4);
    component.updateItemReviewText(order, item, 0, textInputEvent('Now improved'));

    component.submitItemReview(order, item, 0);

    expect(authService.updateOrderProductReview).toHaveBeenCalledWith(101, 4, {
      rating: 4,
      review: 'Now improved'
    });
    expect(component.getItemReviewSuccess(order, item, 0)).toContain('updated');
  });

  it('falls back to update when create returns conflict', () => {
    authService.createOrderProductReview.mockReturnValueOnce(
      throwError(() => new HttpErrorResponse({ status: 409 }))
    );

    const item: ProfileOrderItem = {
      id: 5,
      productId: 5,
      productName: 'Vara',
      canReview: true,
      review: null
    };

    component.toggleItemReview(order, item, 0);
    component.setItemReviewRating(order, item, 0, 5);
    component.updateItemReviewText(order, item, 0, textInputEvent('Conflict fallback check'));

    component.submitItemReview(order, item, 0);

    expect(authService.createOrderProductReview).toHaveBeenCalled();
    expect(authService.updateOrderProductReview).toHaveBeenCalledWith(101, 5, {
      rating: 5,
      review: 'Conflict fallback check'
    });
  });

  it('rejects comments over 2000 characters', () => {
    const item: ProfileOrderItem = { id: 6, productId: 6, productName: 'Crème', canReview: true };

    component.toggleItemReview(order, item, 0);
    component.setItemReviewRating(order, item, 0, 5);
    component.updateItemReviewText(order, item, 0, textInputEvent('a'.repeat(2001)));

    expect(component.canSubmitItemReview(order, item, 0)).toBe(false);
  });
});
