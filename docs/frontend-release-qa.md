# Frontend Release QA

This checklist is the manual runtime gate for the completed frontend MVP. Automated unit coverage protects the core domain rules; this checklist validates the real browser experience.

## 1. Keyboard accessibility

- [ ] Start from a fresh browser session.
- [ ] Reach every primary navigation item using Tab only.
- [ ] Confirm the visible focus indicator is always obvious.
- [ ] Open and close mobile navigation with keyboard controls where supported.
- [ ] Open candidate drawer and confirm focus remains inside while the drawer is open.
- [ ] Press Escape and confirm the active drawer/dialog closes.
- [ ] Open rejection, scheduling, decision, approval, document, invitation and password dialogs and verify focus order.
- [ ] Confirm disabled controls cannot receive inappropriate focus or trigger actions.
- [ ] Confirm form labels are reachable and associated with their controls.
- [ ] Confirm no keyboard trap exists on any completed workflow.

## 2. Mobile / touch validation

Test at minimum one narrow phone viewport and one tablet viewport.

- [ ] Navigation slide-over opens and closes cleanly.
- [ ] Candidate profile actions remain reachable without horizontal overflow.
- [ ] Candidate comparison tray can minimize and restore.
- [ ] Candidate comparison resize controls remain touch-safe.
- [ ] Interview queue, calendar and scheduling drawer remain usable in narrow widths.
- [ ] Bulk scheduling controls remain usable for large candidate selections.
- [ ] Selection decision and approval controls stack correctly.
- [ ] Documents, notifications and allocation actions remain reachable.
- [ ] Safe-area spacing is preserved on devices with bottom insets.
- [ ] No clipped dialogs, overflowing tables or inaccessible fixed action bars.

## 3. Reduced motion

- [ ] Enable the operating system reduced-motion preference.
- [ ] Confirm navigation, drawers and comparison transitions avoid unnecessary animation.
- [ ] Confirm functionality remains complete without motion.

## 4. Core recruitment smoke flow

- [ ] Sign in as Recruiter.
- [ ] Search/filter candidates.
- [ ] Open a candidate profile.
- [ ] Trigger and review duplicate evidence.
- [ ] Edit operational profile details.
- [ ] Send an onboarding invitation preview.
- [ ] Open candidate onboarding portal preview.
- [ ] Submit onboarding and return to recruiter review.
- [ ] Schedule an interview.
- [ ] Complete scorecard/practical test.
- [ ] Record Select / Reserve / Reject with reason and note.
- [ ] Review selection approval state.
- [ ] Review allocation eligibility.
- [ ] Verify notification state updates.
- [ ] Verify candidate journey/audit timeline reflects the actions.

## 5. Release checks

- [ ] `npm run build` passes.
- [ ] `npm test` passes.
- [ ] No new browser console errors during the smoke flow.
- [ ] No missing asset / favicon requests.
- [ ] Refreshing the browser does not corrupt persisted demo data.
- [ ] Legacy candidate data still normalizes safely.
- [ ] Desktop and mobile screenshots have been reviewed before release.

## Exit criteria

Frontend QA is complete when all applicable checks are green, the build and automated tests pass, and any browser/device defects found during manual QA are fixed and re-tested.
