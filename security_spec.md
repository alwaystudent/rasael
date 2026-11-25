# Security Specification & Payload-First TDD (`رسائل إماراتية للأطفال`)

## 1. Data Invariants
1. **Appearance Configuration (`/platform_config/appearance`)**:
   - Must always contain valid `themePreset`, 6-digit hex `primaryAccent`, `columns` (`2` or `3`), `viewMode`, `cardStyle`, `fontSize`, all 4 display booleans, and server `updatedAt == request.time`.
   - Publicly readable via `get` only (`list` disabled); writable only by a verified admin (`email_verified == true` and bootstrapped admin email or `/admins/{uid}`).
2. **Educational Materials (`/materials/{materialId}`)**:
   - Document ID must match `^[a-zA-Z0-9_\-]+$` (max 128 chars) and equal `data.id`.
   - Unauthenticated / non-admin reads (`get` and `list`) are strictly restricted to documents with `published == true`.
   - Writes (`create`, `update`, `delete`) are restricted to verified admins (`email_verified == true`).
   - `ownerId`, `id`, and `createdAt` are immutable after creation; `updatedAt` must equal `request.time`.
   - Shadow fields are rejected via `keys().hasOnly(...)` and `affectedKeys().hasOnly(...)`.
3. **Admin Directory (`/admins/{uid}`)**:
   - Only readable by the matching signed-in user or bootstrapped admin (`list` disabled).
   - Writable only by the bootstrapped admin with verified email.

## 2. The "Dirty Dozen" Adversarial Payloads
1. **Unauthenticated Write to Config**: Anonymous client attempts `setDoc('/platform_config/appearance', ...)` -> `PERMISSION_DENIED`.
2. **Unverified Email Admin Spoof**: Signed-in user with `email_verified: false` attempts material creation -> `PERMISSION_DENIED`.
3. **Shadow Field Injection on Create**: Admin payload includes ghost key `isSuperAdmin: true` -> `PERMISSION_DENIED`.
4. **Shadow Field Injection on Update**: Admin update payload adds `extraSecret: "x"` -> `PERMISSION_DENIED`.
5. **ID Poisoning**: Document path `/materials/bad id with spaces!` or `1500-char` ID -> `PERMISSION_DENIED`.
6. **ID Mismatch**: `/materials/mat-1` with body `{ id: "mat-2", ... }` -> `PERMISSION_DENIED`.
7. **OwnerId Spoofing on Create**: Payload sets `ownerId: "victim-uid"` != `request.auth.uid` -> `PERMISSION_DENIED`.
8. **Immutable Field Mutation**: Update modifies `createdAt` or `ownerId` -> `PERMISSION_DENIED`.
9. **Client Timestamp Forgery**: Payload provides backdated timestamp instead of `request.time` -> `PERMISSION_DENIED`.
10. **Value Poisoning**: Update sets `accentColor: "javascript:alert(1)"` or `columns: 99` -> `PERMISSION_DENIED`.
11. **Oversized String Exhaustion**: `title` exceeding 300 chars or `subtitle` exceeding 400 chars -> `PERMISSION_DENIED`.
12. **Hidden Draft Scrape via List**: Public user queries `/materials` including `published == false` documents -> `PERMISSION_DENIED`.
