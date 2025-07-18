
provider "google" {
  project = var.project_id
  region  = "us-central1"
}

resource "google_storage_bucket" "foundlab_snapshots" {
  name     = "foundlab-snapshots"
  location = "US"
  force_destroy = true
}

resource "google_bigquery_dataset" "foundlab" {
  dataset_id                  = "foundlab_snapshots"
  friendly_name               = "FoundLab Reputation Snapshots"
  description                 = "Dataset com snapshots reputacionais da infraestrutura FoundLab"
  location                    = "US"
  delete_contents_on_destroy = true
}

resource "google_bigquery_table" "snapshot_alpha" {
  dataset_id = google_bigquery_dataset.foundlab.dataset_id
  table_id   = "reputation_snapshot_alpha"
  deletion_protection = false

  schema = file("${path.module}/../foundlab_bigquery_schema.json")

  time_partitioning {
    type = "DAY"
    field = "timestamp"
  }
}
