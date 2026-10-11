# Database Schema — Namdapha Certificate Portal

## 1. Database Principles

Use PostgreSQL through Supabase.

The database is the authoritative source for issued certificates and their current status.

Use UUID primary keys for internal records. Use a separate six-digit verification code for human-readable public lookup.

Apply foreign keys, constraints, indexes, and Row Level Security.

Use version-controlled SQL migrations.

Use UTC timestamps for stored time values and display dates in the appropriate user-facing timezone.

Do not rely on client-side validation for database integrity.

## 2. Organization Settings

Table: organization_settings

Fields:
- id: UUID primary key.
- name: TEXT, required.
- display_name: TEXT, optional.
- description: TEXT, optional.
- logo_storage_path: TEXT, optional.
- website_url: TEXT, optional.
- public_verification_enabled: BOOLEAN, default true.
- created_at: TIMESTAMPTZ.
- updated_at: TIMESTAMPTZ.

Initial release:
- Create one organization record for Namdapha House.
- Do not claim IIT Madras itself issued a certificate unless explicitly authorized.

Future multi-organization support may add organization ownership to events, templates, certificates, signatories, and related records.

## 3. Profiles

Table: profiles

Fields:
- id: UUID primary key referencing auth.users.
- display_name: TEXT.
- role: TEXT or ENUM.
- is_active: BOOLEAN, default true.
- created_at: TIMESTAMPTZ.
- updated_at: TIMESTAMPTZ.

Allowed roles:
- super_admin.
- certificate_admin.
- reviewer.

Do not allow public visitors to create privileged profiles.

The role field must only be changed through an authorized operation.

## 4. Events

Table: events

Fields:
- id: UUID primary key.
- name: TEXT, required.
- description: TEXT, optional.
- category: TEXT, required.
- scope: TEXT, required.
- event_date: DATE, optional.
- status: TEXT, required.
- default_template_id: UUID, optional.
- created_by: UUID referencing profiles.
- created_at: TIMESTAMPTZ.
- updated_at: TIMESTAMPTZ.

Suggested statuses:
- draft.
- active.
- completed.
- archived.

Validate category and scope values.

Prevent archived events from being used for new issuance unless explicitly permitted.

## 5. Award Categories

Table: award_categories

Fields:
- id: UUID primary key.
- event_id: UUID referencing events.
- name: TEXT, required.
- description: TEXT, optional.
- template_id: UUID, optional.
- status: TEXT.
- created_at: TIMESTAMPTZ.
- updated_at: TIMESTAMPTZ.

Examples:
- First Place.
- Second Place.
- Third Place.
- Finalist.
- Participation.
- Special Mention.

An event may have multiple award categories.

Use constraints to prevent unintended duplicate category names within the same event.

## 6. Templates

Table: templates

Fields:
- id: UUID primary key.
- name: TEXT, required.
- description: TEXT, optional.
- category: TEXT, optional.
- background_storage_path: TEXT, required.
- background_mime_type: TEXT, required.
- page_width: NUMERIC, required.
- page_height: NUMERIC, required.
- page_unit: TEXT, required.
- orientation: TEXT, required.
- field_configuration: JSONB, required.
- version_number: INTEGER, required.
- status: TEXT, required.
- created_by: UUID referencing profiles.
- created_at: TIMESTAMPTZ.
- updated_at: TIMESTAMPTZ.
- published_at: TIMESTAMPTZ, optional.

Suggested statuses:
- draft.
- published.
- archived.

Store field configuration in a validated, versioned JSON structure.

Do not store privileged credentials or raw secret data in this configuration.

Published template versions must be immutable. Create a new version when the design or field configuration changes.

## 7. Signatories

Table: signatories

Fields:
- id: UUID primary key.
- name: TEXT, required.
- designation: TEXT, required.
- signature_storage_path: TEXT, required.
- status: TEXT, required.
- usage_permissions: JSONB or normalized permission records.
- created_by: UUID referencing profiles.
- created_at: TIMESTAMPTZ.
- updated_at: TIMESTAMPTZ.

Possible statuses:
- active.
- inactive.

Restrict access to signature assets.

Do not expose signature images through publicly readable storage buckets.

## 8. Event Signatories

Table: event_signatories

Fields:
- id: UUID primary key.
- event_id: UUID referencing events.
- signatory_id: UUID referencing signatories.
- award_category_id: UUID, optional.
- created_at: TIMESTAMPTZ.

This table specifies which signatories may be used for an event or category.

Enforce appropriate foreign keys and uniqueness constraints.

## 9. Issuance Batches

Table: issuance_batches

Fields:
- id: UUID primary key.
- event_id: UUID referencing events.
- status: TEXT, required.
- original_filename: TEXT, optional.
- total_rows: INTEGER.
- valid_rows: INTEGER.
- issued_count: INTEGER.
- failed_count: INTEGER.
- created_by: UUID referencing profiles.
- confirmed_at: TIMESTAMPTZ, optional.
- completed_at: TIMESTAMPTZ, optional.
- created_at: TIMESTAMPTZ.
- updated_at: TIMESTAMPTZ.

Suggested statuses:
- draft.
- validating.
- awaiting_approval.
- processing.
- partially_completed.
- completed.
- failed.
- cancelled.

Store row-level results in a related batch item table if necessary.

Do not store uploaded CSV files indefinitely unless there is an explicit retention requirement.

## 10. Certificates

Table: certificates

Fields:
- id: UUID primary key.
- verification_code: CHAR(6), required and unique.
- event_id: UUID referencing events.
- award_category_id: UUID referencing award_categories.
- template_id: UUID referencing templates.
- template_version: INTEGER, required.
- batch_id: UUID referencing issuance_batches, optional.
- recipient_name: TEXT, required.
- recipient_email: TEXT, optional.
- achievement: TEXT, required.
- event_name_snapshot: TEXT, required.
- organization_name_snapshot: TEXT, required.
- event_date_snapshot: DATE, optional.
- issue_date: DATE, required.
- issued_at: TIMESTAMPTZ, required.
- issued_by: UUID referencing profiles.
- status: TEXT, required.
- revocation_date: TIMESTAMPTZ, optional.
- revocation_reason_internal: TEXT, optional.
- revocation_reason_public: TEXT, optional.
- template_snapshot: JSONB, required.
- signatory_snapshot: JSONB, required.
- pdf_storage_path: TEXT, optional.
- created_at: TIMESTAMPTZ.
- updated_at: TIMESTAMPTZ.

Possible statuses:
- issued.
- revoked.

Draft certificates should be stored separately or represented in a clearly separated draft workflow. They must never appear as valid public records.

Use a unique constraint on verification_code.

Use appropriate indexes on:
- verification_code.
- event_id.
- award_category_id.
- status.
- issued_at.
- recipient_name.

Consider a normalized recipient search strategy for larger datasets.

Do not store a full PDF binary inside a database row.

The template and signatory snapshots must preserve the information necessary to reproduce or audit the original issuance.

## 11. Certificate Signatories

Table: certificate_signatories

Fields:
- id: UUID primary key.
- certificate_id: UUID referencing certificates.
- signatory_id: UUID referencing signatories.
- name_snapshot: TEXT, required.
- designation_snapshot: TEXT, required.
- signature_asset_snapshot_path: TEXT, optional.
- display_order: INTEGER.
- created_at: TIMESTAMPTZ.

The snapshot preserves the identity and designation used when issuing the certificate.

If exact historical reproduction is required, preserve the exact signature asset version or an immutable reference to it.

Do not assume that the current signatory profile represents a historical certificate.

## 12. Audit Logs

Table: audit_logs

Fields:
- id: UUID primary key.
- actor_id: UUID referencing profiles, optional for system events.
- action: TEXT, required.
- target_type: TEXT, required.
- target_id: UUID, optional.
- metadata: JSONB.
- created_at: TIMESTAMPTZ.

Examples:
- certificate.issued.
- certificate.revoked.
- template.published.
- signatory.updated.
- role.changed.
- event.updated.

Do not store passwords, authentication tokens, privileged keys, or unnecessary sensitive data in audit metadata.

Restrict read access to authorized administrators.

Ordinary application users must not be able to update or delete audit records.

## 13. Relationships

- One event has many award categories.
- One event may use many templates.
- One template has multiple versions.
- One event may have many authorized signatories.
- One signatory may be authorized for multiple events.
- One event has many certificates.
- One award category has many certificates.
- One template version may be used for many certificates.
- One issuance batch may contain many certificates.
- One certificate may have multiple signatories.
- One administrator may issue many certificates.
- One administrator may generate many audit events.

Use explicit foreign keys and validate cross-table relationships.

## 14. Security Policies

### Public Access

Public visitors may only query a restricted verification interface.

Expose only:
- Certificate status.
- Recipient name.
- Event name.
- Achievement.
- Organization name.
- Issue date.
- Public certificate identifier.
- Approved public revocation information.

Never expose:
- Recipient email unless explicitly approved for public display.
- Internal notes.
- Signature-management metadata.
- Administrator accounts.
- Audit logs.
- Private storage paths or signed URLs.
- Draft records.

Prefer a narrow database function or controlled API for verification rather than broad public SELECT access.

If a database function is used:
- Define its permissions explicitly.
- Use a fixed, safe search path.
- Validate the input.
- Return only permitted fields.
- Prevent callers from supplying arbitrary query parameters.

### Administrator Access

- Every privileged operation requires authorization.
- Super-admin privileges cannot be self-assigned.
- Role changes must be restricted.
- Storage policies must match database permissions.
- RLS policies must be tested against unauthorized access.

## 15. Critical Issuance Integrity

Certificate issuance must be idempotent or safely retryable.

The issuance process must:
1. Validate the administrator's permission.
2. Validate the event, template, category, and signatories.
3. Allocate a unique verification code.
4. Create the official certificate record.
5. Commit the record successfully.
6. Generate or finalize the corresponding PDF.
7. Store the PDF where configured.
8. Report the result accurately.

For a browser-first implementation, persist the official record before declaring issuance successful. Handle failures after persistence without creating duplicate records.

If PDF generation or storage fails after record creation, provide a controlled recovery workflow to regenerate the PDF without issuing a second certificate.

Where an operation requires atomic changes across multiple records, use a trusted transactional database operation.

## 16. Migration and Recovery

- Store schema changes as SQL migration files.
- Do not modify production schema manually without recording the change.
- Test migrations against a clean database.
- Document required seed data.
- Document initial super-admin provisioning.
- Document backup limitations on the selected hosting plan.
- Define a recovery procedure before relying on the application for important certificates.

## 17. Future Multi-Organization Support

Do not implement a complex multi-tenant platform in the first release.

However, keep the schema extensible.

Before enabling multiple organizations:
- Add explicit organization ownership.
- Add tenant-aware authorization.
- Enforce organization boundaries in all queries and storage policies.
- Test cross-organization isolation.
- Define how global administrators differ from organization administrators.

Do not assume that adding an organization dropdown alone creates secure multi-tenancy.