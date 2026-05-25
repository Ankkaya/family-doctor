# Household-Owned Medicines Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make family cabinet medicines fully user-maintained records and keep the admin household medicine page as a read-only summary.

**Architecture:** Store medicine details directly on `household_medicine_inventory`, stop joining `medicine_catalog` in cabinet reads and Agent candidate reads, and update App DTOs to send full medicine details. Keep the existing global medicine catalog module as legacy/admin reference data only.

**Tech Stack:** NestJS, Prisma/PostgreSQL, Jest, React/TypeScript Tauri App, Vue3/Naive UI admin.

---

### Task 1: Backend Cabinet Tests

**Files:**
- Modify: `backend/src/domains/family-doctor/cabinet/cabinet.service.spec.ts`

- [ ] Add tests asserting cabinet list and Agent candidate SQL reads `household_medicine_inventory` directly and does not join `medicine_catalog`.
- [ ] Add tests asserting create inserts user-provided medicine fields into household inventory.
- [ ] Add tests asserting update can change medicine details and inventory details.
- [ ] Run `pnpm --dir backend jest src/domains/family-doctor/cabinet/cabinet.service.spec.ts --runInBand` and verify the new tests fail before production code changes.

### Task 2: Backend Schema And DTOs

**Files:**
- Modify: `backend/prisma/schema.prisma`
- Add: `backend/prisma/migrations/20260521000000_household_owned_medicines/migration.sql`
- Modify: `backend/src/domains/family-doctor/cabinet/dto/create-cabinet-inventory.dto.ts`
- Modify: `backend/src/domains/family-doctor/cabinet/dto/update-cabinet-inventory.dto.ts`

- [ ] Add nullable medicine detail columns to `household_medicine_inventory`.
- [ ] Backfill new columns from `medicine_catalog` for existing rows.
- [ ] Keep existing `medicine_id` nullable for migration compatibility, but stop requiring it in App DTOs.
- [ ] Require `name`, `otc`, and `indication` on create; make all medicine details optional on update.

### Task 3: Backend Cabinet Service

**Files:**
- Modify: `backend/src/domains/family-doctor/cabinet/cabinet.service.ts`
- Modify: `backend/src/domains/family-doctor/medicine/medicine.types.ts`

- [ ] Read cabinet rows directly from `household_medicine_inventory`.
- [ ] Create cabinet rows with user-provided medicine details.
- [ ] Update medicine details and inventory metadata scoped by `inventoryId` and `householdId`.
- [ ] Feed Agent candidates from current household inventory only.
- [ ] Keep admin household medicine list read-only and searchable by household/user/medicine details.
- [ ] Run the cabinet Jest test and verify it passes.

### Task 4: App API And UI

**Files:**
- Modify: `app/src/shared/api/app-api.ts`
- Modify: `app/src/stores/useAppStore.ts`
- Modify: `app/src/features/intake/EntryMethods.tsx`

- [ ] Change App add-cabinet API input from `medicineId` to full medicine details.
- [ ] Save recognized/manual medicine details as household-owned records.
- [ ] Keep list/detail rendering compatible with returned cabinet rows.
- [ ] Run `npm --prefix app run build`.

### Task 5: Admin Read-Only Summary

**Files:**
- Modify: `frontend/src/api/family-doctor.ts`
- Modify: `frontend/src/views/family-doctor/household-medicines/index.vue`
- Optionally modify: `frontend/src/views/family-doctor/medicines/index.vue`

- [ ] Keep `getAdminHouseholdMedicines` as the admin read-only aggregation endpoint.
- [ ] Ensure the household medicine page presents family/user-owned medicines, not catalog-backed records.
- [ ] Add UI copy only if needed to clarify this is read-only.
- [ ] Run `pnpm --dir frontend build`.

### Task 6: Verification

**Files:**
- Read all modified files.

- [ ] Run backend cabinet Jest test.
- [ ] Run backend build.
- [ ] Run App build.
- [ ] Run admin build.
- [ ] Report any verification command that cannot run and why.
