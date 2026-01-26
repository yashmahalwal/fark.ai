# fark-ai

GitHub Action for Fark AI

## Usage

```yaml
name: Example Workflow
on: [push]

jobs:
  run-action:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: ./ # or your-org/fark-ai@v1
        # with:
        #   name: 'Custom Name'
```

## Inputs

<!-- Add your inputs documentation here -->
<!--
| Input | Description | Required | Default |
|-------|-------------|----------|---------|
| name  | Name to use in greeting | No | 'World' |
-->

## Outputs

<!-- Add your outputs documentation here -->
<!--
| Output | Description |
|--------|-------------|
| result | The result of the action |
-->

## Development

### Build

```bash
npm install
npm run build
```

### Test

```bash
npm test
```

## License

MIT
