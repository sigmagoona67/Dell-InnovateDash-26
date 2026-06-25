terraform {
  required_version = ">= 1.5"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 6.0"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

resource "google_container_cluster" "carebridge" {
  name     = var.cluster_name
  location = var.region

  remove_default_node_pool = true
  initial_node_count       = 1

  workload_identity_config {
    workload_pool = "${var.project_id}.svc.id.goog"
  }
}

resource "google_container_node_pool" "default" {
  name       = "${var.cluster_name}-pool"
  location   = var.region
  cluster    = google_container_cluster.carebridge.name
  node_count = var.node_count

  node_config {
    machine_type = var.node_machine_type
    oauth_scopes = ["https://www.googleapis.com/auth/cloud-platform"]
  }
}

resource "google_sql_database_instance" "carebridge" {
  name             = "${var.cluster_name}-postgres"
  database_version = "POSTGRES_16"
  region           = var.region

  settings {
    tier = var.db_tier

    ip_configuration {
      ipv4_enabled = true
    }

    backup_configuration {
      enabled = true
    }
  }

  deletion_protection = var.deletion_protection
}

resource "google_sql_database" "carebridge" {
  name     = "carebridge"
  instance = google_sql_database_instance.carebridge.name
}

resource "google_sql_user" "carebridge" {
  name     = var.db_username
  instance = google_sql_database_instance.carebridge.name
  password = var.db_password
}

output "database_url" {
  value     = "postgresql://${var.db_username}:${var.db_password}@${google_sql_database_instance.carebridge.public_ip_address}:5432/carebridge?sslmode=require"
  sensitive = true
}

output "gke_cluster_name" {
  value = google_container_cluster.carebridge.name
}

output "gke_region" {
  value = var.region
}

output "helm_install_command" {
  value = "helm upgrade --install carebridge ../../helm/carebridge -n carebridge --create-namespace --set database.url=<DATABASE_URL>"
}

output "kubectl_credentials_command" {
  value = "gcloud container clusters get-credentials ${google_container_cluster.carebridge.name} --region ${var.region} --project ${var.project_id}"
}
