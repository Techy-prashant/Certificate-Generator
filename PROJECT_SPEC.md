# Namdapha Certificate Management & Verification Portal

## 1. Project Overview

Build a secure, professional web application for creating, issuing, managing, and verifying certificates for Namdapha House, IIT Madras BS.

The platform must replace manual certificate editing with a centralized workflow. Authorized administrators should be able to upload Canva-designed templates, configure dynamic fields, manage signatures, create events, issue certificates individually or in bulk, and maintain a permanent verification registry.

Anyone receiving a certificate must be able to verify it using a six-digit code or QR code without creating an account.

The application must be designed for an initial zero-software-cost deployment using free-tier services, subject to their limits.

## 2. Product Goals

1. Generate professional certificates consistently.
2. Reduce repetitive manual work for event organizers.
3. Support multiple certificate designs and event categories.
4. Enable individual and spreadsheet-based bulk issuance.
5. Provide reliable public certificate verification.
6. Maintain permanent issuance records and revocation history.
7. Restrict certificate issuance and signature usage to authorized personnel.
8. Preserve issued certificate records when templates or event settings change.
9. Provide an architecture that can support other organizations in the future.

## 3. Scope

### Included in the First Release

- Administrator authentication.
- Role-based authorization.
- Organization settings.
- Event management.
- Award category management.
- Canva template image uploads.
- Visual template configuration.
- Signature management.
- Individual certificate issuance.
- Six-digit verification codes.
- QR-code generation.
- PDF generation.
- Public verification.
- Certificate registry.
- Certificate revocation.
- CSV bulk issuance.
- ZIP downloads.
- Audit logs.
- Responsive interface.
- Deployment documentation.

### Excluded from the First Release

- Direct Canva API integration.
- Automatic certificate email delivery.
- Paid third-party services.
- Mobile applications.
- Blockchain verification.
- Public self-service certificate creation.
- AI-generated certificate designs.
- Automated identity verification of recipients.
- Payment processing.
- Complex multi-organization billing.

These features may be considered later without compromising the first release.

## 4. Technology Stack

- Frontend: React, Vite, TypeScript.
- Styling: Tailwind CSS.
- UI components: shadcn/ui where appropriate.
- Icons: Lucide.
- Authentication: Supabase Auth.
- Database: Supabase PostgreSQL.
- Storage: Supabase Storage.
- Database authorization: PostgreSQL Row Level Security.
- PDF generation: pdf-lib.
- QR codes: Maintained JavaScript QR library.
- CSV processing: Maintained JavaScript CSV parser.
- Frontend hosting: Cloudflare Pages.
- Version control: Git.

Use strict TypeScript and maintain a modular architecture.

Do not introduce additional services unless a documented requirement justifies them.

## 5. User Roles

### Super Admin

Can manage:
- Organization settings.
- Administrator accounts and permissions.
- Events and award categories.
- Templates and template versions.
- Signatories and signature assets.
- Certificate issuance.
- Certificate revocation.
- Audit logs.
- Security-related settings.

### Certificate Admin

Can perform actions explicitly granted to their account, such as:
- Create and manage events.
- Upload or configure templates.
- Prepare certificates.
- Import recipient spreadsheets.
- Generate previews.
- Issue certificates if authorized.
- Search and download issued certificates.

### Reviewer

Can:
- Review certificate drafts.
- Preview certificates.
- Inspect batch validation results.
- Approve or reject issuance batches where approval is enabled.

Reviewers cannot issue certificates unless separately granted that permission.

### Public Visitor

Can:
- Enter a verification code.
- Open a QR verification URL.
- View permitted certificate details.
- View the certificate document if public access is enabled.

Public visitors cannot access the admin dashboard or modify records.

## 6. Application Routes

### Public Routes

- `/` — Public verification landing page.
- `/verify/:code` — Verification result.
- `/certificate/:id` — Optional public certificate view.
- `/about` — Explanation of the verification system.
- `/login` — Administrator login.

### Admin Routes

- `/admin` — Dashboard.
- `/admin/events` — Event list.
- `/admin/events/new` — Create event.
- `/admin/events/:id` — Event details and configuration.
- `/admin/templates` — Template library.
- `/admin/templates/new` — Upload a template.
- `/admin/templates/:id/edit` — Template Studio.
- `/admin/signatories` — Signature library.
- `/admin/certificates` — Certificate registry.
- `/admin/certificates/new` — Individual issuance.
- `/admin/certificates/:id` — Certificate details.
- `/admin/batches` — Bulk issuance batches.
- `/admin/team` — Users and permissions.
- `/admin/audit-logs` — Audit history.
- `/admin/settings` — Organization settings.

Protect all admin routes with authentication and authorization. A protected frontend route is not a substitute for database security.

## 7. Admin Dashboard

Display:
- Total issued certificates.
- Certificates issued during a selected period.
- Drafts awaiting review.
- Active events.
- Recent issuance activity.
- Recent revocations.
- Quick actions for creating events, templates, and certificates.

Include loading, empty, error, and populated states.

Avoid decorative statistics that have no operational purpose.

## 8. Event Management

An event contains:
- Name.
- Description.
- Category.
- Scope.
- Event date.
- Status.
- Default template.
- Award categories.
- Authorized signatories.
- Optional issuance approval requirements.

Supported categories:
- Technology.
- Debate.
- Cultural.
- Music.
- Sports.
- Other.

Supported scopes:
- House-level.
- Inter-house.
- Pan-Namdapha.

Supported award categories:
- First Place.
- Second Place.
- Third Place.
- Runner-up.
- Finalist.
- Participation.
- Special Mention.
- Custom.

One event may use multiple templates and signature combinations.

## 9. Template Management

### Upload Workflow

1. Administrator creates a design in Canva.
2. Administrator exports it as PNG or JPG.
3. Administrator uploads the image.
4. Application validates the file and dimensions.
5. Administrator selects the page size and orientation.
6. Application opens the template in Template Studio.
7. Administrator places and configures dynamic fields.
8. Administrator previews the design using sample data.
9. Administrator saves a draft.
10. Administrator publishes the template when ready.

Support A4 landscape, A4 portrait, and custom page dimensions.

### Supported Fields

- Recipient name.
- Event name.
- Achievement or position.
- Event date.
- Issue date.
- Organization name.
- Certificate ID.
- Six-digit verification code.
- Signatory name.
- Signatory designation.
- Signature image.
- QR code.
- Custom static text.

### Field Configuration

Every field must support:
- Position.
- Dimensions.
- Font family.
- Font size.
- Text colour.
- Alignment.
- Wrapping.
- Line spacing.
- Required or optional status.
- Maximum font size.
- Shrink-to-fit behavior.

Signature and QR fields must preserve their aspect ratios.

The template editor must persist all field settings and restore them when a template is reopened.

The PDF renderer and preview must use the same saved configuration.

## 10. Signature Management

Each signatory record contains:
- Name.
- Designation.
- Signature asset.
- Active or inactive status.
- Authorized usage.
- Creation and modification timestamps.

Support transparent PNG signature images.

Allow multiple signatures per certificate.

Only authorized administrators can upload, replace, activate, deactivate, or assign signatures.

Record the signatories used on every issued certificate.

Changes to a signatory profile must not silently change previously issued certificates.

## 11. Individual Issuance Workflow

1. Select an event.
2. Select an award category.
3. Select a published template.
4. Enter recipient details.
5. Select authorized signatories.
6. Generate a preview.
7. Validate required fields.
8. Review the final certificate.
9. Issue the certificate.
10. Save the official database record.
11. Generate or finalize the PDF.
12. Display the certificate ID, verification URL, and download action.

Issuance must not be reported as successful until the database record has been committed successfully.

Use an issuance operation that prevents duplicate records during retries.

## 12. Bulk Issuance Workflow

1. Upload a CSV file.
2. Parse and validate the data.
3. Map CSV columns to certificate fields.
4. Select the event and templates.
5. Validate award categories and signatories.
6. Show row-level validation errors.
7. Preview representative certificates.
8. Require explicit confirmation.
9. Create issuance records safely.
10. Generate PDFs.
11. Download successful certificates as a ZIP.
12. Show a batch report.

Never silently discard invalid rows.

Never issue duplicate certificates because a user clicks the confirmation button twice.

Handle partial failures explicitly. Clearly distinguish successful, failed, and not-yet-processed records.

## 13. Certificate Identification and Verification

Every issued certificate must have:
- An internal immutable record identifier.
- A unique six-digit verification code.
- A public verification URL.
- A QR code.
- An issue timestamp.
- An issuance status.
- A snapshot of the relevant certificate details.
- A reference to the template version used.
- A record of the signatories used.

Generate codes with a cryptographically secure random source where supported.

Enforce uniqueness in the database and retry safely on collisions.

A six-digit code is a public lookup identifier, not a secret authentication credential.

### Verification Outcomes

Valid:
- Display the recipient.
- Display the event and achievement.
- Display the issuing organization.
- Display the issue date and certificate ID.
- Offer the certificate document if public access is enabled.

Revoked:
- Clearly state that the certificate is no longer valid.
- Display the revocation date.
- Display a public revocation reason only if approved.

Not Found:
- Display a neutral message that no matching record exists.
- Do not reveal internal database information.

Implement rate limiting or another appropriate abuse-prevention mechanism.

## 14. Certificate Lifecycle

A certificate may progress through:

- Draft.
- Pending Review, if approval is enabled.
- Approved, if approval is enabled.
- Issued.
- Revoked.

Only issued certificates are considered valid registry records.

Issued records must not be hard-deleted through ordinary application workflows.

Revocation must preserve the original record and its history.

Template changes must affect future certificates only.

## 15. Certificate Registry

Provide searching and filtering by:
- Recipient.
- Verification code.
- Certificate ID.
- Event.
- Award category.
- Issue date.
- Status.
- Issuing administrator.

Provide certificate detail pages with permitted metadata, PDF download, status, verification URL, and issuance history.

## 16. Security and Privacy

- Use Supabase Auth for administrator authentication.
- Enforce authorization in database policies and trusted backend operations.
- Enable Row Level Security on relevant tables.
- Never expose the Supabase service-role key in frontend code.
- Restrict signature assets to authorized administrators.
- Restrict template uploads and modifications.
- Validate file types, sizes, and dimensions.
- Do not expose private recipient data unnecessarily.
- Keep audit logs inaccessible to public visitors.
- Validate and sanitize user input.
- Rate-limit public verification.
- Protect privileged actions against unauthorized requests.
- Keep secrets in environment variables.
- Document backup and recovery limitations.

## 17. Audit Logging

Record:
- Certificate issuance.
- Certificate revocation.
- Template publication.
- Signature changes.
- Event configuration changes.
- Permission changes.
- Administrator account changes.
- Important failed administrative operations.

Each entry should contain the actor, action, target, timestamp, and relevant metadata.

Audit records must not be editable through ordinary admin interfaces.

## 18. Free-Tier Requirements

Prefer services with free tiers.

Generate PDFs in the browser where practical.

Avoid paid APIs and mandatory paid integrations.

Document free-tier limitations, storage quotas, service pausing, backups, and hosting constraints.

Do not promise permanent uptime or unlimited usage.

## 19. Definition of Success

The first release is successful when an authorized administrator can:

1. Log in securely.
2. Create an event.
3. Upload and configure a Canva template.
4. Manage approved signatories.
5. Issue a certificate.
6. Download the PDF.
7. Verify the certificate publicly using its code or QR code.
8. Revoke a certificate and see the revoked status publicly.
9. Issue multiple certificates from a CSV.
10. Search certificate records and inspect audit history.

All core workflows must use real persisted data, not mock implementations.

## 20. Project Rules

Treat this document as the product requirements source of truth.

Before implementing a feature, inspect the current codebase and identify dependencies.

Do not silently remove working features.

Do not claim that incomplete features work.

Do not replace real functionality with fake success messages or placeholder buttons.

Run type checks, tests, linting, and production builds as appropriate.

Document every unresolved requirement and external configuration step.