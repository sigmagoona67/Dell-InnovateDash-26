variable "resource_group_name" {
  type    = string
  default = "carebridge-rg"
}

variable "location" {
  type    = string
  default = "southeastasia"
}

variable "cluster_name" {
  type    = string
  default = "carebridge"
}

variable "kubernetes_version" {
  type    = string
  default = "1.29"
}

variable "vpc_cidr" {
  type    = string
  default = "10.1.0.0/16"
}

variable "node_count" {
  type    = number
  default = 2
}

variable "node_vm_size" {
  type    = string
  default = "Standard_B2s"
}

variable "db_username" {
  type    = string
  default = "carebridge"
}

variable "db_password" {
  type      = string
  sensitive = true
}

variable "db_sku_name" {
  type    = string
  default = "B_Standard_B1ms"
}
