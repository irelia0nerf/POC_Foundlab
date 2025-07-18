
#!/bin/bash

# Caminho dos arquivos
SCHEMA_FILE="foundlab_bigquery_schema.json"
DATA_FILE="foundlab_reputation_snapshot_alpha.ndjson"
DATASET="foundlab_snapshots"
TABLE="reputation_snapshot_alpha"

echo "Carregando dados no BigQuery..."
bq load --source_format=NEWLINE_DELIMITED_JSON \
  --schema=${SCHEMA_FILE} \
  ${DATASET}.${TABLE} \
  ${DATA_FILE}

echo "Ingestão concluída com sucesso."
