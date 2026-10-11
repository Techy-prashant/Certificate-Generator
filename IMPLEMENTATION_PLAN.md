# Implementation Plan — Namdapha Certificate Portal

## 1. Development Strategy

Implement the application incrementally.

Every milestone must produce a testable result and meet its acceptance criteria before the next milestone begins.

The application must progress from a consistent UI shell to a working database-backed product.

Do not build advanced features on top of untested foundations.

## 2. Milestone 0 — Workspace Inspection and Planning

### Tasks

- Inspect the current repository.
- Identify existing frameworks and dependencies.
- Inspect current Git status.
- Confirm whether the project is new or existing.
- Review the product requirements.
- Create and validate the six documentation files.
- Define database relationships.
- Define authorization boundaries.
- Identify external configuration requirements.

### Acceptance Criteria

- Documentation files exist in the repository root.
- The architecture is documented.
- Database and permission decisions are recorded.
- The development sequence is approved.
- No existing working functionality has been overwritten.

## 3. Milestone 1 — Foundation and UI Shell

### Tasks

- Initialize React, Vite, and TypeScript if necessary.
- Configure Tailwind CSS and the component library.
- Establish design tokens.
- Create the application layout.
- Build sidebar navigation.
- Create admin route shells.
- Create public verification pages.
- Add responsive layouts.
- Add loading, empty, and error states.
- Create realistic demo data isolated from production services.

### Acceptance Criteria

- The application starts locally.
- The production build succeeds.
- All planned routes render.
- Navigation works.
- The layout is consistent on desktop and mobile.
- No primary navigation action leads to an accidental blank page.
- Demo data is clearly separated from production data.
- Type checks and linting pass.

## 4. Milestone 2 — Database and Authentication

### Tasks

- Configure Supabase.
- Create SQL migrations.
- Create profile and organization tables.
- Implement authentication.
- Implement role and permission handling.
- Enable Row Level Security.
- Create protected storage buckets.
- Implement secure data access.
- Document initial administrator provisioning.
- Add environment configuration.

### Acceptance Criteria

- An authorized administrator can log in and log out.
- Public users cannot access admin records.
- Unauthorized users cannot perform privileged actions.
- Database policies protect relevant tables.
- Secrets are not exposed in frontend bundles.
- Migrations can be applied to a clean database.
- Authentication and authorization tests pass.

## 5. Milestone 3 — Events and Signatories

### Tasks

- Implement event creation and editing.
- Implement award categories.
- Implement event status.
- Implement signatory records.
- Implement signature uploads.
- Implement signature permissions.
- Connect events, categories, and signatories.
- Add validation and error handling.

### Acceptance Criteria

- Administrators can create and edit events.
- Award categories are persisted.
- Authorized signatories can be managed.
- Inactive or unauthorized signatories cannot be used for new issuance.
- Public users cannot modify event or signature data.
- Relevant audit events are recorded.

## 6. Milestone 4 — Template Studio

### Tasks

- Implement PNG/JPG upload.
- Validate file size, type, and dimensions.
- Implement page sizing.
- Build the visual template canvas.
- Implement draggable and resizable fields.
- Implement field property controls.
- Implement signature and QR placeholders.
- Persist field positions and styling.
- Implement draft and published versions.
- Implement sample-data preview.
- Implement PDF rendering.

### Acceptance Criteria

- An administrator can upload a Canva-exported design.
- Dynamic fields can be placed and configured.
- Field positions persist after reload.
- A template can be saved as a draft.
- A published template is available for issuance.
- Template version changes do not silently alter old certificates.
- Long names and long event titles render correctly.
- Preview and PDF output use consistent positions.
- Generated PDFs have correct dimensions and orientation.

## 7. Milestone 5 — Individual Issuance and Verification

### Tasks

- Implement the certificate creation form.
- Connect events, templates, and signatories.
- Implement issuance validation.
- Generate six-digit verification codes.
- Enforce code uniqueness.
- Persist official certificate records.
- Generate QR codes.
- Generate downloadable PDFs.
- Implement the public verification endpoint.
- Implement valid, revoked, and not-found results.
- Implement certificate detail pages.
- Add rate limiting or an appropriate abuse-prevention strategy.

### Acceptance Criteria

- An authorized administrator can issue a certificate.
- The certificate record is committed before success is reported.
- Duplicate issuance is prevented during retries.
- The PDF contains the expected recipient, event, position, signatures, code, and QR code.
- The QR code opens the correct verification page.
- Public visitors can verify a valid certificate without logging in.
- Revoked certificates display revoked status.
- Nonexistent codes return a neutral result.
- Private administrative data is not exposed.

## 8. Milestone 6 — Certificate Registry and Revocation

### Tasks

- Implement searchable certificate records.
- Add filters and pagination.
- Implement certificate detail pages.
- Implement controlled revocation.
- Preserve the original record.
- Record revocation metadata.
- Add audit logs.
- Preserve historical template and signature information.

### Acceptance Criteria

- Administrators can find certificates using supported filters.
- Issued certificates cannot be silently deleted.
- Revocation preserves the certificate record.
- Public verification reflects revocation.
- Audit history records relevant administrative actions.
- Unauthorized users cannot revoke certificates.

## 9. Milestone 7 — Bulk Issuance

### Tasks

- Implement CSV upload.
- Implement column mapping.
- Validate rows.
- Detect duplicate submissions.
- Display row-level errors.
- Preview sample certificates.
- Implement safe batch persistence.
- Generate PDFs for successfully issued records.
- Package generated PDFs into a ZIP.
- Produce a batch completion report.
- Implement retry handling.

### Acceptance Criteria

- Valid CSV rows can be mapped and previewed.
- Invalid rows are identified before issuance.
- The administrator explicitly confirms issuance.
- Repeated requests do not create duplicate certificates.
- Partial failures are reported accurately.
- The application distinguishes issued, failed, and pending rows.
- ZIP downloads contain the correct generated certificates.
- Large batches do not freeze the interface unnecessarily.

## 10. Milestone 8 — Team Management and Audit Hardening

### Tasks

- Implement administrator invitation or secure provisioning.
- Implement role assignment.
- Implement permission checks.
- Add audit log viewing.
- Restrict access to audit logs.
- Test unauthorized operations.
- Review signature access.
- Review certificate issuance permissions.
- Review storage policies.

### Acceptance Criteria

- Only authorized administrators can manage roles.
- Role changes are recorded.
- Signature assets are not publicly accessible without explicit authorization.
- Privileged operations are protected.
- Audit records cannot be modified through ordinary UI actions.
- Security tests pass.

## 11. Milestone 9 — Deployment and Final QA

### Tasks

- Configure production environment variables.
- Apply database migrations.
- Configure authentication URLs.
- Configure storage buckets and policies.
- Deploy the frontend.
- Configure public verification URLs.
- Test the production deployment.
- Test mobile responsiveness.
- Review error handling.
- Document backup and recovery procedures.
- Document free-tier limitations.

### Acceptance Criteria

- The production application loads successfully.
- Authentication works in production.
- Public verification works in production.
- Certificate generation works with real records.
- Unauthorized access tests pass.
- The production build succeeds.
- No privileged secrets appear in the frontend.
- Deployment instructions are complete.
- Known limitations are documented.

## 12. Change Management

If a requirement changes:

1. Update PROJECT_SPEC.md.
2. Update affected design, schema, or implementation documents.
3. Identify impacted code and migrations.
4. Assess backward compatibility.
5. Define new acceptance criteria.
6. Implement and test the change.
7. Update the implementation status.

Do not silently change core product behavior.

## 13. Progress Tracking

For every milestone, record:

- Status: Not Started, In Progress, Blocked, or Complete.
- Implemented features.
- Acceptance criteria results.
- Tests executed.
- Known issues.
- External configuration remaining.
- Next recommended action.

A milestone is complete only when its acceptance criteria have been verified against the actual application.