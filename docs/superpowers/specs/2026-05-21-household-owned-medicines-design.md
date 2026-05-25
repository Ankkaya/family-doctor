# Household-Owned Medicines Design

## Goal

Families maintain their own medicine records directly. The system does not maintain a shared medicine master record for App use, does not audit user medicines, and Agent recommendations use only the current household cabinet data.

## Decisions

- App users can create, update, delete, and list medicines in the current household cabinet.
- Each household medicine stores its own medicine fields: name, aliases, OTC/RX type, indication, contraindication, adverse reaction, dosage, barcode, approval number, quantity, expiry, source, and notes.
- `medicine_catalog` may remain for historical/admin compatibility, but App cabinet and Agent recommendation flow do not depend on it.
- The admin "家庭药箱" page remains a read-only cross-household summary for troubleshooting and operations visibility.
- The admin "药品库" menu can remain as legacy/reference data, but it is no longer the source of truth for App cabinet records.

## Data Flow

1. App resolves the current household from the authenticated user and optional `X-Household-Id`.
2. App sends full medicine details to `POST /medicine/cabinet`.
3. Backend writes the details to `household_medicine_inventory` under the resolved `householdId`.
4. App edits and deletes by inventory id, scoped by household id.
5. Consultation reads candidate medicines from `household_medicine_inventory` for the current household and sends those records to the Agent.
6. Admin reads `GET /admin/household-medicines` as a read-only aggregate.

## Safety

- The Agent must only receive medicines from the current household.
- User-maintained medicine information should be treated as user-provided input.
- RX medicines remain available in the cabinet, but downstream recommendation logic should continue to avoid unsafe OTC/RX recommendations according to existing Agent rules.

## Verification

- Backend tests cover cabinet query/create/update/Agent candidate behavior without joining `medicine_catalog`.
- Backend build verifies DTO, service, controller, and Prisma typing.
- App build verifies the new create/update payloads and UI wiring.
- Admin build verifies the read-only household medicine summary still compiles.
