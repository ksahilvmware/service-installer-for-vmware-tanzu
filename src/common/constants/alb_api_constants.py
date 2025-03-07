# Copyright 2021 VMware, Inc.
# SPDX-License-Identifier: BSD-2-Clause

"""
General convention for adding fields:
- All the API endpoints must start with '/' prefix and the base URL must not have a trailing '/'
"""


class AlbEndpoint:
    BASE_URL = "https://{ip}"
    CRUD_SSL_CERT = BASE_URL + "/api/sslkeyandcertificate"
    IMPORT_SSL_CERTIFICATE = CRUD_SSL_CERT + "/validate"
    CRUD_SYSTEM_CONFIG = BASE_URL + "/api/systemconfiguration"
    LICENSE_URL = BASE_URL + "/api/licensing"
    AVI_HA = BASE_URL + "/api/cluster"
    AVI_HA_RUNTIME = BASE_URL + "/api/cluster/runtime"
    AVI_SERVICE_ENGINE = BASE_URL + "/api/serviceenginegroup?name={se_name}&cloud_ref.uuid={avi_cloud_uuid}"
    AVI_VIRTUAL_SERVICE_VIP = BASE_URL + "/api/vsvip?include_name"
    AVI_VIRTUAL_SERVICE = BASE_URL + "/api/virtualservice"
    AVI_SE_GROUP = (
        BASE_URL + "/api/serviceenginegroup-inventory/?cloud_ref.uuid={cloud_ref}"
        "&include_name=true&uuid={service_engine_uuid}"
    )
    LOGIN = BASE_URL + "/login"
    USER_ACCOUNT = BASE_URL + "/api/useraccount"
    BACKUP_CONFIG = BASE_URL + "/api/backupconfiguration"
    CLOUD = BASE_URL + "/api/cloud"
    GET_CLOUD = BASE_URL + "/api/cloud/{cloud_uuid}"
    CLOUD_STATUS = BASE_URL + "/api/cloud/{uuid}/status"
    SE_GROUP = BASE_URL + "/api/serviceenginegroup"
    NETWORK = BASE_URL + "/api/network"
    GET_VRF = BASE_URL + "/api/vrfcontext/?name.in={name}&cloud_ref.uuid={cloud_uuid}"
    GET_NETWORK_INVENTORY = BASE_URL + "/api/network-inventory/?cloud_ref.uuid={cloud_uuid}"
    GET_CLUSTER_RUNTIME = BASE_URL + "/api/vimgrclusterruntime"
    PROFILE = BASE_URL + "/api/ipamdnsproviderprofile"
    RETRIEVE_CONTENT_LIB = BASE_URL + "/api/vimgrvcenterruntime/retrieve/contentlibraries"
    SERVICE_ENGINE_INVENTORY = BASE_URL + "/api/serviceengine-inventory/?cloud_ref.uuid={uuid}"
    CLOUD_VCENTER_SERVER = BASE_URL + "/api/vcenterserver/?cloud_ref.uuid={uuid}"
    VCENTER_SERVER = BASE_URL + "/api/vcenterserver"
    CLOUD_CONNECT = BASE_URL + "/api/cloudconnectoruser"
    NSXT_TIER = BASE_URL + "/api/nsxt/tier1sr"
    NSXT_TRANSPORT_ZONES = BASE_URL + "/api/nsxt/transportzones"
    NSXT_VCENTER = BASE_URL + "/api/nsxt/vcenters"
    NSXT_SEGMENTS = BASE_URL + "/api/nsxt/segments"
    NSXT_CLUSTERS = BASE_URL + "/api/nsxt/clusters"


class AlbPayload:
    CREATE_NONE_CLOUD = """
    {{  "name": "{cloud_name}",
        "vtype": "CLOUD_NONE",
        "dhcp_enabled": false,
        "mtu": 1500,
        "prefer_static_routes": false,
        "enable_vip_static_routes": false,
        "state_based_dns_registration": true,
        "ip6_autocfg_enabled": false,
        "dns_resolution_on_se": false,
        "enable_vip_on_all_interfaces": false,
        "autoscale_polling_interval": 60,
        "vmc_deployment": false,
        "license_type": "LIC_CORES"  }}
    """
    IMPORT_CERT = """
    {{  "certificate":"{cert}",
        "certificate_base64":false,
        "key":"{cert_key}",
        "key_base64":false
    }}
    """
    VIRTUAL_SERVICE_VIP = """
    {{
        "cloud_ref":"{cloud_ref}",
        "name":"{virtual_service_name_vip}",
        "vrf_context_ref":"{vrf_context_ref}",
        "vip":[
            {{
                "enabled":true,
                "auto_allocate_ip":true,
                "auto_allocate_floating_ip":false,
                "avi_allocated_vip":false,
                "avi_allocated_fip":false,
                "auto_allocate_ip_type":"V4_ONLY",
                "prefix_length":32,
                "ipam_network_subnet":{{
                "network_ref":"{network_ref}",
                "subnet":{{
                    "ip_addr":{{
                    "addr":"{addr}",
                    "type":"V4"
                }},
                "mask": {mask}
            }}
            }}
        }}
        ]
    }}
    """
    VIRTUAL_SERVICE_NSX_VIP = """
    {{
        "cloud_ref":"{cloud_ref}",
        "east_west_placement":false,
        "name":"{virtual_service_name_vip}",
        "vrf_context_ref":"{vrf_context_ref}",
        "tier1_lr":"{tier_1_gw_uuid}",
        "vip":[
            {{
                "enabled":true,
                "auto_allocate_ip":true,
                "auto_allocate_floating_ip":false,
                "avi_allocated_vip":false,
                "avi_allocated_fip":false,
                "auto_allocate_ip_type":"V4_ONLY",
                "prefix_length":32,
                "ipam_network_subnet":{{
                "network_ref":"{network_ref}",
                "subnet":{{
                    "ip_addr":{{
                    "addr":"{addr}",
                    "type":"V4"
                }},
                "mask": {mask}
            }}
            }}
        }}
        ]
    }}
    """
    VIRTUAL_SERVICE = """
        {{
            "cloud_ref": "{cloud_ref}",
            "se_group_ref": "{se_group_ref}",
            "vsvip_ref": "{vsvip_ref}",
            "cloud_type": "CLOUD_VCENTER",
            "name": "sivt-virtual-service",
            "services": [
                {{
                    "enable_http2": false,
                    "enable_ssl": false,
                    "horizon_internal_ports": false,
                    "port": 80,
                    "port_range_end": 80
                }}
            ],
            "traffic_enabled": true,
            "type": "VS_TYPE_NORMAL",
            "weight": 1
    }}
    """
    NSX_VIRTUAL_SERVICE = """
    {{
        "enabled": true,
        "analytics_policy": {{
            "full_client_logs": {{
                "enabled": true,
                "duration": 30,
                "throttle": 10
            }},
            "client_insights": "NO_INSIGHTS",
            "all_headers": false,
            "metrics_realtime_update": {{
                "enabled": true,
                "duration": 30
            }},
            "udf_log_throttle": 10,
            "significant_log_throttle": 10,
            "learning_log_policy": {{
                "enabled": false
            }}
        }},
        "enable_autogw": true,
        "weight": 1,
        "limit_doser": false,
        "type": "VS_TYPE_NORMAL",
        "cloud_type": "CLOUD_NSXT",
        "use_bridge_ip_as_vip": false,
        "ign_pool_net_reach": false,
        "remove_listening_port_on_vs_down": false,
        "close_client_conn_on_config_update": false,
        "advertise_down_vs": false,
        "scaleout_ecmp": false,
        "active_standby_se_tag": "ACTIVE_STANDBY_SE_1",
        "use_vip_as_snat": false,
        "traffic_enabled": true,
        "allow_invalid_client_cert": false,
        "cloud_ref": "{cloud_ref}",
        "services": [
            {{
                "port": 80,
                "port_range_end": 80,
                "enable_ssl": false
            }}
        ],
        "se_group_ref": "{se_group_ref}",
        "vrf_context_ref": "{tier_1_vrf_context_url}",
        "name": "sivt-virtual-service",
        "vsvip_ref": "{vsvip_ref}",
        "http_policies": [],
        "network_security_policy_ref_data": {{
            "name": "sivt-virtual-service",
            "rules": []
        }}
    }}
    """
    CREATE_SE_GROUP = """
    {{
            "name": "{se_group_name}",
            "se_dp_isolation": false,
            "se_dp_isolation_num_non_dp_cpus": 0,
            "cloud_ref": "{cloud_url}",
            "max_vs_per_se": 10,
            "min_scaleout_per_vs": 1,
            "max_scaleout_per_vs": 4,
            "max_se": 10,
            "vcpus_per_se": 1,
            "memory_per_se": 2048,
            "disk_per_se": 15,
            "max_cpu_usage": 80,
            "min_cpu_usage": 30,
            "se_deprovision_delay": 120,
            "auto_rebalance": false,
            "se_name_prefix": "{se_name_prefix}",
            "vs_host_redundancy": true,
            "vcenter_folder": "AviSeFolder",
            "vcenter_datastores_include": false,
            "vcenter_datastore_mode": "VCENTER_DATASTORE_ANY",
            "cpu_reserve": false,
            "mem_reserve": true,
            "ha_mode": "HA_MODE_LEGACY_ACTIVE_STANDBY",
            "algo": "PLACEMENT_ALGO_PACKED",
            "buffer_se": 1,
            "active_standby": false,
            "placement_mode": "PLACEMENT_MODE_AUTO",
            "se_dos_profile": {{
                "thresh_period": 5
            }},
            "auto_rebalance_interval": 300,
            "aggressive_failure_detection": false,
            "realtime_se_metrics": {{
                "enabled": false,
                "duration": 30
            }},
            "vs_scaleout_timeout": 600,
            "vs_scalein_timeout": 30,
            "connection_memory_percentage": 50,
            "extra_config_multiplier": 0,
            "vs_scalein_timeout_for_upgrade": 30,
            "log_disksz": 10000,
            "os_reserved_memory": 0,
            "hm_on_standby": false,
            "per_app": false,
            "distribute_load_active_standby": false,
            "auto_redistribute_active_standby_load": false,
            "dedicated_dispatcher_core": false,
            "cpu_socket_affinity": false,
            "num_flow_cores_sum_changes_to_ignore": 8,
            "least_load_core_selection": true,
            "extra_shared_config_memory": 0,
            "se_tunnel_mode": 0,
            "se_vs_hb_max_vs_in_pkt": 256,
            "se_vs_hb_max_pkts_in_batch": 64,
            "se_thread_multiplier": 1,
            "async_ssl": false,
            "async_ssl_threads": 1,
            "se_udp_encap_ipc": 0,
            "se_tunnel_udp_port": 1550,
            "archive_shm_limit": 8,
            "significant_log_throttle": 100,
            "udf_log_throttle": 100,
            "non_significant_log_throttle": 100,
            "ingress_access_mgmt": "SG_INGRESS_ACCESS_ALL",
            "ingress_access_data": "SG_INGRESS_ACCESS_ALL",
            "se_sb_dedicated_core": false,
            "se_probe_port": 7,
            "se_sb_threads": 1,
            "ignore_rtt_threshold": 5000,
            "waf_mempool": true,
            "waf_mempool_size": 64,
            "host_gateway_monitor": false,
            "vss_placement": {{
                "num_subcores": 4,
                "core_nonaffinity": 2
            }},
            "flow_table_new_syn_max_entries": 0,
            "disable_csum_offloads": false,
            "disable_gro": true,
            "disable_tso": false,
            "enable_hsm_priming": false,
            "distribute_queues": false,
            "vss_placement_enabled": false,
            "enable_multi_lb": false,
            "n_log_streaming_threads": 1,
            "free_list_size": 1024,
            "max_rules_per_lb": 150,
            "max_public_ips_per_lb": 30,
            "self_se_election": false,
            "minimum_connection_memory": 20,
            "shm_minimum_config_memory": 4,
            "heap_minimum_config_memory": 8,
            "disable_se_memory_check": false,
            "memory_for_config_update": 15,
            "num_dispatcher_cores": 0,
            "ssl_preprocess_sni_hostname": true,
            "se_dpdk_pmd": 0,
            "se_use_dpdk": 0,
            "min_se": 1,
            "se_pcap_reinit_frequency": 0,
            "se_pcap_reinit_threshold": 0,
            "disable_avi_securitygroups": false,
            "se_flow_probe_retries": 2,
            "vs_switchover_timeout": 300,
            "config_debugs_on_all_cores": false,
            "vs_se_scaleout_ready_timeout": 60,
            "vs_se_scaleout_additional_wait_time": 0,
            "se_dp_hm_drops": 0,
            "disable_flow_probes": false,
            "dp_aggressive_hb_frequency": 100,
            "dp_aggressive_hb_timeout_count": 10,
            "bgp_state_update_interval": 60,
            "max_memory_per_mempool": 64,
            "app_cache_percent": 0,
            "app_learning_memory_percent": 0,
            "datascript_timeout": 1000000,
            "se_pcap_lookahead": false,
            "enable_gratarp_permanent": false,
            "gratarp_permanent_periodicity": 10,
            "reboot_on_panic": true,
            "se_flow_probe_retry_timer": 40,
            "se_lro": true,
            "se_tx_batch_size": 64,
            "se_pcap_pkt_sz": 69632,
            "se_pcap_pkt_count": 0,
            "distribute_vnics": false,
            "se_dp_vnic_queue_stall_event_sleep": 0,
            "se_dp_vnic_queue_stall_timeout": 10000,
            "se_dp_vnic_queue_stall_threshold": 2000,
            "se_dp_vnic_restart_on_queue_stall_count": 3,
            "se_dp_vnic_stall_se_restart_window": 3600,
            "se_pcap_qdisc_bypass": true,
            "se_rum_sampling_nav_percent": 1,
            "se_rum_sampling_res_percent": 100,
            "se_rum_sampling_nav_interval": 1,
            "se_rum_sampling_res_interval": 2,
            "se_kni_burst_factor": 0,
            "max_queues_per_vnic": 1,
            "se_rl_prop": {{
                "msf_num_stages": 1,
                "msf_stage_size": 16384
            }},
            "app_cache_threshold": 5,
            "core_shm_app_learning": false,
            "core_shm_app_cache": false,
            "pcap_tx_mode": "PCAP_TX_AUTO",
            "se_dp_max_hb_version": 2,
            "resync_time_interval": 65536,
            "use_hyperthreaded_cores": true,
            "se_hyperthreaded_mode": "SE_CPU_HT_AUTO",
            "compress_ip_rules_for_each_ns_subnet": true,
            "se_vnic_tx_sw_queue_size": 256,
            "se_vnic_tx_sw_queue_flush_frequency": 0,
            "transient_shared_memory_max": 30,
            "log_malloc_failure": true,
            "se_delayed_flow_delete": true,
            "se_txq_threshold": 2048,
            "se_mp_ring_retry_count": 500,
            "dp_hb_frequency": 100,
            "dp_hb_timeout_count": 10,
            "pcap_tx_ring_rd_balancing_factor": 10,
            "use_objsync": true,
            "se_ip_encap_ipc": 0,
            "se_l3_encap_ipc": 0,
            "handle_per_pkt_attack": true,
            "per_vs_admission_control": false,
            "objsync_port": 9001,
            "vcenter_datastores": [],
            "service_ip_subnets": [],
            "auto_rebalance_criteria": [],
            "auto_rebalance_capacity_per_se": [],
            "license_tier": "ESSENTIALS",
            "license_type": "LIC_CORES",
            "se_bandwidth_type": "SE_BANDWIDTH_UNLIMITED"
        }}
    """

    CREATE_NETWORK = """
        {{ "name": "{name}",
            "vcenter_dvs": true,
            "dhcp_enabled": false,
            "exclude_discovered_subnets": false,
            "synced_from_se": false,
            "ip6_autocfg_enabled": false,
            "cloud_ref": "{cloud_url}",
            "configured_subnets": [
                {{ "prefix": {{
                    "ip_addr": {{
                        "addr": "{subnet_ip}",
                        "type": "V4"
                    }},
                    "mask": "{netmask}"
                }},
                    "static_ip_ranges": [
                        {{  "range": {{
                                "begin": {{
                                    "addr": "{static_ip_start}",
                                    "type": "V4"
                                }},
                                "end": {{
                                    "addr": "{static_ip_end}",
                                    "type": "V4"
                                }}  }},
                            "type": "STATIC_IPS_FOR_VIP_AND_SE"
                        }}  ]  }}  ]  }}
    """

    IPAM_NETWORK = """ {{ "nw_ref": "{network_url}" }} """

    CREATE_INTERNAL_IPAM = """
    {{
        "name": "{name}",
        "internal_profile": {{ "ttl": 30,
                               "usable_networks": {ipam_networks} }},
        "allocate_ip_in_vrf": false,
        "type": "IPAMDNS_TYPE_INTERNAL",
        "gcp_profile": {{ "match_se_group_subnet": false,
                          "use_gcp_network": false }},
        "azure_profile": {{ "use_enhanced_ha": false,
                            "use_standard_alb": false }}
    }}
    """

    GENERATE_SE_OVA = """
    {{
        "file_format": "ova",
        "cloud_uuid": "{cloud_uuid}"
    }}
    """

    PATCH_DEFAULT_LICENSE_TIER = """
        {{"replace": {{"default_license_tier":"{license_tier}"}} }}
    """

    VRF_STATIC_ROUTE = """
        {{
                    "prefix": {{
                        "ip_addr": {{
                            "addr": "0.0.0.0",
                            "type": "V4"
                        }},
                        "mask": 0 }},
                    "next_hop": {{
                        "addr": "{next_hop_ip}",
                        "type": "V4" }},
                    "route_id": {route_id}
                }}
    """

    PATCH_VRF_CONTEXT = """
        {{ "add": {{
            "static_routes": {vrf_routes_list} }} }}
    """

    SELF_SIGNED_CERT = """
        {{"type": "SSL_CERTIFICATE_TYPE_SYSTEM",
            "name": "{name}",
            "certificate_base64": true,
            "key_base64": true,
            "certificate": {{
                "days_until_expire": 365,
                "self_signed": true,
                "subject": {{
                    "organization": "VMware INC",
                    "locality": "Palo Alto",
                    "state": "CA",
                    "country": "US",
                    "common_name": "{common_name}",
                    "organization_unit": "VMwareEngineering"
                }},
                "subject_alt_names": {san_list} }},
            "key_params": {{
                "algorithm": "SSL_KEY_ALGORITHM_RSA",
                "rsa_params": {{"key_size": "SSL_KEY_2048_BITS"
                               }}
            }}
            }}
    """
    IMPORTED_CERTIFICATE = """
    {{"certificate":{{
        "certificate":"{cert}",
        "subject":{{
            "common_name":"{subject_common_name}",
            "organization_unit":"{org_unit}",
            "organization":"{org}",
            "locality":"{location}",
            "state":"{state_name}",
            "country":"{country_name}",
            "distinguished_name":"{distinguished_name}"
        }},
            "not_after":"{not_after_time}"
        }},
        "key_params":{{
        "algorithm":"SSL_KEY_ALGORITHM_RSA",
        "rsa_params":{{
            "key_size":"SSL_KEY_2048_BITS",
            "exponent":65537
        }}
    }},
    "status":"SSL_CERTIFICATE_FINISHED",
    "format":"SSL_PEM",
    "certificate_base64":false,
    "key_base64":false,
    "enable_ocsp_stapling":false,
    "ocsp_config":{{
        "ocsp_req_interval":86400,
        "url_action":"OCSP_RESPONDER_URL_FAILOVER",
        "failed_ocsp_jobs_retry_interval":3600,
        "max_tries":10,
        "responder_url_lists":[

        ]
    }},
    "type":"SSL_CERTIFICATE_TYPE_SYSTEM",
    "name":"{cert_name}",
    "key":"{cert_key}"
    }}
    """
    LICENSE = """
    {{
        "serial_key":"{serial_number}"
    }}
    """
    WELCOME_SCREEN_UPDATE = """
    {{"replace": {{
            "welcome_workflow_complete": "true",
            "global_tenant_config": {{
                "tenant_vrf": {tenant_vrf},
                "se_in_provider_context": false,
                "tenant_access_to_provider_se": true
            }}
        }}
        }}
    """
    AVI_HA_CLUSTER = """
    {{
        "uuid":"{cluster_uuid}",
        "name":"{cluster_name}",
        "nodes":[
            {{
                "name":"{cluster_ip1}",
                "ip":{{
                    "addr":"{cluster_ip1}",
                    "type":"V4"
                }},
                "vm_uuid":"{vm_uuid_get}",
                "vm_mor":"{vm_mor_get}",
                "vm_hostname":"{vm_hostname_get}"
            }},
            {{
                "ip":{{
                    "addr":"{cluster_ip2}",
                    "type":"V4"
                }},
                "name":"{cluster_ip2}"
            }},
            {{
                "ip":{{
                    "addr":"{cluster_ip3}",
                    "type":"V4"
                }},
                "name":"{cluster_ip3}"
            }}
        ],
        "tenant_uuid": "{tennat_uuid_get}",
        "virtual_ip":{{
            "addr":"{virtual_ip_get}",
            "type":"V4"
        }}
    }}
    """
    ADD_STATIC_ROUTE = """
    {{
        "add": {{
            "static_routes": [
                {{
                    "prefix": {"ip_addr": {"addr": "0.0.0.0", "type": "V4"}, "mask": 0},
                    "next_hop": {"addr": "{route_ip}", "type": "V4"},
                    "route_id": "{route_id}",
                }}
            ]
        }}
    }}
    """
    CREATE_CLOUD = """
    {{"name": "{name}",
        "vtype": "CLOUD_VCENTER",
        "vcenter_configuration": {{
            "privilege": "WRITE_ACCESS",
            "vcenter_url": "{vcenter_host}",
            "username": "{vcenter_user_name}",
            "password": "{vcenter_password}",
            "datacenter": "{data_center}"
        }},
        "dhcp_enabled": false,
        "mtu": 1500,
        "prefer_static_routes": false,
        "enable_vip_static_routes": false,
        "state_based_dns_registration": true,
        "ip6_autocfg_enabled": false,
        "dns_resolution_on_se": false,
        "enable_vip_on_all_interfaces": false,
        "autoscale_polling_interval": 60,
        "vmc_deployment": false,
        "license_type": "LIC_CORES"}}
    """
    CREATE_ORCH_CLOUD = """
        {{"name": "{name}",
            "vtype": "CLOUD_NONE",
            "dhcp_enabled": false,
            "mtu": 1500,
            "prefer_static_routes": false,
            "enable_vip_static_routes": false,
            "state_based_dns_registration": true,
            "ip6_autocfg_enabled": false,
            "dns_resolution_on_se": false,
            "enable_vip_on_all_interfaces": false,
            "autoscale_polling_interval": 60,
            "vmc_deployment": false,
            "license_type": "LIC_CORES"}}
        """
    ENTERPRISE_SE_BODY = """
    {
        "ha_mode": "HA_MODE_SHARED_PAIR",
        "hm_on_standby": true,
        "dedicated_dispatcher_core": false,
        "disable_gro": true,
        "self_se_election": true,
        "objsync_config":
        {
            "objsync_cpu_limit": 30,
            "objsync_reconcile_interval": 10,
            "objsync_hub_elect_interval": 60
        },
        "app_cache_percent": 10,
        "license_tier": "ENTERPRISE"
    }
    """
    ESSENTIAL_SE_BODY = """
    {
        "ha_mode": "HA_MODE_LEGACY_ACTIVE_STANDBY",
        "hm_on_standby": false,
        "self_se_election": false,
        "app_cache_percent": 0,
        "license_tier": "ESSENTIALS"
    }
    """

    SE_CLOUD_BODY = """
    {{
        "max_vs_per_se": 10,
        "min_scaleout_per_vs": 2,
        "max_scaleout_per_vs": 4,
        "max_se": 10,
        "vcpus_per_se": 2,
        "memory_per_se": 4096,
        "disk_per_se": 15,
        "max_cpu_usage": 80,
        "min_cpu_usage": 30,
        "se_deprovision_delay": 120,
        "auto_rebalance": false,
        "se_name_prefix": "{se_name_prefix}",
        "vs_host_redundancy": true,
        "vcenter_folder": "AviSeFolder",
        "vcenter_datastores_include": true,
        "vcenter_datastore_mode": "VCENTER_DATASTORE_SHARED",
        "cpu_reserve": false,
        "mem_reserve": true,
        "algo": "PLACEMENT_ALGO_PACKED",
        "buffer_se": 0,
        "active_standby": false,
        "placement_mode": "PLACEMENT_MODE_AUTO",
        "se_dos_profile":
            {{
                "thresh_period": 5
            }},
        "auto_rebalance_interval": 300,
        "aggressive_failure_detection": false,
        "realtime_se_metrics":
            {{
                "enabled": false,
                "duration": 30
            }},
        "vs_scaleout_timeout": 600,
        "vs_scalein_timeout": 30,
        "connection_memory_percentage": 50,
        "extra_config_multiplier": 0,
        "vs_scalein_timeout_for_upgrade": 30,
        "log_disksz": 10000,
        "os_reserved_memory": 0,
        "per_app": false,
        "distribute_load_active_standby": false,
        "auto_redistribute_active_standby_load": false,
        "cpu_socket_affinity": false,
        "num_flow_cores_sum_changes_to_ignore": 8,
        "least_load_core_selection": true,
        "extra_shared_config_memory": 0,
        "se_tunnel_mode": 0,
        "se_vs_hb_max_vs_in_pkt": 256,
        "se_vs_hb_max_pkts_in_batch": 64,
        "se_thread_multiplier": 1,
        "async_ssl": false,
        "async_ssl_threads": 1,
        "se_udp_encap_ipc": 0,
        "se_tunnel_udp_port": 1550,
        "archive_shm_limit": 8,
        "significant_log_throttle": 100,
        "udf_log_throttle": 100,
        "non_significant_log_throttle": 100,
        "ingress_access_mgmt": "SG_INGRESS_ACCESS_ALL",
        "ingress_access_data": "SG_INGRESS_ACCESS_ALL",
        "se_sb_dedicated_core": false,
        "se_probe_port": 7,
        "se_sb_threads": 1,
        "ignore_rtt_threshold": 5000,
        "waf_mempool": true,
        "waf_mempool_size": 64,
        "host_gateway_monitor": false,
        "vss_placement":
            {{
            "num_subcores": 4, "core_nonaffinity": 2
            }},
        "flow_table_new_syn_max_entries": 0,
        "disable_csum_offloads": false,
        "disable_tso": false,
        "enable_hsm_priming": false,
        "distribute_queues": false,
        "vss_placement_enabled": false,
        "enable_multi_lb": false,
        "n_log_streaming_threads": 1,
        "free_list_size": 1024,
        "max_rules_per_lb": 150,
        "max_public_ips_per_lb": 30,
        "minimum_connection_memory": 20,
        "shm_minimum_config_memory": 4,
        "heap_minimum_config_memory": 8,
        "disable_se_memory_check": false,
        "memory_for_config_update": 15,
        "num_dispatcher_cores": 0,
        "ssl_preprocess_sni_hostname": true,
        "se_dpdk_pmd": 0,
        "se_use_dpdk": 0,
        "min_se": 1,
        "se_pcap_reinit_frequency": 0,
        "se_pcap_reinit_threshold": 0,
        "disable_avi_securitygroups": false,
        "se_flow_probe_retries": 2,
        "vs_switchover_timeout": 300,
        "config_debugs_on_all_cores": false,
        "vs_se_scaleout_ready_timeout": 60,
        "vs_se_scaleout_additional_wait_time": 0,
        "se_dp_hm_drops": 0,
        "disable_flow_probes": false,
        "dp_aggressive_hb_frequency": 100,
        "dp_aggressive_hb_timeout_count": 10,
        "bgp_state_update_interval": 60,
        "max_memory_per_mempool": 64,
        "app_learning_memory_percent": 0,
        "datascript_timeout": 1000000,
        "se_pcap_lookahead": false,
        "enable_gratarp_permanent": false,
        "gratarp_permanent_periodicity": 10,
        "reboot_on_panic": true,
        "se_flow_probe_retry_timer": 40,
        "se_lro": true,
        "se_tx_batch_size": 64,
        "se_pcap_pkt_sz": 69632,
        "se_pcap_pkt_count": 0,
        "distribute_vnics": false,
        "se_dp_vnic_queue_stall_event_sleep": 0,
        "se_dp_vnic_queue_stall_timeout": 10000,
        "se_dp_vnic_queue_stall_threshold": 2000,
        "se_dp_vnic_restart_on_queue_stall_count": 3,
        "se_dp_vnic_stall_se_restart_window": 3600,
        "se_pcap_qdisc_bypass": true,
        "se_rum_sampling_nav_percent": 1,
        "se_rum_sampling_res_percent": 100,
        "se_rum_sampling_nav_interval": 1,
        "se_rum_sampling_res_interval": 2,
        "se_kni_burst_factor": 0,
        "max_queues_per_vnic": 1,
        "se_rl_prop":
            {{
                "msf_num_stages": 1, "msf_stage_size": 16384
            }},
        "app_cache_threshold": 5,
        "core_shm_app_learning": false,
        "core_shm_app_cache": false,
        "pcap_tx_mode": "PCAP_TX_AUTO",
        "se_dp_max_hb_version": 2,
        "resync_time_interval": 65536,
        "use_hyperthreaded_cores": true,
        "se_hyperthreaded_mode": "SE_CPU_HT_AUTO",
        "compress_ip_rules_for_each_ns_subnet": true,
        "se_vnic_tx_sw_queue_size": 256,
        "se_vnic_tx_sw_queue_flush_frequency": 0,
        "transient_shared_memory_max": 30,
        "log_malloc_failure": true,
        "se_delayed_flow_delete": true,
        "se_txq_threshold": 2048,
        "se_mp_ring_retry_count": 500,
        "dp_hb_frequency": 100,
        "dp_hb_timeout_count": 10,
        "pcap_tx_ring_rd_balancing_factor": 10,
        "use_objsync": true,
        "se_ip_encap_ipc": 0,
        "se_l3_encap_ipc": 0,
        "handle_per_pkt_attack": true,
        "per_vs_admission_control": false,
        "objsync_port": 9001,
        "se_dp_isolation": false,
        "se_dp_isolation_num_non_dp_cpus": 0,
        "cloud_ref": "{cloud_url}",
        "vcenter_datastores":
            [
                {{
                    "datastore_name": "{data_store}"
                }}
            ],
        "service_ip_subnets": [],
        "auto_rebalance_criteria": [],
        "auto_rebalance_capacity_per_se": [],
        "vcenter_clusters":
            {{
                "include": true, "cluster_refs": ["{cluster_url}"]
            }},
        "license_type": "LIC_CORES",
        "se_bandwidth_type": "SE_BANDWIDTH_UNLIMITED",
        "name": "{se_group_name}"
    }}
    """

    NSXT_SE_CLOUD_BODY = """
    {{
        "max_vs_per_se": 10,
        "min_scaleout_per_vs": 2,
        "max_scaleout_per_vs": 4,
        "max_se": 10,
        "vcpus_per_se": 2,
        "memory_per_se": 4096,
        "disk_per_se": 40,
        "se_deprovision_delay": 120,
        "auto_rebalance": false,
        "se_name_prefix": "{se_name_prefix}",
        "vs_host_redundancy": true,
        "vcenter_folder": "AviSeFolder",
        "vcenter_datastores_include": false,
        "vcenter_datastore_mode": "VCENTER_DATASTORE_ANY",
        "cpu_reserve": false,
        "mem_reserve": true,
        "ha_mode": "HA_MODE_SHARED_PAIR",
        "algo": "PLACEMENT_ALGO_PACKED",
        "buffer_se": 1,
        "active_standby": false,
        "placement_mode": "PLACEMENT_MODE_AUTO",
        "use_hyperthreaded_cores": true,
        "se_hyperthreaded_mode": "SE_CPU_HT_AUTO",
        "vs_scaleout_timeout": 600,
        "vs_scalein_timeout": 30,
        "vss_placement":
            {{
                "num_subcores": 4, "core_nonaffinity": 2
            }},
        "realtime_se_metrics":
            {{
                "enabled": false, "duration": 30
            }},
        "se_dos_profile":
            {{
                "thresh_period": 5
            }},
        "distribute_vnics": false,
        "cloud_ref": "{cloud_url}",
        "vcenter_datastores": [],
        "license_tier": "ENTERPRISE",
        "license_type": "LIC_CORES",
        "se_bandwidth_type": "SE_BANDWIDTH_UNLIMITED",
        "name": "{se_group_name}",
        "vcenters": [
            {{
                "vcenter_ref": "{vcenter_url}",
                "nsxt_clusters":
                    {{
                        "include": true, "cluster_ids": ["{cluster_id}"]
                    }},
                "clusters": [],
            }}
        ]
    }}
    """
    IPAM_BODY = """
    {{
        "name": "{name}",
        "internal_profile": {{
            "ttl": 30,
            "usable_networks": [
                {{"nw_ref": "{network_url}"}},
                {{"nw_ref": "{data_network_url}"}},
                {{"nw_ref": "{vip_network_url}"}}
            ]
        }},
        "allocate_ip_in_vrf": false,
        "type": "IPAMDNS_TYPE_INTERNAL",
        "gcp_profile": {{"match_se_group_subnet": false, "use_gcp_network": false}},
        "azure_profile":{{"use_enhanced_ha": false, "use_standard_alb": false}}
    }}
    """
    NSXT_IPAM_BODY = """
    {{
        "name": "{name}",
        "internal_profile": {{
            "usable_networks": [
                {{"nw_ref": "{network}"}},
                {{"nw_ref": "{vip_network}"}}
            ]
        }},
        "allocate_ip_in_vrf": false,
        "type": "IPAMDNS_TYPE_INTERNAL"
    }}
    """
    ORCH_IPAM_BODY = """
    {{
        "name": "{name}",
        "internal_profile": {{
            "usable_networks": [
                {{"nw_ref": "{network}"}},
                {{"nw_ref": "{vip_network}"}}
            ]
        }},
        "allocate_ip_in_vrf": false,
        "type": "IPAMDNS_TYPE_INTERNAL"
    }}
    """
    NSXT_DNS_BODY = """
    {{
        "internal_profile":
            {{
                "ttl": 30,
                "dns_service_domain":
                [
                {{"pass_through": true, "domain_name": "{dns_domain}"}}
                ]
            }},
        "type": "IPAMDNS_TYPE_INTERNAL_DNS",
        "name": "{dns_profile_name}"
    }}
    """
    VCENTER_NSX_PAYLOAD = """
    {{
        "cloud_ref": "{cloud_url}",
        "content_lib": {{"id": "{content_lib}", "name": "{vc_content_library_name}"}},
        "name": "{vc_name}",
        "tenant_ref": "{tenant_ref}",
        "vcenter_credentials_ref": "{vcenter_creds_ref}",
        "vcenter_url": "{status_vc}",
    }}
    """
