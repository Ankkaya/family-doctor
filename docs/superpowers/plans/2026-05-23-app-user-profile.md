# App User Profile Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add AppUser-bound personal profile settings in the app and read-only profile viewing in the admin backend.

**Architecture:** Store profile fields directly on `AppUser`, expose a current-user profile update endpoint under app auth, then thread those fields through the React app store and Vue admin App 用户 view. The mobile app owns profile editing; admin only reads the data.

**Tech Stack:** Prisma/PostgreSQL, NestJS DTO/controller/service tests, React + Zustand + TypeScript app, Vue 3 + Naive UI admin frontend.

---

## File Structure

- Modify `backend/prisma/schema.prisma`: add nullable profile columns to `AppUser`.
- Create `backend/prisma/migrations/20260523000000_add_app_user_profile/migration.sql`: add database columns.
- Create `backend/src/domains/app-auth/dto/update-app-profile.dto.ts`: request validation for app profile updates.
- Modify `backend/src/domains/app-auth/app-auth.service.ts`: include profile fields in auth responses and update current user profile.
- Modify `backend/src/domains/app-auth/app-auth.controller.ts`: add `PATCH /app/auth/profile`.
- Modify `backend/src/domains/app-auth/app-auth.service.spec.ts`: add failing tests first for profile update behavior.
- Modify `backend/src/domains/app-users/app-users.service.ts`: include profile fields in admin queries.
- Modify `frontend/src/api/family-doctor.ts`: add profile fields to `AdminAppUser`.
- Modify `frontend/src/views/family-doctor/app-users/index.vue`: add read-only profile detail modal.
- Modify `app/src/shared/api/app-api.ts`: add profile fields/types and `updateProfile`.
- Modify `app/src/stores/useAppStore.ts`: add profile settings screen and `updateProfile`.
- Create `app/src/features/family/ProfileSettingsScreen.tsx`: app profile form.
- Modify `app/src/features/family/ProfileCenter.tsx`: add profile summary and edit entry.
- Modify `app/src/pages/home/HomePage.tsx`: route to the new screen.

### Task 1: Backend AppUser Profile Persistence

**Files:**
- Modify: `backend/prisma/schema.prisma`
- Create: `backend/prisma/migrations/20260523000000_add_app_user_profile/migration.sql`
- Create: `backend/src/domains/app-auth/dto/update-app-profile.dto.ts`
- Modify: `backend/src/domains/app-auth/app-auth.service.spec.ts`
- Modify: `backend/src/domains/app-auth/app-auth.service.ts`
- Modify: `backend/src/domains/app-auth/app-auth.controller.ts`

- [ ] **Step 1: Write failing service tests**

Add tests to `backend/src/domains/app-auth/app-auth.service.spec.ts` that expect `updateProfile` to update the authenticated `AppUser` fields and normalize empty strings to `null`.

- [ ] **Step 2: Run the failing tests**

Run: `cd backend; npm test -- app-auth.service.spec.ts`

Expected: FAIL because `updateProfile` does not exist yet.

- [ ] **Step 3: Add Prisma fields and migration**

Add to `AppUser` in `backend/prisma/schema.prisma`:

```prisma
  age                Int?
  gender             String?
  allergies          String?
  medicationHistory  String?   @map("medication_history")
```

Create `backend/prisma/migrations/20260523000000_add_app_user_profile/migration.sql`:

```sql
ALTER TABLE "app_user"
  ADD COLUMN "age" INTEGER,
  ADD COLUMN "gender" TEXT,
  ADD COLUMN "allergies" TEXT,
  ADD COLUMN "medication_history" TEXT;
```

- [ ] **Step 4: Add DTO and app auth endpoint**

Create `UpdateAppProfileDto` with optional `avatarUrl`, `age`, `gender`, `allergies`, and `medicationHistory`; add `PATCH /app/auth/profile` using `AppJwtAuthGuard` and current request user.

- [ ] **Step 5: Implement profile update in service**

Add `updateProfile(userId, dto)` to update only the current `AppUser`, normalize empty text to `null`, and return the same user shape as auth responses.

- [ ] **Step 6: Run backend app-auth tests**

Run: `cd backend; npm test -- app-auth.service.spec.ts`

Expected: PASS.

### Task 2: Admin Read-Only Profile Visibility

**Files:**
- Modify: `backend/src/domains/app-users/app-users.service.ts`
- Modify: `frontend/src/api/family-doctor.ts`
- Modify: `frontend/src/views/family-doctor/app-users/index.vue`

- [ ] **Step 1: Write or extend backend expectation**

Extend App users service tests if present to assert admin rows include `age`, `gender`, `allergies`, and `medicationHistory`.

- [ ] **Step 2: Run the focused backend test**

Run: `cd backend; npm test -- app-users.service.spec.ts`

Expected: FAIL until the admin query selects the new columns.

- [ ] **Step 3: Include profile fields in admin query**

Add these columns to `SELECT_APP_USER_COLUMNS`:

```sql
  u.age,
  u.gender,
  u.allergies,
  u.medication_history as "medicationHistory",
```

- [ ] **Step 4: Add admin frontend types and modal**

Add the fields to `AdminAppUser` and add a read-only "详情" action in `frontend/src/views/family-doctor/app-users/index.vue` that opens a modal with avatar, age, gender label, allergy history, and medication history.

- [ ] **Step 5: Verify admin build**

Run: `cd frontend; npm run build`

Expected: PASS.

### Task 3: App Profile Settings Screen

**Files:**
- Modify: `app/src/shared/api/app-api.ts`
- Modify: `app/src/stores/useAppStore.ts`
- Create: `app/src/features/family/ProfileSettingsScreen.tsx`
- Modify: `app/src/features/family/ProfileCenter.tsx`
- Modify: `app/src/pages/home/HomePage.tsx`

- [ ] **Step 1: Add app API types and method**

Extend `AppUser` with `avatarUrl`, `age`, `gender`, `allergies`, and `medicationHistory`. Add `updateProfile(input)` that calls `PATCH /app/auth/profile`.

- [ ] **Step 2: Add store route and action**

Add `profile-settings` to `ScreenKey`. Add `updateProfile(input)` that calls `appApi.updateProfile`, updates `appUser`, and surfaces errors through `familyError` or a dedicated profile error.

- [ ] **Step 3: Build profile settings form**

Create `ProfileSettingsScreen.tsx` with controlled inputs for avatar URL, age, gender, allergy history, and medication history. Save calls `onSave`, cancel returns to profile.

- [ ] **Step 4: Link from profile center**

Add a compact profile summary and "个人信息" edit button to `ProfileCenter.tsx`.

- [ ] **Step 5: Route the new screen**

Render `ProfileSettingsScreen` from `HomePage.tsx` when `currentScreen === "profile-settings"`.

- [ ] **Step 6: Verify app build**

Run: `cd app; npm run build`

Expected: PASS.

### Task 4: End-to-End Verification

**Files:**
- No new files.

- [ ] **Step 1: Run backend focused tests**

Run: `cd backend; npm test -- app-auth.service.spec.ts app-users.service.spec.ts`

Expected: PASS or document if the package test runner does not accept multiple file arguments.

- [ ] **Step 2: Run app build**

Run: `cd app; npm run build`

Expected: PASS.

- [ ] **Step 3: Run admin build**

Run: `cd frontend; npm run build`

Expected: PASS.

## Self-Review

Spec coverage: the plan covers AppUser persistence, app edit UI, profile update API, admin read-only visibility, and verification.

Placeholder scan: no placeholder implementation items are left intentionally unresolved.

Type consistency: the plan consistently uses `avatarUrl`, `age`, `gender`, `allergies`, and `medicationHistory`.
