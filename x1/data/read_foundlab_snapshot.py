
import pandas as pd
import json

# Caminho para o CSV institucional da FoundLab
csv_path = "foundlab_reputation_snapshot_alpha.csv"

# Carregar o CSV
df = pd.read_csv(csv_path)

# Iterar pelas linhas e imprimir como JSON individual
for idx, row in df.iterrows():
    entry = {
        "timestamp": row["timestamp"],
        "wallet": row["wallet"],
        "origin_type": row["origin_type"],
        "origin_label": row["origin_label"],
        "to": row["to"],
        "protocol_type": row["protocol_type"],
        "token": row["token"],
        "value": row["value"] if pd.notna(row["value"]) else None,
        "action": row["action"],
        "risk_score": int(row["risk_score"]),
        "flags": json.loads(row["flags"].replace("'", '"')),
        "verdict": row["verdict"],
        "justification": row["justification"]
    }
    print(json.dumps(entry, indent=2))
