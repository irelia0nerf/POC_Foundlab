# FoundLab Snapshot Alpha

This repository contains a full snapshot of reputation data, schema, and infrastructure for deploying on Google Cloud.

## 🚀 Quickstart

```bash
git clone https://github.com/foundlab/foundlab-snapshot-alpha.git
cd foundlab-snapshot-alpha
terraform init
terraform apply -var="project_id=YOUR_PROJECT_ID"

# Generate NDJSON file from CSV
python data/read_foundlab_snapshot.py > data/foundlab_reputation_snapshot_alpha.ndjson

# Load to BigQuery
bash scripts/load_to_bigquery.sh
```

## Contents

- `/terraform` - Infrastructure as Code
- `/scripts` - CLI tools
- `/data` - CSV, JSON, NDJSON and schema
- `README.md`, `LICENSE`, `SECURITY.md`, `CODEOWNERS`

## GitHub Bootstrap Command

```bash
git init
gh repo create foundlab-snapshot-alpha --public --source=. --remote=origin --push
```

## License

MIT © FoundLab 2025
