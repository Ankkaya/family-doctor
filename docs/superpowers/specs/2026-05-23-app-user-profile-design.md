# App User Profile Design

## Goal

Add a personal information settings page in the app's "我的" area and expose the same AppUser-bound profile information in the admin backend.

## Scope

Profile data is bound to `AppUser` itself, not `HouseholdMember`. A user's profile follows the account across households.

Fields:

- Avatar URL, using the existing `AppUser.avatarUrl` column.
- Age.
- Gender.
- Allergy history.
- Previously used medicines.

## Data Model

Extend `AppUser` with nullable profile fields:

- `age Int?`
- `gender String?`
- `allergies String?`
- `medicationHistory String?`

The existing `avatarUrl String?` column remains the avatar storage location.

`gender` uses stable string values:

- `male`
- `female`
- `other`
- `unknown`

## App API

Add an authenticated app-user endpoint:

- `PATCH /app/auth/profile`

The endpoint updates only the current authenticated app user's profile fields. It accepts avatar URL, age, gender, allergy history, and medication history. Empty text values are normalized to `null`.

Validation:

- `age` is optional and must be an integer from 0 to 130.
- `gender` is optional and must be one of the supported values.
- Text fields are optional strings.

The login, register, refresh, and profile update responses should include the profile fields in the returned `AppUser`.

## App UI

Add a personal information settings screen reachable from `ProfileCenter`.

The "我的" page shows a compact profile summary and an edit entry. The settings screen provides controls for:

- Avatar URL.
- Age.
- Gender.
- Allergy history.
- Previously used medicines.

Saving calls `PATCH /app/auth/profile`, updates Zustand `appUser`, and returns to the profile screen or shows a success toast while staying on the form. API errors are surfaced through the existing toast/error patterns.

## Admin UI

Extend admin App 用户 data to include the new profile fields.

To avoid widening the list table too much, add a "详情" action or detail modal that displays:

- Avatar.
- Username/nickname/contact.
- Age.
- Gender.
- Allergy history.
- Previously used medicines.

The admin view is read-only for these personal profile fields in this scope.

## Testing

Backend service tests should cover profile updates:

- Updates the current AppUser profile fields.
- Normalizes empty text fields to null.
- Rejects invalid age or gender through DTO validation.

Frontend verification uses the repository's current minimum build checks:

- `npm run build` in `app/`.
- Backend related tests or `npm test -- app-users` in `backend/` when available.
