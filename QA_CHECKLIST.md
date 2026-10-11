# Quality Assurance Checklist — Namdapha Certificate Portal

## 1. Testing Principles

Test actual application behavior, not merely whether a page renders.

A feature is complete only when:
- Its UI works.
- Its data persists correctly.
- Its authorization rules are enforced.
- Its error states are handled.
- Its acceptance criteria are verified.

Never mark a test as passed unless it was actually executed.

## 2. Project and Build

- [ ] Application starts locally.
- [ ] Production build succeeds.
- [ ] TypeScript checks pass.
- [ ] Linting passes.
- [ ] No critical browser console errors.
- [ ] No missing imports or components.
- [ ] Environment variables are documented.
- [ ] No real secrets are committed.
- [ ] Database migrations apply to a clean database.
- [ ] README setup instructions are accurate.

## 3. Authentication

- [ ] Authorized administrator can log in.
- [ ] Authorized administrator can log out.
- [ ] Invalid credentials show an appropriate error.
- [ ] Expired sessions are handled.
- [ ] Protected routes require authentication.
- [ ] Inactive accounts cannot perform privileged actions.
- [ ] Public visitors cannot create administrator accounts.
- [ ] Role changes take effect correctly.
- [ ] Privileged roles cannot be self-assigned.
- [ ] Authentication errors do not reveal unnecessary information.

## 4. Authorization and Database Security

- [ ] Row Level Security is enabled on relevant tables.
- [ ] Public visitors cannot access private records.
- [ ] Public visitors cannot issue certificates.
- [ ] Public visitors cannot revoke certificates.
- [ ] Unauthorized users cannot modify templates.
- [ ] Unauthorized users cannot upload or replace signatures.
- [ ] Unauthorized users cannot change permissions.
- [ ] Audit logs are protected from unauthorized access.
- [ ] Storage policies prevent unauthorized signature access.
- [ ] Privileged keys are absent from frontend bundles.
- [ ] Public verification returns only approved fields.
- [ ] Database policies are tested independently of frontend controls.

## 5. Event Management

- [ ] Administrator can create an event.
- [ ] Required fields are validated.
- [ ] Administrator can edit an event.
- [ ] Event changes persist after reload.
- [ ] Award categories can be added.
- [ ] Duplicate categories are handled correctly.
- [ ] Archived events cannot be used for unauthorized new issuance.
- [ ] Event templates can be assigned correctly.
- [ ] Event signatories can be configured.
- [ ] Invalid or unauthorized signatories are rejected.

## 6. Template Upload

- [ ] PNG upload succeeds.
- [ ] JPG upload succeeds.
- [ ] Unsupported file types are rejected.
- [ ] Oversized files are rejected.
- [ ] Invalid image files are rejected.
- [ ] Image dimensions are validated.
- [ ] A4 landscape is supported.
- [ ] A4 portrait is supported.
- [ ] Custom dimensions are handled correctly.
- [ ] The background image preserves its aspect ratio.
- [ ] Uploaded files are stored in the intended location.
- [ ] Unauthorized users cannot replace published templates.

## 7. Template Studio

- [ ] Canvas displays the correct background.
- [ ] Dynamic fields can be added.
- [ ] Fields can be selected.
- [ ] Fields can be moved.
- [ ] Fields can be resized.
- [ ] Position values can be edited numerically.
- [ ] Font settings persist.
- [ ] Alignment settings persist.
- [ ] Field configuration survives page reload.
- [ ] Fields outside the page trigger a warning.
- [ ] Overlapping fields can be identified.
- [ ] Long names render correctly.
- [ ] Long event names render correctly.
- [ ] Empty optional fields are handled correctly.
- [ ] Required fields are validated.
- [ ] Signature images preserve aspect ratio.
- [ ] QR codes remain square.
- [ ] Template drafts can be saved.
- [ ] Published templates are protected from accidental overwriting.
- [ ] A new template version does not change previously issued certificates.

## 8. Signature Management

- [ ] Authorized administrator can add a signatory.
- [ ] Transparent PNG uploads work.
- [ ] Invalid signature files are rejected.
- [ ] Designations are displayed correctly.
- [ ] Multiple signatures can be assigned.
- [ ] Signature ordering is preserved.
- [ ] Inactive signatories cannot be used for new issuance.
- [ ] Unauthorized signature access is blocked.
- [ ] Signature changes do not silently modify historical certificates.
- [ ] Relevant changes appear in audit logs.

## 9. Individual Certificate Issuance

- [ ] Administrator can select an event.
- [ ] Administrator can select an award category.
- [ ] Administrator can select a published template.
- [ ] Recipient details are validated.
- [ ] Authorized signatories are selected correctly.
- [ ] Preview matches the selected configuration.
- [ ] The issue date is correct.
- [ ] The PDF uses the correct background.
- [ ] Recipient name is correct.
- [ ] Event name is correct.
- [ ] Achievement is correct.
- [ ] Signatures are correct.
- [ ] Verification code is readable.
- [ ] QR code is scannable.
- [ ] PDF dimensions and orientation are correct.
- [ ] PDF downloads successfully.
- [ ] The certificate record persists.
- [ ] Success is not shown before persistence succeeds.
- [ ] Failed issuance can be retried safely.
- [ ] Duplicate submissions do not create duplicate certificates.

## 10. Verification Codes and QR Codes

- [ ] Codes contain exactly six digits.
- [ ] Leading zeros are preserved.
- [ ] Codes are generated using an appropriate secure random source.
- [ ] Database uniqueness is enforced.
- [ ] Code collisions are handled safely.
- [ ] Repeated requests do not reuse an issued code incorrectly.
- [ ] QR codes point to the correct verification URL.
- [ ] QR codes work on mobile devices.
- [ ] Codes are not treated as authentication passwords.
- [ ] Public lookup attempts are appropriately rate-limited.
- [ ] Malformed input is handled safely.

## 11. Public Verification

- [ ] Valid code displays the correct certificate.
- [ ] Valid code displays the correct recipient.
- [ ] Valid code displays the correct event.
- [ ] Valid code displays the correct achievement.
- [ ] Valid code displays the correct organization.
- [ ] Valid code displays the correct issue date.
- [ ] Revoked code displays revoked status.
- [ ] Revoked code never appears valid.
- [ ] Unknown code displays a neutral not-found message.
- [ ] Empty input is handled.
- [ ] Invalid input is handled.
- [ ] Public visitors do not need an account.
- [ ] Private data is not exposed.
- [ ] Public certificate links follow the configured access policy.
- [ ] Verification works after production deployment.

## 12. Certificate Registry and Revocation

- [ ] Registry displays persisted records.
- [ ] Search by recipient works.
- [ ] Search by code works.
- [ ] Search by event works.
- [ ] Filtering by status works.
- [ ] Filtering by date works.
- [ ] Pagination works when needed.
- [ ] Certificate detail page displays correct information.
- [ ] Revocation requires authorization.
- [ ] Revocation requires confirmation.
- [ ] Revocation reason is recorded appropriately.
- [ ] Original issuance data is preserved.
- [ ] Revocation history is preserved.
- [ ] Public verification reflects the revoked status.
- [ ] Ordinary UI workflows cannot hard-delete issued certificates.

## 13. Bulk Issuance

- [ ] Valid CSV uploads successfully.
- [ ] Invalid CSV files show useful errors.
- [ ] Column mapping works.
- [ ] Required columns are validated.
- [ ] Missing recipient names are flagged.
- [ ] Invalid award categories are flagged.
- [ ] Missing templates are flagged.
- [ ] Duplicate rows are identified appropriately.
- [ ] Long names are handled.
- [ ] Invalid rows are not silently discarded.
- [ ] Preview uses representative rows.
- [ ] Confirmation is required before issuance.
- [ ] Duplicate batch submission is handled safely.
- [ ] Partial failures are reported accurately.
- [ ] Successfully issued records persist.
- [ ] Failed records can be retried safely.
- [ ] ZIP downloads contain the expected PDFs.
- [ ] Filenames are sanitized.
- [ ] The completion report matches the actual records.
- [ ] Large imports do not freeze the UI unnecessarily.

## 14. Audit Logs

- [ ] Certificate issuance is recorded.
- [ ] Certificate revocation is recorded.
- [ ] Template publication is recorded.
- [ ] Signature changes are recorded.
- [ ] Role changes are recorded.
- [ ] Relevant event changes are recorded.
- [ ] The correct actor is recorded.
- [ ] Timestamps are accurate.
- [ ] Sensitive secrets are not included.
- [ ] Unauthorized users cannot read restricted audit data.
- [ ] Ordinary users cannot modify or delete audit records.

## 15. UI and Responsive Behavior

- [ ] Dashboard renders correctly.
- [ ] Navigation works.
- [ ] Sidebar works at supported widths.
- [ ] Forms are usable on mobile.
- [ ] Tables remain usable on small screens.
- [ ] Template Studio controls remain accessible.
- [ ] Dialogs open and close correctly.
- [ ] Buttons show loading states.
- [ ] Success messages reflect real outcomes.
- [ ] Error messages are understandable.
- [ ] Empty states provide useful actions.
- [ ] Keyboard navigation works.
- [ ] Inputs have accessible labels.
- [ ] Focus states are visible.
- [ ] Text contrast is adequate.
- [ ] No unintended horizontal overflow occurs.

## 16. Performance and Reliability

- [ ] Large images are handled safely.
- [ ] PDF generation does not block the UI unnecessarily.
- [ ] Batch processing provides progress feedback.
- [ ] Network failures are handled.
- [ ] Database failures are handled.
- [ ] Storage failures are handled.
- [ ] PDF generation failures are handled.
- [ ] Retries do not duplicate issuance.
- [ ] Repeated clicks do not trigger duplicate operations.
- [ ] Search and filtering remain responsive.
- [ ] Free-tier limitations are documented.

## 17. Deployment

- [ ] Production environment variables are configured.
- [ ] Database migrations are applied.
- [ ] Authentication redirect URLs are configured.
- [ ] Storage buckets and policies are configured.
- [ ] Production build succeeds.
- [ ] Frontend deployment succeeds.
- [ ] Public verification URL works.
- [ ] Login works in production.
- [ ] Certificate generation works in production.
- [ ] Database records persist after reload.
- [ ] Unauthorized operations are blocked.
- [ ] No secrets are exposed in deployed assets.
- [ ] Backup and recovery limitations are documented.
- [ ] Manual setup steps are documented.

## 18. Critical End-to-End Tests

### Test A — Individual Issuance

1. Log in as an authorized administrator.
2. Create an event.
3. Upload a Canva-exported template.
4. Configure dynamic fields.
5. Add an authorized signatory.
6. Issue a certificate to a test recipient.
7. Download the PDF.
8. Scan its QR code.
9. Verify the recipient and event details.
10. Confirm the database record exists.

Expected result: The PDF and public registry record match.

### Test B — Invalid Certificate

1. Enter a code that does not exist.
2. Submit the lookup.

Expected result: A neutral not-found message appears without exposing private data.

### Test C — Revocation

1. Issue a test certificate.
2. Revoke it using an authorized account.
3. Open the public verification URL.

Expected result: The certificate is shown as revoked, the original record remains available to authorized administrators, and the audit history is preserved.

### Test D — Bulk Issuance

1. Prepare a CSV with several valid recipients and at least one invalid row.
2. Upload the file.
3. Map columns.
4. Review the validation report.
5. Confirm issuance.
6. Download the ZIP.
7. Verify multiple generated certificates.

Expected result: Valid records are processed correctly, invalid records are reported, and no duplicate certificates are created.

### Test E — Unauthorized Access

1. Sign in as a reviewer or use an unauthenticated session.
2. Attempt to issue a certificate.
3. Attempt to revoke a certificate.
4. Attempt to access restricted signature assets.
5. Attempt to read private audit logs.

Expected result: All unauthorized operations are blocked by actual authorization controls, not just hidden UI elements.

### Test F — Template Version Preservation

1. Publish a template.
2. Issue a certificate using that version.
3. Change the template and publish a new version.
4. Inspect the original certificate record and document.

Expected result: The original certificate retains its original issuance data and template version.

### Test G — Failure Recovery

1. Simulate a database failure during issuance.
2. Attempt to issue a certificate.
3. Inspect the UI and database.
4. Retry after restoring the database.

Expected result: The application never reports a failed issuance as successful and does not create duplicate records on retry.

## 19. Release Gate

Do not release the first production version until all critical checks pass:

- Authentication and authorization.
- Database integrity.
- Template upload and configuration.
- Individual certificate issuance.
- PDF rendering.
- QR verification.
- Revocation.
- Public data privacy.
- Bulk issuance.
- Production deployment.

Record all known limitations and unresolved issues.

## 20. Test Reporting Format

At the end of every milestone, report:

- Total tests executed.
- Tests passed.
- Tests failed.
- Tests blocked.
- Tests not run.
- Critical defects.
- Security issues.
- Known limitations.
- Recommended next actions.

Never mark unexecuted tests as passed.

Never declare production readiness while a critical issuance, authorization, or verification defect remains unresolved.