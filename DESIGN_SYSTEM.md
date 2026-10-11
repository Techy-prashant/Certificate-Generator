# Design System — Namdapha Certificate Portal

## 1. Design Direction

Create a premium institutional SaaS interface using the design direction:

Midnight Violet + Warm Ivory.

The interface should feel:
- Professional.
- Trustworthy.
- Modern.
- Organized.
- Minimal.
- Efficient.

Avoid generic dashboard aesthetics and excessive decorative elements.

The dashboard is a workspace for issuing official documents. Clarity and usability are more important than visual effects.

## 2. Colour Tokens

### Brand

- Midnight: #191724
- Primary Violet: #7760B5
- Warm Ivory: #F7F5F0
- Antique Gold: #D9C7A1
- White: #FFFFFF

### Neutral Colours

- Main text: #252330
- Secondary text: #6E6A78
- Subtle borders: #E7E3EB
- Muted surfaces: #F0EDF5
- Input background: #FFFFFF

### Status Colours

Success:
- Text: #17653C
- Background: #E2F4E9

Pending:
- Text: #8C5800
- Background: #FFF0D7

Error:
- Text: #A52A2A
- Background: #FBE5E5

Information:
- Use accessible violet or blue tones.

Do not communicate status using colour alone. Include a text label and an appropriate icon where useful.

## 3. Typography

Use Inter or a similar modern sans-serif.

Suggested hierarchy:
- Page title: 28–32px.
- Section title: 20–24px.
- Card title: 16–18px.
- Body text: 14–16px.
- Supporting text: 12–14px.
- Compact table text: 13–14px.

Use consistent font weights:
- Regular for body copy.
- Medium for labels and navigation.
- Semibold for headings and important values.

Avoid excessively large typography inside operational dashboards.

Use tabular numerals for codes, counts, and identifiers where appropriate.

Certificate typography is independent of dashboard typography and must be configurable per template.

## 4. Spacing

Use an 8px spacing system.

Suggested values:
- 4px: tight icon alignment.
- 8px: compact gaps.
- 16px: standard component spacing.
- 24px: card and section spacing.
- 32px: large section separation.
- 40–48px: major page-level spacing.

Avoid inconsistent arbitrary spacing values.

## 5. Layout

### Desktop

- Fixed or sticky left sidebar.
- Main content area with consistent horizontal padding.
- Clear page header.
- Breadcrumbs for nested workflows where useful.
- Primary action in a predictable position.
- Tables and forms aligned to a consistent grid.

### Tablet

- Collapsible sidebar.
- Reduced horizontal padding.
- Responsive table handling.
- Forms that adapt to available width.

### Mobile

- Collapsible navigation drawer.
- Single-column forms.
- Stacked action buttons when necessary.
- Scrollable tables or mobile-friendly record cards.
- Touch-friendly controls.
- No horizontal overflow in the primary interface.

## 6. Admin Sidebar

Brand area:
- Small award or certificate icon.
- NAMDAPHA wordmark.
- Certificate System subtitle.

Navigation:
- Overview.
- Events.
- Templates.
- Certificates.
- Signatures.
- Verification Registry.
- Team & Permissions.
- Audit Logs.
- Settings.

Use Lucide icons consistently.

Highlight the active route with a subtle violet surface and clear text contrast.

Avoid oversized icons or multiple competing accent colours.

## 7. Dashboard

Include:
- Page title and short supporting text.
- Primary Create Certificate action.
- Key operational metrics.
- Recent activity.
- Recent events.
- Drafts requiring attention.

Metric cards should be compact and informative.

Do not display fake production numbers.

Show empty states when the organization has no events or certificates.

## 8. Buttons

Primary:
- Violet background.
- White text.
- Clear hover and focus states.

Secondary:
- Neutral or white background.
- Subtle border.

Destructive:
- Red styling reserved for revocation and other dangerous actions.

Ghost:
- Minimal background for low-priority actions.

Button rules:
- Every button must perform a real action.
- Show disabled states when required data is missing.
- Show loading states during operations.
- Prevent repeated submission where appropriate.
- Provide clear success or error feedback.
- Require confirmation for irreversible or high-impact actions.

## 9. Forms

- Always use visible labels.
- Use helpful placeholders only as supplementary guidance.
- Explain validation errors next to the relevant field.
- Mark required fields clearly.
- Preserve valid input after non-destructive errors.
- Avoid losing entered data on navigation.
- Use grouped sections for long forms.
- Avoid presenting too many fields in one dense block.

For certificate issuance, use a clear multi-step workflow:
1. Event and category.
2. Recipient details.
3. Template and signatures.
4. Preview.
5. Issue.

Allow users to go back and correct information before final issuance.

## 10. Tables and Lists

Provide:
- Clear column labels.
- Consistent row height.
- Sorting where useful.
- Search and filters.
- Pagination for large datasets.
- Status labels.
- Row actions.
- Empty and error states.

Avoid overcrowded tables.

On mobile, prioritize recipient, event, date, and status, with secondary details available in the record view.

## 11. Status Indicators

Use consistent labels:
- Draft.
- Pending Review.
- Approved.
- Issued.
- Revoked.
- Failed.
- Processing.

Never show a green Valid status based solely on a local PDF or a client-side flag.

The verification status must reflect the authoritative registry record.

## 12. Template Studio

The template editor is a core product feature and deserves a dedicated workspace.

### Layout

Top toolbar:
- Template name.
- Save status.
- Undo/redo if implemented.
- Preview.
- Save Draft.
- Publish.

Left panel:
- Available field types.
- Field list.
- Add-field controls.

Center:
- Certificate canvas.
- Zoom controls.
- Page boundary.
- Alignment guides.
- Selected-field outline.
- Optional grid.

Right panel:
- Position.
- Width and height.
- Font.
- Size.
- Colour.
- Alignment.
- Wrapping.
- Required status.
- Field-specific options.

### Canvas Behavior

- Keep the certificate page centered.
- Preserve its aspect ratio.
- Use a consistent internal coordinate system.
- Scale the canvas visually without changing stored coordinates.
- Support drag and resize interactions.
- Show clear selection states.
- Allow keyboard movement where practical.
- Prevent accidental page overflow.
- Warn about overlapping fields.
- Persist configuration.
- Provide undo/redo if practical without compromising saved data.

### Field Defaults

Recipient name:
- Centered by default.
- Supports shrink-to-fit.
- Supports long names.

Event name:
- Supports wrapping or shrink-to-fit.

Achievement:
- Supports clear emphasis.

Signature:
- Preserves aspect ratio.
- Associates with a selected authorized signatory.

QR code:
- Maintains square dimensions.
- Remains large enough to scan reliably.

Verification code:
- Uses readable typography.
- Remains visible in the exported PDF.

### Preview

Use representative sample data.

Include:
- Long recipient names.
- Long event names.
- Different award positions.
- Multiple signatures.
- Missing optional values.
- Different certificate categories.

The preview and PDF output must use consistent layout calculations.

## 13. Certificate Issuance Interface

Use a guided workflow with a persistent step indicator.

The review step must display:
- Recipient.
- Event.
- Achievement.
- Template.
- Signatories.
- Issue date.
- Verification-code placement.
- QR-code placement.

The final action should clearly state that the certificate will be issued and recorded.

Do not use vague button labels such as "Continue" for the final issuance action.

## 14. Bulk Issuance Interface

Provide a step-based workflow:
1. Upload CSV.
2. Map columns.
3. Validate.
4. Preview.
5. Confirm.
6. Process.
7. Download results.

Use a clear validation summary:
- Total rows.
- Valid rows.
- Invalid rows.
- Duplicate rows.
- Missing values.

Display row-level errors and allow correction or re-upload.

Never imply that failed records were issued.

## 15. Public Verification Interface

The public portal must use a simpler layout than the admin application.

Design:
- Light background.
- Minimal header.
- Clear organization identity.
- Large verification heading.
- Six-digit code input.
- Verify action.
- QR-code guidance.
- Short explanation of the verification process.

Keep the public page free of administrative navigation.

### Verification Results

Valid:
- Clear positive status.
- Recipient name.
- Event name.
- Achievement.
- Organization.
- Issue date.
- Certificate identifier.

Revoked:
- Clear negative status.
- Revocation date.
- Approved public explanation, if available.

Not Found:
- Neutral message.
- Clear option to retry.

Do not expose internal database IDs, private notes, administrator details, or storage credentials.

## 16. Modals and Confirmations

Use dialogs for:
- Revoking a certificate.
- Publishing a template.
- Confirming bulk issuance.
- Changing important permissions.
- Archiving records.

Explain the consequence of the action.

For revocation, require an appropriate reason and clear confirmation.

## 17. Feedback and Motion

Use subtle transitions for:
- Dialog appearance.
- Sidebar interactions.
- Loading indicators.
- Toast notifications.
- Selection states.

Avoid distracting animation.

Respect reduced-motion preferences.

Provide useful error messages and recovery actions.

## 18. Accessibility

- Use semantic HTML.
- Provide labels for inputs.
- Ensure keyboard navigation.
- Provide visible focus indicators.
- Maintain adequate contrast.
- Do not rely on colour alone.
- Use accessible dialog behavior.
- Provide meaningful alternative text for relevant images.
- Avoid tiny interactive targets.

## 19. Responsive and Visual QA

Test:
- Dashboard at desktop width.
- Forms at tablet width.
- Public verification on mobile.
- Template Studio at supported widths.
- Long text and empty states.
- Tables with many records.
- Dialogs and notifications.
- Loading and error states.

The interface should remain functional even if some screens require horizontal scrolling for complex editing controls.

## 20. Design Consistency

Before creating a new component:
1. Check whether an existing shared component can be reused.
2. Use existing design tokens.
3. Match existing interaction patterns.
4. Update shared components instead of creating unnecessary duplicates.

Do not invent a new colour palette, button style, spacing system, or navigation pattern for individual pages.