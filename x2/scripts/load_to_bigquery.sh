#!/bin/bash

# Caminho dos arquivos (relativo à pasta x2)
SCHEMA_FILE="data/foundlab_bigquery_schema.json"
DATA_FILE="data/foundlab_reputation_snapshot.ndjson" # <-- NOME CORRIGIDO
DATASET="foundlab_snapshots"
TABLE="reputation_snapshot_alpha"

echo "Carregando dados no BigQuery..."

bq load --source_format=NEWLINE_DELIMITED_JSON \
  --schema=${SCHEMA_FILE} \
  ${DATASET}.${TABLE} \
  ${DATA_FILE}

# Checa se o último comando (bq load) foi bem sucedido
if [ $? -eq 0 ]; then
    echo "Ingestão concluída com sucesso."
else
    echo "Ocorreu um erro durante a ingestão."
fi