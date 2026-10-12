# Contributing to Namdapha Certificate Portal

Thank you for your interest in contributing! We welcome enhancements, bug fixes, and suggestions to make this platform even better.

## Development Workflow

1. **Fork & Clone**
   ```bash
   git clone https://github.com/Techy-prashant/Certificate-Generator.git
   cd Certificate-Generator
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Branching Strategy**
   - Create a feature branch: `git checkout -b feat/your-feature-name`
   - Create a fix branch: `git checkout -b fix/your-fix-name`

4. **Code Standards**
   - Use TypeScript strict mode with no implicit `any`.
   - Run typecheck before committing: `npm run lint`
   - Run unit and integration tests: `npm test`
   - Build for production verification: `npm run build`

5. **Submitting a Pull Request**
   - Ensure all automated tests pass.
   - Provide a clear, descriptive title and summary of changes.
   - Reference any relevant issues.
