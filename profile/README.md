# claritas-viz-test

Independent acceptance organization for **claritas-viz**.

Visualization SDK, API, rendering, export, Flutter/web UI, accessibility, and large-dataset certification.

## Portfolio

| Repository | Class | Readiness | Primary dependency path |
|---|---|---|---|
| `clients-consumer-matrix` | SDK consumer | `planned_dependency` | `matrix` |
| `api-contract` | API contract | `ready` | `matrix` |
| `flutter-ui-e2e` | mobile/emulator | `planned_dependency` | `matrix` |
| `web-ui-e2e` | browser E2E | `ready` | `matrix` |
| `rendering-golden` | UI/accessibility | `ready` | `matrix` |
| `large-dataset-performance` | performance/scale | `ready` | `matrix` |
| `export-accessibility` | UI/accessibility | `ready` | `matrix` |

Pull requests run deterministic harness checks. Emulators, desktop matrices, live APIs/providers, databases, chaos, scale, and soaks are scheduled/manual. Missing upstreams or credentials are blocked readiness—not false passes or product regressions.

<!-- org-project-routing:start -->
## Planning and delivery

- [GitHub Project: claritas-viz-test-project](https://github.com/orgs/claritas-viz-test/projects/1)
- [Linear planning project](https://linear.app/denman/project/githubcomclaritas-viz-test-be061b785d84)
- [Detailed project-routing contract](../docs/PROJECTS.md)

GitHub owns code and delivery evidence; Linear owns planning and dependencies. The linked organization Project provides the cross-repository execution view.
<!-- org-project-routing:end -->


<!-- ore-org-baseline:begin -->
## Planning and governance

- Canonical Linear project: https://linear.app/denman/project/githubcomclaritas-viz-test-be061b785d84
- Organization defaults: https://github.com/claritas-viz-test/.github
- Canonical agent policy: https://github.com/claritas-viz-test/.github/blob/main/agents.md
- Security policy: https://github.com/claritas-viz-test/.github/security/policy

Repositories in this organization use semantic conflict resolution with 3–10 relevant prior commits when useful, full cross-repository context, pull-request delivery, and a hard automated-agent denylist for destructive or history-rewriting operations.
<!-- ore-org-baseline:end -->
