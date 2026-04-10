# RentalHub QA Checklist

## How To Use
1. Run each test case in order of priority (`P0` first).
2. Record result (`Pass`/`Fail`) in the execution log table.
3. Attach evidence (screenshot, console log, API response) for each failure.
4. Re-test failed cases after fixes are deployed.

## Test Matrix

| ID | Priority | Role | Area | Preconditions | Steps | Expected Result |
|---|---|---|---|---|---|---|
| TC-001 | P0 | Student | Register + OTP | Fresh email not in DB | Register as student -> redirected to `/verify-email` -> enter valid OTP | Account verified, auto-login to `/student` |
| TC-002 | P1 | Student | OTP resend | Existing unverified account | Go to `/verify-email` -> click `Resend OTP` | OTP sent; success message shown; no crash |
| TC-003 | P1 | Student | OTP invalid handling | Unverified account | Enter wrong OTP | Clear error shown; form remains usable |
| TC-004 | P0 | Student | Login role check | Existing student | On login, choose `LANDLORD` role with student creds | Blocked with role mismatch message; no unauthorized dashboard access |
| TC-005 | P0 | Student | Browse + bid create | At least 1 approved property | On `/student`, set bid and click `Book` | Booking created with `PENDING`; appears in My Bookings |
| TC-006 | P1 | Student | Duplicate active booking guard | One active booking exists | Try booking same property again | API returns conflict; UI shows error |
| TC-007 | P0 | Landlord | Unverified listing lock | Landlord `UNVERIFIED` | Open `/landlord/add-property` and submit form | Submission blocked with clear verification message |
| TC-008 | P1 | Landlord | Verification submit | Unverified landlord | Submit gov ID + selfie + ownership proof | Status becomes `UNDER_REVIEW`; admin notification created |
| TC-009 | P0 | Admin | Landlord verification approve | Landlord under review | Admin opens verifications panel -> Approve | Landlord status becomes `VERIFIED`; landlord can list |
| TC-010 | P0 | Landlord | Listing submit flow | Landlord `VERIFIED` | Submit listing with media | Listing stored as `PENDING`; appears in landlord listings |
| TC-011 | P0 | Admin | Property moderation | Pending listing exists | Approve pending property | Listing becomes `APPROVED`; appears in public/student browse |
| TC-012 | P0 | Bid engine | Multi-bid highest winner | 2+ students bid same property | Landlord tries accepting non-highest bid | Blocked with “highest bid only” error |
| TC-013 | P0 | Bid engine | Winner selection | 2+ pending bids | Landlord accepts highest bid | Winner -> `AWAITING_PAYMENT`; losers auto-`CANCELLED` + notified |
| TC-014 | P0 | Payments | Initiate payment | Student has `AWAITING_PAYMENT` booking | Click `Pay Now` | Redirect URL returned; payment record `PENDING` created |
| TC-015 | P0 | Payments | Verify payment ownership | Two students + one paid booking reference | Different user calls verify endpoint for another student booking | Must be denied (no update); no unauthorized booking/payment mutation |
| TC-016 | P0 | Payments | Verify idempotency | Paid booking already verified once | Replay same verify call | No double-decrement of `vacantUnits`; no duplicate side-effects |
| TC-017 | P1 | Student | Cancel paid booking refund path | Booking `PAID` | Student cancels booking | Refund flow triggers reliably; status/notifications consistent |
| TC-018 | P1 | Notifications | Bell detail behavior | Logged-in user with notifications | Click notification bell item | Marks read + expands message only; no forced route navigation |
| TC-019 | P1 | Session security | Role/status drift after admin change | User logged in; admin changes role/status | Refresh protected route | Access reflects latest role/status; no stale cross-role access |
| TC-020 | P2 | Admin UI | Booking status rendering | Mixed statuses (`PENDING`, `AWAITING_PAYMENT`, `PAID`, `CANCELLED`) | Open admin bookings panel | Correct labels/colors for all statuses |

## Execution Log

| ID | Tester | Date | Env | Result (Pass/Fail) | Evidence (Screenshot/Log) | Notes |
|---|---|---|---|---|---|---|
| TC-001 |  |  |  |  |  |  |
| TC-002 |  |  |  |  |  |  |
| TC-003 |  |  |  |  |  |  |
| TC-004 |  |  |  |  |  |  |
| TC-005 |  |  |  |  |  |  |
| TC-006 |  |  |  |  |  |  |
| TC-007 |  |  |  |  |  |  |
| TC-008 |  |  |  |  |  |  |
| TC-009 |  |  |  |  |  |  |
| TC-010 |  |  |  |  |  |  |
| TC-011 |  |  |  |  |  |  |
| TC-012 |  |  |  |  |  |  |
| TC-013 |  |  |  |  |  |  |
| TC-014 |  |  |  |  |  |  |
| TC-015 |  |  |  |  |  |  |
| TC-016 |  |  |  |  |  |  |
| TC-017 |  |  |  |  |  |  |
| TC-018 |  |  |  |  |  |  |
| TC-019 |  |  |  |  |  |  |
| TC-020 |  |  |  |  |  |  |

## Open Risk Notes
- Payment verification must enforce booking ownership and idempotency.
- Session role/verification changes should invalidate or refresh active tokens immediately.
- Admin booking status UI should reflect all active booking states.
