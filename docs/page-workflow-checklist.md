# RentalHub Page Workflow Checklist

Use this document as our shared QA workflow.  
Mark each item as you test pages and log issues immediately.

## How To Use This

1. Start the app with `npm run dev`.
2. Test each page in order.
3. Mark status:
- `[ ]` Not started
- `[x]` Completed and passed
- `[!]` Completed with issue(s)
4. If anything fails, add it to the Bug Log at the bottom with exact route + steps.

## Test Accounts

- Student: `student.demo@rentalhub.ng` / `Student@1234`
- Landlord: `landlord.demo@rentalhub.ng` / `Landlord@1234`
- Admin: `admin@bouesti.edu.ng` / `Admin@BOUESTI2025!` (if seeded)

---

## Phase 1: Public Pages

### `/`
- [ ] Navbar shows correct guest state (no dashboard/logout for guest).
- [ ] Hero section loads correctly on desktop and mobile.
- [ ] School search dropdown works and routes to `/properties?school=...`.
- [ ] Featured section renders correctly.
- [ ] Footer content and colors are correct.

### `/properties`
- [ ] Approved properties list loads.
- [ ] School/location filter chip appears correctly.
- [ ] Empty state appears correctly when no results.
- [ ] Each card links to `/properties/[id]`.

### `/properties/[id]`
- [ ] Property title, price, location, description render.
- [ ] Listing image displays.
- [ ] Amenities render correctly.
- [ ] Non-approved or missing property returns not found.

### `/login`
- [ ] Login form renders correctly.
- [ ] Student login works.
- [ ] Landlord login works.
- [ ] Admin login works.
- [ ] Invalid credentials show error.

### `/register`
- [ ] Student registration works.
- [ ] Landlord registration works.
- [ ] Duplicate email shows proper error.
- [ ] Successful registration can login immediately.

### `/forgot-password`
- [ ] Page loads.
- [ ] Confirm current behavior is acceptable (currently support-contact only).

### `/terms`
- [ ] Content loads and is readable.

### `/privacy`
- [ ] Content loads and is readable.

---

## Phase 2: Student Flow

### `/student`
- [ ] Student can access dashboard.
- [ ] Browse tab loads approved properties.
- [ ] Book now creates booking request.
- [ ] Duplicate active booking is blocked.
- [ ] My bookings tab shows pending/confirmed/cancelled states.
- [ ] Student can cancel own pending/confirmed booking.

---

## Phase 3: Landlord Flow

### `/landlord`
- [ ] Landlord can access dashboard.
- [ ] Listings tab shows only landlord's listings.
- [ ] Tenant requests tab loads.
- [ ] Accept request works (status updates).
- [ ] Decline request works (status updates).

### `/landlord/add-property`
- [ ] Step form loads without layout displacement.
- [ ] Location dropdown loads from API.
- [ ] Image upload works.
- [ ] Video upload works.
- [ ] Verification document upload works.
- [ ] Submit listing works.
- [ ] Newly submitted listing appears in landlord dashboard as `PENDING`.

---

## Phase 4: Admin Flow

### `/admin`
- [ ] Admin can access dashboard.
- [ ] Summary cards show values.
- [ ] Pending approvals list loads.
- [ ] Review details button routes to property review page.

### `/admin/properties/[id]`
- [ ] Full property details render.
- [ ] Uploaded media (images/video/document links) render.
- [ ] Approve action works.
- [ ] Reject action requires reason.
- [ ] Review history updates after action.

---

## Phase 5: Role Protection & Navigation

- [ ] Guest cannot access `/student`, `/landlord`, `/admin`.
- [ ] Student cannot access landlord/admin routes.
- [ ] Landlord cannot access student/admin routes.
- [ ] Admin cannot access student/landlord routes unless intended.
- [ ] Navbar/dashboard navbar behavior matches current auth state and role.

---

## Bug Log

Use this format:

| ID | Date | Route | Role | Steps | Expected | Actual | Severity | Status |
|---|---|---|---|---|---|---|---|---|
| 1 | YYYY-MM-DD | `/example` | Student | ... | ... | ... | High/Med/Low | Open |

---

## Fix Queue

| Priority | Issue ID | Owner | Action | Status |
|---|---|---|---|---|
| P1 |  |  |  | Open |
| P2 |  |  |  | Open |
| P3 |  |  |  | Open |

