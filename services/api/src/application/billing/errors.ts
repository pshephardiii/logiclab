export class BillingError extends Error {
  constructor(
    public readonly reason:
      | 'instructor_required'
      | 'not_found'
      | 'plan_unavailable'
      | 'request_conflict'
      | 'invalid_event'
      | 'event_conflict'
      | 'invalid_signature',
  ) {
    super(reason);
  }
}
