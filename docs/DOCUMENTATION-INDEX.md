# Documentation Index

**Complete guide to all framework documentation**

**Last Updated:** 2026-02-23

---

## Available Documentation

### 1. fixtures-documentation.md

**Comprehensive Fixtures Guide**

**Contains:**
- Complete fixture catalog (3 fixtures) with detailed analysis
- Usage table — which test files use which fixture
- DRY & SOLID principles analysis
- Decision matrix (which fixture to use when)

**Key Facts:**
- **3 fixtures** in `tests/fixtures/`: `pom-eager-fixture`, `pom-lazy-fixture`, `api-test-fixture`
- All fixtures use `HelperFactory` for consistent helper creation
- UI fixtures provide `{ pomXxx, logger }` — helpers live inside page objects
- API fixture provides `{ apiActions, assert }` — no POM

**Read this to:** understand what each fixture does, decide which fixture to use for a new test.

---

### 2. design-patterns-analysis.md

**Comprehensive Design Patterns Analysis**

**Contains:**
- 11 implemented patterns with real code examples
- 7 recommended patterns (Phase 2–4)
- Implementation roadmap and pattern comparison matrix

**Implemented patterns (11):**
1. Page Object Model
2. Manager Pattern (Eager/Lazy)
3. Fixture Pattern (Dependency Injection)
4. Helper/Wrapper Pattern
5. Adapter Pattern — **StepRunner** (`test.step()` integration)
6. Factory Pattern — `HelperFactory`, `PageFactory`
7. Centralized Logging (Winston + multi-transport)
8. Endpoint Abstraction
9. Data-Driven Testing
10. Network Interception
11. Builder Pattern — `UserBuilder`

**Phase 1 complete:** Builder + Factory + StepRunner all implemented.

**Read this to:** understand all design patterns, plan future enhancements.

---

### 3. logging-guide.md

**Complete Logging Guide — Winston & StepRunner**

**Contains:**
- Dual-channel logging architecture (Winston + Playwright `test.step()`)
- Three Winston transports: console, rotating file, HTML report
- `StepRunner` — how it bridges Winston logs and the Playwright HTML report
- Log levels, category naming conventions
- Usage patterns for page objects, helpers, fixtures, test specs
- Global teardown integration (`Logger.shutdown()` + `generateHtmlReport()`)
- Troubleshooting guide

**Read this to:** add logging to new components, understand log levels, generate HTML reports, configure logging, debug logging issues.

---

### 4. framework-faq.md

**Frequently Asked Questions & Quick Reference**

**Contains:**
- Core concept explanations (fixtures, POM, helpers, logging, patterns)
- How-to answers for common tasks
- Troubleshooting checklist
- Quick reference: commands and import paths

**Read this to:** get quick answers, understand core concepts, debug test failures.

---

## Documentation by Topic

### Design Patterns
- **Complete Analysis:** `design-patterns-analysis.md`
- **FAQ:** `framework-faq.md` — Design Patterns section

### Fixtures
- **Comprehensive Guide:** `fixtures-documentation.md`
- **FAQ:** `framework-faq.md` — Fixtures section

### Logging
- **Complete Guide:** `logging-guide.md`
- **FAQ:** `framework-faq.md` — Logging section

### Page Objects
- **FAQ:** `framework-faq.md` — Page Objects section
- **Examples:** `src/pages/`

### Testing Strategies
- **Data-Driven:** `framework-faq.md` — Testing Strategies
- **API Mocking:** `framework-faq.md` — Testing Strategies

### Troubleshooting
- **Debug Guide:** `framework-faq.md` — Troubleshooting

---

## Quick Navigation

| I want to... | Document | Section |
|---|---|---|
| Understand fixtures | `fixtures-documentation.md` | Fixture Catalog |
| Choose which fixture to use | `fixtures-documentation.md` | Decision Matrix |
| Learn all design patterns | `design-patterns-analysis.md` | All sections |
| Understand StepRunner | `logging-guide.md` | StepRunner section |
| Add logging | `logging-guide.md` | Usage Patterns |
| Debug test failures | `framework-faq.md` | Troubleshooting |
| Create a new page object | `framework-faq.md` | Page Objects |
| Implement data-driven tests | `framework-faq.md` | Testing Strategies |
| Mock API responses | `framework-faq.md` | Testing Strategies |
| Find import paths | `framework-faq.md` | Quick Reference |

---

## Current Framework State

### Design Patterns
- **Implemented:** 11 patterns
- **Phase 1:** Complete (Builder + Factory + StepRunner)
- **Phase 2:** Recommended — Repository Pattern
- **Phase 3:** Recommended — Strategy + Decorator

### Fixtures
- **Total:** 3 fixtures (all in `tests/fixtures/`)
- **UI Fixtures:** `pom-eager-fixture`, `pom-lazy-fixture`
- **API Fixture:** `api-test-fixture`

### Test Files
- **Total:** 7 test files
- **UI Tests:** 5 files (`tests/ui/specs/`)
- **API Tests:** 2 files (`tests/api/specs/`)

### Documentation
- **Total:** 5 documents (all in `docs/`)

---

## Learning Path

**New to the framework? Read in this order:**

1. `framework-faq.md` — Core concepts (fixtures, POM, helpers, logging)
2. `fixtures-documentation.md` — Deep dive into fixtures
3. `design-patterns-analysis.md` — All design patterns
4. `logging-guide.md` — Master logging and test.step() integration

**Experienced? Jump to:**
- `fixtures-documentation.md` → Decision Matrix
- `design-patterns-analysis.md` → Phase 2–4 recommended patterns
- `framework-faq.md` → Troubleshooting

---

**Index Maintained By:** Test Automation Team
**Version:** 2.0
**Last Updated:** 2026-02-23
