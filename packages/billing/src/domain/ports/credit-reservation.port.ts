/**
 * @openbulls/billing — credit-reservation port (re-export).
 *
 * The repository is owned by `@openbulls/db`; we re-export the type
 * here so consumers can `import { ICreditReservationRepository }
 * from "@openbulls/billing"` without reaching into the DB layer.
 */
export type {
  ICreditReservationRepository,
  CreateReservationInput,
  UpdateReservationInput,
} from "@openbulls/db/repositories";
