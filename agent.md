# Agent Instructions — Namdapha Certificate Portal

## 1. Read Before Working

Before modifying code, read:
- PROJECT_SPEC.md
- IMPLEMENTATION_PLAN.md
- DATABASE_SCHEMA.md
- DESIGN_SYSTEM.md
- QA_CHECKLIST.md

Inspect the existing repository, package scripts, current implementation, and Git status before making changes.

Treat these documents as the source of truth. If a conflict exists, identify it and propose a resolution instead of silently choosing an interpretation.

## 2. Engineering Principles

- Use React, Vite, TypeScript, and the approved project stack.
- Enable strict TypeScript checks.
- Prefer small, reusable components.
- Separate UI components, business logic, database access, and PDF generation.
- Keep data models and validation schemas explicit.
- Use descriptive names.
- Avoid unnecessary dependencies.
- Avoid duplicated business logic.
- Preserve existing working functionality.
- Do not rewrite unrelated parts of the application.
- Never hide errors merely to make the interface appear successful.

## 3. Mandatory Security Rules

- Never expose service-role keys, database passwords, or privileged credentials in frontend code.
- Never commit `.env` files containing secrets.
- Maintain `.env.example` with placeholder values only.
- Enforce authorization through trusted database policies or backend operations.
- Do not rely on hidden buttons or frontend route guards for security.
- Keep public verification responses restricted to approved fields.
- Restrict signature and template management to authorized users.
- Validate uploads, file sizes, and file types.
- Never allow public users to issue or revoke certificates.
- Do not hard-delete issued certificates through ordinary application workflows.
- Preserve audit history.
- Never claim a certificate is valid solely because a PDF exists.
- A certificate is valid only when its registry record exists and its status permits validity.

## 4. Database Rules

- Use version-controlled SQL migrations.
- Document table relationships and constraints.
- Enable Row Level Security on relevant tables.
- Create explicit policies for each access pattern.
- Enforce verification-code uniqueness in the database.
- Use transactions or equivalent trusted operations for critical issuance workflows.
- Prevent duplicate issuance during retries.
- Do not treat browser-generated IDs as proof of authorization.
- Store timestamps consistently.
- Preserve template versions and certificate snapshots.
- Do not store privileged operations only in client-side state.
- Test unauthorized database access.

## 5. Certificate Issuance Rules

The database is the authoritative certificate registry.

The PDF is the rendered certificate document.

The verification page reads the official record and reports its status.

Never mark a certificate as issued before its official database record is committed.

If issuance fails:
- Show a meaningful error.
- Preserve enough state for a safe retry.
- Avoid creating duplicate records.
- Do not show a false success notification.

Generate unique six-digit codes securely and handle collisions.

QR codes must point to the correct public verification URL.

Issued certificates must preserve the exact relevant metadata, template version, and signatories used at issuance.

## 6. Template Editor Rules

- Persist all field positions and settings.
- Use a consistent coordinate system.
- Clearly define page dimensions and units.
- Keep preview and PDF rendering calculations consistent.
- Support long names and long event titles.
- Warn about fields extending outside page boundaries.
- Preserve aspect ratios for images, signatures, and QR codes.
- Do not use fixed positions that work only at one browser viewport size.
- Test exported PDFs, not just browser previews.
- Do not silently overwrite a published template version.

## 7. UI and Design Rules

Read DESIGN_SYSTEM.md before creating or modifying interface components.

- Use the approved colour palette and typography.
- Use shared components for buttons, inputs, cards, tables, dialogs, and status indicators.
- Maintain consistent spacing and layout.
- Support desktop, tablet, and mobile screens.
- Include loading, empty, error, success, and confirmation states.
- Use accessible labels and keyboard navigation.
- Avoid decorative elements that reduce clarity.
- Do not invent additional design systems for individual pages.
- Do not introduce inconsistent icons or colours.
- Never use fake statistics in production views.

## 8. Code Quality

Before considering a milestone complete:

1. Run the TypeScript checks.
2. Run linting.
3. Run relevant automated tests.
4. Run a production build.
5. Inspect affected routes.
6. Test important interactions.
7. Review authorization implications.
8. Update documentation where needed.

Fix failures introduced by your changes.

Do not suppress type errors, disable tests, or weaken security rules merely to make the build pass.

## 9. Dependency Management

Before adding a dependency:
- Confirm it is necessary.
- Check compatibility with the current stack.
- Prefer maintained, well-documented libraries.
- Avoid adding multiple libraries for the same task.

Document important dependency decisions.

## 10. Implementation Discipline

Work in the milestones defined in IMPLEMENTATION_PLAN.md.

Implement only the approved milestone unless a prerequisite fix is necessary.

Before each task:
- Read relevant source files.
- Identify dependencies.
- Define acceptance criteria.
- Identify security risks.

After each task:
- Test the implementation.
- Fix regressions.
- Update the implementation plan.
- Report incomplete functionality honestly.

Do not declare a feature complete because its page or button exists.

## 11. Git and File Safety

- Inspect Git status before significant changes.
- Do not discard unrelated user changes.
- Do not delete files without understanding their purpose.
- Do not rewrite project configuration unnecessarily.
- Keep migrations and documentation under version control.
- Never overwrite existing environment credentials.

## 12. Required Completion Report

At the end of every milestone, report:

- Files created or changed.
- Features implemented.
- Tests executed and their actual results.
- Known bugs or limitations.
- Required manual setup.
- Security considerations.
- Remaining acceptance criteria.
- Recommended next milestone.

Never invent successful test results, configured external services, or completed functionality.