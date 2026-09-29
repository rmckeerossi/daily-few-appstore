import { scheduledAction, type ScheduleHandlerArgs } from "~stencil/internal";

/**
 * Trusted inbound route for platform-triggered recurring actions.
 *
 * The Stencil platform evaluates each app's schedule on its cron tick and, when
 * one fires, POSTs here through the dispatch namespace with:
 *   - `Authorization: Bearer <SCHEDULE_TRIGGER_SECRET>`  (the injected secret)
 *   - `x-stencil-schedule-name: <name>`                  (which schedule fired)
 *   - `x-stencil-schedule-cron: <expression>`            (its cron, for context)
 *
 * The platform is only the trigger. `scheduledAction` (from `~stencil/internal`)
 * owns the platform side — bearer verification and handler dispatch: it acks 202
 * immediately and runs the handler in the background, so the work is not bounded
 * by the trigger request. A handler failure is logged as `[schedule:<name>] failed`
 * and surfaces in the app's error log; the platform never learns the result.
 *
 * Delivery is best-effort: a scheduled run can be missed, and a transient dispatch
 * failure (timeout, 5xx) is retried once — so a run can also arrive twice. Handlers
 * MUST therefore be idempotent (safe to run twice) and MUST guard against overlap —
 * a slow job can still be running when the next tick arrives (e.g. check/stamp a
 * `last_run_at` row before doing work).
 */

/**
 * Map of schedule `name` → handler. Add one entry per recurring action; the
 * `name` must match the `name` in `app/schedules.ts` (the declarative manifest
 * the platform reconciles into its registry). Keep each handler idempotent.
 *
 * Example:
 *
 *   const SCHEDULE_HANDLERS = {
 *     "refresh-events": async ({ env }) => {
 *       const db = createDb(env);
 *       // ...fetch and upsert; upsert (not insert) keeps it idempotent.
 *     },
 *   } satisfies Record<string, (args: ScheduleHandlerArgs) => Promise<void>>;
 */
const SCHEDULE_HANDLERS = {} satisfies Record<
  string,
  (args: ScheduleHandlerArgs) => Promise<void>
>;

export const action = scheduledAction(SCHEDULE_HANDLERS);
