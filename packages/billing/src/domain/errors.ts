/**
 * @openbulls/billing — domain error types.
 *
 * All errors extend `AppError` from `@openbulls/shared` so they can be
 * carried in `Result<T, E>` and JSON-serialized for API responses.
 *
 * Code conventions: `billing/<kebab-slug>`.
 */
import { AppError } from "@openbulls/shared";

export class BillingError extends AppError {
  readonly code = "billing/error";
}

export class InsufficientCreditsError extends AppError {
  readonly code = "billing/insufficient-credits";
  readonly data: { required: string; available: string };
  constructor(data: { required: string; available: string }) {
    super(`insufficient credits: need ${data.required}, have ${data.available}`);
    this.data = data;
  }
}

export class ReservationNotFoundError extends AppError {
  readonly code = "billing/reservation-not-found";
  constructor(readonly reservationId: string) {
    super(`reservation not found: ${reservationId}`);
  }
}

export class ReservationExpiredError extends AppError {
  readonly code = "billing/reservation-expired";
  constructor(readonly reservationId: string) {
    super(`reservation expired: ${reservationId}`);
  }
}

export class PricingNotFoundError extends AppError {
  readonly code = "billing/pricing-not-found";
  constructor(readonly modelKey: string) {
    super(`no active pricing for model: ${modelKey}`);
  }
}

export class PlanNotFoundError extends AppError {
  readonly code = "billing/plan-not-found";
  constructor(readonly planKey: string) {
    super(`plan not found: ${planKey}`);
  }
}

export class AlreadySubscribedError extends AppError {
  readonly code = "billing/already-subscribed";
  constructor(readonly userId: string) {
    super(`user ${userId} already has an active subscription`);
  }
}

export class PaymentFailedError extends AppError {
  readonly code = "billing/payment-failed";
  readonly data: { providerCode?: string; message: string };
  constructor(data: { providerCode?: string; message: string }) {
    super(`payment failed: ${data.message}`);
    this.data = data;
  }
}

export class WebhookSignatureError extends AppError {
  readonly code = "billing/webhook-signature-invalid";
  constructor(readonly provider: string) {
    super(`webhook signature verification failed: ${provider}`);
  }
}
