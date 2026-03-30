# Examples (Breaking Changes)

The backend diff analyzer identifies breaking API interface changes from the PR diff, then the frontend impact finder scans the checked-out frontend repositories to confirm where the breaks affect real code, and finally the poster posts inline review comments.

## Example: Single breaking change type

- Address contract restructure: [PR #4](https://github.com/yashmahalwal/fark-backend-demo/pull/4)

Why this example is useful:

- It’s a clear “object structure changed” / “field shape changed” break, so the expected impacts are localized to request/response parsing and usage in UI components.

## Example: Multiple breaking changes

- User API breaking changes (field rename, enum value added, nullable-to-required, field removal): [PR #5](https://github.com/yashmahalwal/fark-backend-demo/pull/5)

Why this example is useful:

- It exercises multiple change types in one PR, which stresses batching and comment generation across different API surface elements.

