terraform {
  required_version = ">= 1.5"
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 4.0"
    }
  }
}

provider "azurerm" {
  features {}
}

resource "azurerm_resource_group" "carebridge" {
  name     = var.resource_group_name
  location = var.location
}

resource "azurerm_virtual_network" "carebridge" {
  name                = "${var.cluster_name}-vnet"
  address_space       = [var.vpc_cidr]
  location            = azurerm_resource_group.carebridge.location
  resource_group_name = azurerm_resource_group.carebridge.name
}

resource "azurerm_subnet" "aks" {
  name                 = "aks"
  resource_group_name  = azurerm_resource_group.carebridge.name
  virtual_network_name = azurerm_virtual_network.carebridge.name
  address_prefixes     = [cidrsubnet(var.vpc_cidr, 4, 0)]
}

resource "azurerm_kubernetes_cluster" "carebridge" {
  name                = var.cluster_name
  location            = azurerm_resource_group.carebridge.location
  resource_group_name = azurerm_resource_group.carebridge.name
  dns_prefix          = var.cluster_name
  kubernetes_version  = var.kubernetes_version

  default_node_pool {
    name           = "default"
    node_count     = var.node_count
    vm_size        = var.node_vm_size
    vnet_subnet_id = azurerm_subnet.aks.id
  }

  identity {
    type = "SystemAssigned"
  }

  network_profile {
    network_plugin = "azure"
  }
}

resource "azurerm_postgresql_flexible_server" "carebridge" {
  name                   = "${var.cluster_name}-pg"
  resource_group_name    = azurerm_resource_group.carebridge.name
  location               = azurerm_resource_group.carebridge.location
  version                = "16"
  administrator_login    = var.db_username
  administrator_password = var.db_password
  storage_mb             = 32768
  sku_name               = var.db_sku_name
  zone                   = "1"
}

resource "azurerm_postgresql_flexible_server_database" "carebridge" {
  name      = "carebridge"
  server_id = azurerm_postgresql_flexible_server.carebridge.id
  collation = "en_US.utf8"
  charset   = "UTF8"
}

resource "azurerm_postgresql_flexible_server_firewall_rule" "allow_azure" {
  name             = "allow-azure-services"
  server_id        = azurerm_postgresql_flexible_server.carebridge.id
  start_ip_address = "0.0.0.0"
  end_ip_address   = "0.0.0.0"
}

output "database_url" {
  value     = "postgresql://${var.db_username}:${var.db_password}@${azurerm_postgresql_flexible_server.carebridge.fqdn}:5432/carebridge?sslmode=require"
  sensitive = true
}

output "aks_cluster_name" {
  value = azurerm_kubernetes_cluster.carebridge.name
}

output "resource_group_name" {
  value = azurerm_resource_group.carebridge.name
}

output "helm_install_command" {
  value = "helm upgrade --install carebridge ../../helm/carebridge -n carebridge --create-namespace --set database.url=<DATABASE_URL>"
}

output "kubectl_credentials_command" {
  value = "az aks get-credentials --resource-group ${azurerm_resource_group.carebridge.name} --name ${azurerm_kubernetes_cluster.carebridge.name}"
}
