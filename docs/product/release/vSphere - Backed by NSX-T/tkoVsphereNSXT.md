# Deploying VMware Tanzu for Kubernetes Operations on vSphere with NSX-T Using Service Installer for VMware Tanzu

This document provides the steps for installing Service Installer for VMware Tanzu (informally known as SIVT) on vSphere with NSX-T, and setting up a Tanzu for Kubernetes Operations (informally known as TKO) environment.

This deployment references the design provided in [VMware Tanzu for Kubernetes Operations on vSphere with NSX-T Reference Design](https://docs.vmware.com/en/VMware-Tanzu/services/tanzu-reference-architecture/GUID-reference-designs-tko-on-vsphere-nsx.html).

## Network Design
The following diagram represents the network design required for deploying Tanzu for Kubernetes Operations on vSphere with NSX-T using Service Installer for VMware Tanzu.

![Network design for TKO deployment on vSphere with NSX-T](./images/VCF_Network_Design.png)

## Prerequisites
Before you install Service Installer for VMware Tanzu, you must configure the following options:

- A Tanzu Kubernetes Grid management port group exists. This is the network to which the bootstrap VM, Tanzu Kubernetes Grid management cluster nodes, Tanzu Kubernetes Grid shared service cluster, and the interface of the NSX Advanced Load Balancer SEs part of the SE Group 01 are connected.

    - Service Installer creates all other port groups, such as Tanzu Kubernetes Grid workload, the NSX Advanced Load Balancer management port groups, as well as groups and firewalls. You do not need to create these port groups.
    - NSX Advanced Load Balancer handles the IPAM of the Tanzu Kubernetes Grid management PG network and assigns IP addresses to both VIPs and SE.

- The following networks have DHCP service and access to the Internet:

    - Tanzu Kubernetes Grid Management
    - Tanzu Kubernetes Grid Workload

  On the networks, reserve a few IP addresses that are outside the scope of DHCP. These IP addresses are for the control plane endpoints of the Tanzu clusters. The installer assigns the IP addresses to Tanzu Kubernetes Grid nodes and Service Engines (SEs). DHCP provides the default gateway.

- The following networks have an IP address block reserved for SEs and VIPs. VMware NSX Advanced Load Balancer handles IPAM.

    - Management/Avi management network to which NSX Advanced Load Balancer Controllers are connected

- Service Installer can automatically download required images such as NSX Advanced Load Balancer Controller and Kubernetes base images from VMware Marketplace.

- A Cloud Services Portal (CSP) API token is required to pull all required images from VMware Marketplace. To generate an API token, log in to the Cloud Services Portal and select your organization. Go to **Marketplace Service > My Account > API Tokens > Generate a Token**.
    - If Marketplace is not available in your environment or if you are working in an air-gapped environment:

        1. Download and import required Photon/Ubuntu Kubernetes base OVAs to vCenter.
           To download the images, go to [VMware Tanzu Kubernetes Grid Download Product](https://customerconnect.vmware.com/downloads/details?downloadGroup=TKG-160&productId=1098).
        2. Convert the imported images to templates.
        <br>**Note:** Templates must be located under the same cluster where deployment is performed.
        3. Upload the NSX Advanced Load Balancer Controller in Content Library:

            1. Download the NSX Advanced Load Balancer 22.1.2 OVA from [MarketPlace](https://marketplace.cloud.vmware.com/services/details/nsx-advanced-load-balancer-1?slug=true).
            2. Create a Content Library and upload the NSX Advanced Load Balancer Controller OVA.
        4. Set up a centralized image repository with the required images to deploy the Tanzu Kubernetes clusters in an internet-restricted environment.

           For instructions to set up an Harbor image registry and publish required images, see [Pre-bundled Harbor with Tanzu Kubernetes Grid Dependencies](#airgap)

- (Optional) If you are using a custom certificate for deploying Harbor on a shared services cluster, import the certificate and private key to the Service Installer VM. The certificate and private key must be in PEM format.

- DNS Name resolution for NSX Advanced Load Balancer Controller.
- You have installed Service Installer for VMware Tanzu.

  For information on how to download and deploy Service Installer for VMware Tanzu, see [Service Installer for VMware Tanzu](../index.md).

## Considerations
Consider the following when deploying VMware Tanzu for Kubernetes Operations using Service Installer for VMware Tanzu.

- If you set HTTP proxy, you must also set HTTPS proxy and vice-versa.

    - NSX Advanced Load Balancer Controller must be able to communicate with vCenter directly without a proxy.
    - Avi Kubernetes Operator (AKO) must be able to communicate with NSX Advanced Load Balancer Controller directly without a proxy.
    - Tanzu Mission Control integration is not supported when a proxy is enabled.
    - For the no-proxy value in the proxy-spec section in the JSON file, in addition to the values you specify, Service Installer appends:

        - localhost and 127.0.0.1 on the Service Installer bootstrap VM.
        - localhost, 127.0.0.1, values for CLUSTER_CIDR and SERVICE_CIDR, svc, and svc.cluster.local  for Tanzu Kubernetes Grid management and workload clusters.

        >**Note** While adding domain's under No proxy sections, specify domain name itself e.g. **domain.com**, instead of prefixing it with special character like **.domain.com**

    - If the Kubernetes clusters or Service Installer VMs need to communicate with external services and infrastructure endpoints in your Tanzu Kubernetes Grid environment, ensure that those endpoints are reachable by your proxies or add them to TKG_NO_PROXY. Depending on your environment configuration, this may include, but is not limited to, your OIDC or LDAP server, Harbor, NSX-T, and NSX Advanced Load Balancer for deployments on vSphere.

        - For vSphere, you manually add the CIDR of the TKG_MGMT network, which includes the IP address of your control plane endpoint, to TKG_NO_PROXY. If you set VSPHERE_CONTROL_PLANE_ENDPOINT to an FQDN, add both the FQDN and VSPHERE_NETWORK to TKG_NO_PROXY.
- Tanzu Mission Control is required to enable Tanzu Service Mesh and Tanzu Observability.
- Since Tanzu Observability also provides observability services, if Tanzu Observability is enabled, Prometheus and Grafana are not supported.

## <a id=deploy-tko></a> Deploy Tanzu for Kubernetes Operations

Do the following to deploy Tanzu for Kubernetes Operations using Service Installer for VMware Tanzu.

1. Enter ssh root@_Service-Installer-IP_ in a terminal window to log in to Service Installer for VMware Tanzu. Replace Service-Installer-IP with the IP address for your Service Installer installation.

2. Configure and verify NTP.

   To configure and verify NTP on a Photon OS, see VMware [KB-76088](https://kb.vmware.com/s/article/76088).

3. Import a certificate and private key to the Service Installer for VMware Tanzu bootstrap VM using a copy utility such as SCP or WinSCP (for Windows).

   >**Note** Service Installer uses the certificate for NSX Advanced Load Balancer, Harbor, Prometheus, and Grafana. Ensure that the certificate and private key are in PEM format and are not encrypted. Encrypted certificate files are not supported. If you do not upload a certificate, Service Installer generates a self-signed certificate.

4. Enter the following in a browser window to access the Service Installer user interface:

   `http://<IP of Service Installer VM>:8888/`

5. Enter the required details to generate the input file.

   After you have entered the required details, the Service Installer UI provides an option to review the values and download the input file in JSON format.

   The values are saved in a file `vsphere-nsxt-tkgm.json` located at `/opt/vmware/arcas/src`. See the [sample JSON file](#sample-input-file) file for reference.

6. Execute the following command to initiate the deployment.
   ```
   arcas --env vcf --file /path/to/vsphere-nsxt-tkgm.json  --vcf_pre_configuration --avi_configuration  --tkg_mgmt_configuration --shared_service_configuration --workload_preconfig --workload_deploy --deploy_extensions
   ```

7. Use the following command to cleanup the deployment.
    ```
    arcas --env vcf --file /path/to/vsphere-nsxt-tkgm.json --cleanup all
    ```
   For more information about Selective cleanup, see [Selective cleanup options](../vSphere%20-%20Backed%20by%20VDS/TKGm/TkgmCleanup.md)

   >**Note** If you interrupt the deployment process (i.e. using a `ctrl-c`), you need to restart Service Installer to properly refresh the service. You can do this with `systemctl restart arcas`.

   The following table describes the parameters.

   | Python CLI Command Parameter   | Description |
      | ------ | ------ |
   | --session   | Establishes a session with vCenter and performs pre-validation |
   | --vcf_pre_configuration   |  Creates segments, Firewalls rules, Inventory Groups and Services |
   | --avi_configuration | Creates the resource pool and folders for NSX Advanced Load Balancer Controller, deploys Avi control plane, generates and replaces certificates, and performs initial configuration (DNS, NTP) |
   | --tkg_mgmt_configuration | Configures the required networks in Avi, creates cloud, SE group, IPAM profile, and maps IPAM and SE groups with Cloud <br> Creates the resource pool and folders for Tanzu Kubernetes Grid Management cluster <br> Deploys Tanzu Kubernetes Grid management cluster <br> Registers Tanzu Kubernetes Grid management cluster with Tanzu Mission Control|
   | --shared_service_configuration | Deploys a shared service cluster (makes use of the Tanzu or Tanzu Mission Control CLI) <br> Adds required tags to the cluster <br> Deploys CertManager, Contour, and Harbor |
   | --workload_preconfig | Creates the required network configuration in Avi and creates new SE Groups for workload clusters <br> Creates a new AKO configuration for workload clusters |
   | --workload_deploy | Deploys a workload cluster (makes use of the Tanzu or Tanzu Mission Control CLI)) <br> Adds required tags to the cluster|
   | --deploy_extensions | Deploys extensions, such as Prometheus and Grafana |
   | --cleanup                           | cleanup the deployment performed by SIVT. <br> Provides  end-to-end and selective cleanup. <br>It accepts parameter values. For more information about cleanup values, see [cleanup options](../vSphere%20-%20Backed%20by%20VDS/TKGm/TkgmCleanup.md). |
   | --verbose | Enables verbose logging |
   | --skip_precheck                   | This option skips all the pre-flight checks.
   | --get_harbor_preloading_status   | This shows the status of TKG dependency loading to Harbor which is pre-bundled with Service Installer for VMware Tanzu.
   | --status                         | This option enables users to check for status of current deployment.

8. Do the following to integrate with SaaS services such as Tanzu Mission Control, Tanzu Service Mesh, and Tanzu Observability. In the `vsphere-nsxt-tkgm.json` file, to activate or deactivate:

    - Tanzu Mission Control and to use the Tanzu Mission Control CLI and API, enter `"tmcAvailability": "true/false"`.
    - Tanzu Service Mesh, enter `"tkgWorkloadTsmIntegration": "true/false"`.
    - Tanzu Observability, enter `"tanzuObservabilityAvailability": "true/false"`.

   >**Note** If you edit the JSON manually, ensure that you enter the values in quotes.

9. If you are using a proxy, in the `vsphere-nsxt-tkgm.json` file, configure the details in the proxy field corresponding to the cluster.

   For example, to activate or deactivate proxies on the management cluster, use `tkgMgmt: {"enableProxy": "true"}` in the `vsphere-nsxt-tkgm.json` file.

10. Activate or deactivate Tanzu Kubernetes Grid extensions. For example, in the `vsphere-nsxt-tkgm.json` file, to activate or deactivate:

    -  Prometheus and Grafana, enter `"enableExtensions": "true/false"`.
    -  Harbor, enter `"enableHarborExtension": "true/false"`.

>**Note**
>- Tanzu Mission Control is required to activate Tanzu Service Mesh and Tanzu Observability.
>- If Tanzu Observability is activated, Prometheus and Grafana are not supported.
>- If Tanzu Mission Control is activated, only Photon is supported.

## Air-gapped: Pre-bundled Harbor with Tanzu Kubernetes Grid Dependencies

- If a pre-bundled harbor with all the necessary binaries is already present in the environment, follow below steps:
    - This harbor details must be provided under `Custom Repository` section of UI while generating deployment JSON file.
    - Make sure binaries uploaded to harbor are corresponding to the specific version of Tanzu being deployed.
    - SIVT OVA without harbor (`service-installer-for-VMware-Tanzu.ova`) can be used for performing the deployment as environment already has pre-bundled harbor.
    - SIVT 2.3.0 is bundled with Tanzu CLI 0.90.1. You can perform the following steps to configure SIVT to consume the pre-bundled harbor:
      - Set the plugin source using:
        ```
        tanzu plugin source update default --uri <harbor-fqdn>:<port>/tanzu/tanzu-cli/plugins/plugin-inventory:latest
        OR
        tanzu plugin source update default --uri <harbor-fqdn>:<port>/<path-to-plugin-inventory>
        ```
      - Skip verification for this plugin source:
        ```
        export TANZU_CLI_PLUGIN_DISCOVERY_IMAGE_SIGNATURE_VERIFICATION_SKIP_LIST=<harbor-fqdn>:<port>/<path-to-plugin-inventory>
        ```

- If a pre-bundled harbor not present in the environment, follow below steps:
    - User must download Service Installer for VMware Tanzu OVA (`service-installer-for-VMware-Tanzu-with-Harbor.ova`) file from Marketplace. This OVA comes bundled with Tanzu Kubernetes Grid 2.2.0 dependencies which are not compliant.
    - While deploying OVA make sure to configure static network details by providing all the values prompted under "Networking Properties".

      >**Note** Domain Name provided is used as fqdn for harbor. Make sure to create a DNS record for the FQDN and the static Management IP that you provide.
    - Once OVA is deployed and powered on, all the images are uploaded to `tanzu` in the embedded harbor of SIVT. This will take ~ 20 minutes to complete.
    - To access harbor, log in to Harbor at `https://<sivt-ip>:9443`
        - Credential -> user:admin password:`<sivt password>`
    - Verify that all binaries are uploaded to Harbor with the mentioned repo name `tanzu`.
    - You can also verify the upload status using following arcas command
      ```
      arcas --get_harbor_preloading_status --repo_name tanzu
      ```
    - This harbor details must be provided under `Custom Repository` section of UI while generating deployment JSON file. Use below URL format for custom repository
      ```
      https://<harbor-fqdn>:9443/tanzu
      ```
    - The plugins are available at: `https://<sivt-ip>:9443/tanzu/tanzu-cli/plugins/plugin-inventory:latest`

## Update a Running Extension Deployment

To make changes to the configuration of a running package after deployment, update your deployed package:

1. Obtain the installed package version and namespace details using the following command.
   ```
   tanzu package available list -A
   ```

2. Update the package configuration `<package-name>-data-values.yaml` file. Yaml files for the extensions deployed using SIVT are available under `/opt/vmware/arcas/tanzu-clusters/<cluster-name>` in the Service Installer for VMware Tanzu VM.

3. Update the installed package using the following command.

   ```
   tanzu package installed update <package-name> --version <installed-package-version> --values-file <path-to-yaml-file-in-SIVT> --namespace <package-namespace>
   ```

**Refer to the following example for Grafana update:**

**Step 1:** List the installed package version and namespace details.
   ```
   # tanzu package available list -A
   / Retrieving installed packages...
   NAME            PACKAGE-NAME                     PACKAGE-VERSION          STATUS               NAMESPACE
   cert-manager    cert-manager.tanzu.vmware.com    1.1.0+vmware.1-tkg.2     Reconcile succeeded  my-packages
   contour         contour.tanzu.vmware.com         1.17.1+vmware.1-tkg.1    Reconcile succeeded  my-packages
   grafana         grafana.tanzu.vmware.com         7.5.7+vmware.1-tkg.1     Reconcile succeeded  tkg-system
   prometheus      prometheus.tanzu.vmware.com      2.27.0+vmware.1-tkg.1    Reconcile succeeded  tkg-system
   antrea          antrea.tanzu.vmware.com                                   Reconcile succeeded  tkg-system
   [...]
   ```

**Step 2:** Update the Grafana configuration in the `grafana-data-values.yaml` file available under `/opt/vmware/arcas/tanzu-clusters/<cluster-name>/grafana-data-values.yaml`.

**Step 3:** Update the installed package.
   ```
   tanzu package installed update grafana --version 7.5.7+vmware.1-tkg.1 --values-file /opt/vmware/arcas/tanzu-clusters/testCluster/grafana-data-values.yaml --namespace my-packages
   ```
Expected Output:
   ```
   | Updating package 'grafana'
   - Getting package install for 'grafana'
   | Updating secret 'grafana-my-packages-values'
   | Updating package install for 'grafana'

   Updated package install 'grafana' in namespace 'my-packages'
   ```

For information about updating, see [Update a Package](https://docs.vmware.com/en/VMware-Tanzu-Kubernetes-Grid/2.3/using-tkg/workload-packages-ref.html).

## <a id="sample-input-file"> </a> Sample Input File
Service Installer generates the JSON file based on your inputs and saves it to **/opt/vmware/arcas/src/** in the installer VM. Files are named based on the environment you are using.

- vSphere with NSX-T Internet environment: vsphere-nsxt-tkgm.json
- vSphere with NSX-T Proxy environment: vsphere-nsxt-tkgm-proxy.json
- vSphere with NSX-T air-gapped environment: vsphere-nsxt-tkgm-airgapped.json

Following is an example of the JSON file.

>**Note** The following sample file is also available in the Service Installer VM at the following location: **/opt/vmware/arcas/src/vsphere/vsphere-nsxt-tkgm.json.sample**.

```json
{
   "envSpec":{
      "vcenterDetails":{
         "vcenterAddress":"vcenter.xx.xx",
         "vcenterSsoUser":"administrator@vsphere.local",
         "vcenterSsoPasswordBase64":"cGFzc3dvcmQ=",
         "vcenterDatacenter":"Datacenter-1",
         "vcenterCluster":"Cluster-1",
         "vcenterDatastore":"Datastore-1",
         "contentLibraryName":"TanzuAutomation-Lib",
         "aviOvaName":"controller-20.1.7-9154",
         "resourcePoolName":"arcas",
         "nsxtAddress":"nsxt.xx.xx",
         "nsxtUser":"admin",
         "nsxtUserPasswordBase64":"cGFzc3dvcmQ=",
         "nsxtTier1RouterDisplayName":"tier-1_gw",
         "nsxtOverlay":"arcas-overlay"
      },
      "marketplaceSpec":{
         "refreshToken":"t9TfXXXXJuMCq3"
      },
      "ceipParticipation":  "true",
      "customRepositorySpec":{
         "tkgCustomImageRepository":"https://harbor-local.xx.xx/tkg151",
         "tkgCustomImageRepositoryPublicCaCert":"false"
      },
      "saasEndpoints":{
         "tmcDetails":{
            "tmcAvailability":"true",
            "tmcRefreshToken":"t9TfXXXXJuMCq3",
            "tmcInstanceURL": "https://xxxx.tmc.com"
         },
         "tanzuObservabilityDetails":{
            "tanzuObservabilityAvailability":"false",
            "tanzuObservabilityUrl":"https://surf.wavefront.com",
            "tanzuObservabilityRefreshToken":"6777a3a8-XXXX-XXXX-XXXXX-797b20638660"
         }
      },
      "infraComponents":{
         "dnsServersIp":"x.x.x.x",
         "searchDomains":"xx.xx",
         "ntpServers":"x.x.x.x"
      },
      "proxySpec":{
         "arcasVm":{
            "enableProxy":"true",
            "httpProxy":"http://<fqdn/ip>:<port>",
            "httpsProxy":"https://<fqdn/ip>:<port>",
            "noProxy":"vcenter.xx.xx,172.x.x.x"
         },
         "tkgMgmt":{
            "enableProxy":"true",
            "httpProxy":"http://<fqdn/ip>:<port>",
            "httpsProxy":"https://<fqdn/ip>:<port>",
            "noProxy":"vcenter.xx.xx,172.x.x.x"
         },
         "tkgSharedservice":{
            "enableProxy":"false",
            "httpProxy":"http://<fqdn/ip>:<port>",
            "httpsProxy":"https://<fqdn/ip>:<port>",
            "noProxy":"vcenter.xx.xx,172.x.x.x"
         },
         "tkgWorkload":{
            "enableProxy":"true",
            "httpProxy":"http://<fqdn/ip>:<port>",
            "httpsProxy":"https://<fqdn/ip>:<port>",
            "noProxy":"vcenter.xx.xx,172.x.x.x"
         }
      }
   },
   "tkgComponentSpec":{
      "aviMgmtNetwork":{
         "aviMgmtNetworkName":"ran-avi-mgmt-02",
         "aviMgmtNetworkGatewayCidr":"11.12.13.14/24",
         "aviMgmtServiceIpStartRange":"11.12.13.15",
         "aviMgmtServiceIpEndRange":"11.12.13.28"
      },
      "tkgClusterVipNetwork":{
         "tkgClusterVipNetworkName":"ran-tkg-vip-02",
         "tkgClusterVipNetworkGatewayCidr":"11.12.14.14/24",
         "tkgClusterVipIpStartRange":"11.12.14.15",
         "tkgClusterVipIpEndRange":"11.12.14.28"
      },
      "aviComponents":{
         "aviPasswordBase64":"cGFzc3dvcmQ=",
         "aviBackupPassphraseBase64":"cGFzc3dvcmQ=",
         "enableAviHa":"false",
         "aviController01Ip":"11.12.13.16",
         "aviController01Fqdn":"avi.xx.xx",
         "aviController02Ip":"",
         "aviController02Fqdn":"",
         "aviController03Ip":"",
         "aviController03Fqdn":"",
         "aviClusterIp":"",
         "aviClusterFqdn":"",
         "aviSize":"small",
         "aviCertPath":"",
         "aviCertKeyPath":""
      },
      "identityManagementSpec":{
         "identityManagementType":"ldap",
         "oidcSpec":{
            "oidcIssuerUrl":"",
            "oidcClientId":"",
            "oidcClientSecret":"",
            "oidcScopes":"",
            "oidcUsernameClaim":"",
            "oidcGroupsClaim":""
         },
         "ldapSpec":{
            "ldapEndpointIp":"dns.xxx.xxx",
            "ldapEndpointPort":"636",
            "ldapBindPWBase64":"cGFzc3dvcmQ=",
            "ldapBindDN":"cn=administrator,cn=Users,dc=lab,dc=vmw",
            "ldapUserSearchBaseDN":"cn=Users,dn=lab,dn=vmw",
            "ldapUserSearchFilter":"(objectClass=person)",
            "ldapUserSearchUsername":"userPrincipalName",
            "ldapGroupSearchBaseDN":"cn=Users,dc=lab,dc=vmw",
            "ldapGroupSearchFilter":"(objectClass=group)",
            "ldapGroupSearchUserAttr":"userPrincipalName",
            "ldapGroupSearchGroupAttr":"DN",
            "ldapGroupSearchNameAttr":"userPrincipalName",
            "ldapRootCAData":"-----BEGIN CERTIFICATE-----xxxxxxxxxxx-----END CERTIFICATE-----\n"
         }
      },
      "tkgMgmtComponents":{
         "tkgMgmtNetworkName":"tkg_mgmt_pg-edit",
         "tkgMgmtGatewayCidr":"11.12.12.14/24",
         "tkgMgmtClusterName":"Mgmt-Cluster",
         "tkgMgmtSize":"custom",
         "tkgMgmtCpuSize":"2",
         "tkgMgmtMemorySize":"10",
         "tkgMgmtStorageSize":"45",
         "tkgMgmtDeploymentType":"dev",
         "tkgMgmtClusterCidr":"100.96.0.0/11",
         "tkgMgmtServiceCidr":"100.64.0.0/13",
         "tkgMgmtBaseOs":"photon",
         "tkgMgmtClusterGroupName":"",
         "tkgMgmtRbacUserRoleSpec":{
            "clusterAdminUsers":"user1@xxx.vmw",
            "adminUsers":"admin-user1@lab.vmw",
            "editUsers":"",
            "viewUsers":""
         }
      },
      "tkgSharedserviceSpec":{
         "tkgSharedserviceNetworkName":"ran-tkg-ss-02",
         "tkgSharedserviceGatewayCidr":"11.12.16.14/24",
         "tkgSharedserviceDhcpStartRange":"11.12.16.14",
         "tkgSharedserviceDhcpEndRange":"11.12.16.28",
         "tkgSharedserviceClusterName":"Shared-cluster",
         "tkgSharedserviceSize":"large",
         "tkgSharedserviceCpuSize":"",
         "tkgSharedserviceMemorySize":"",
         "tkgSharedserviceStorageSize":"",
         "tkgSharedserviceDeploymentType":"dev",
         "tkgSharedserviceWorkerMachineCount":"1",
         "tkgSharedserviceClusterCidr":"100.96.0.0/11",
         "tkgSharedserviceServiceCidr":"100.64.0.0/13",
         "tkgSharedserviceBaseOs":"photon",
         "tkgSharedserviceKubeVersion":"v1.21.8",
         "tkgSharedserviceEnableAviL7": "false",
         "tkgSharedserviceRbacUserRoleSpec":{
            "clusterAdminUsers":"user1@mail.com",
            "adminUsers":"",
            "editUsers":"",
            "viewUsers":""
         },
         "tkgSharedserviceClusterGroupName":"",
         "tkgSharedserviceEnableDataProtection":"false",
         "tkgSharedClusterCredential":"",
         "tkgSharedClusterBackupLocation":"",
         "tkgSharedClusterVeleroDataProtection":{
            "enableVelero":"true",
            "username": "admin",
            "passwordBase64": "cGFzc3dvcmQ=",
            "bucketName": "shared-backup",
            "backupRegion": "minio",
            "backupS3Url": "http://<minio-server>:9000",
            "backupPublicUrl": "http://<minio-server>:9000"
         }
      }
   },
   "tkgWorkloadComponents":{
      "tkgWorkloadNetworkName":"ran-tkg-wkld03",
      "tkgWorkloadGatewayCidr":"11.12.19.14/24",
      "tkgWorkloadDhcpStartRange":"11.12.19.15",
      "tkgWorkloadDhcpEndRange":"11.12.19.28",
      "tkgWorkloadClusterName":"Workload-cluster",
      "tkgWorkloadSize":"large",
      "tkgWorkloadCpuSize":"",
      "tkgWorkloadMemorySize":"",
      "tkgWorkloadStorageSize":"",
      "tkgWorkloadDeploymentType":"dev",
      "tkgWorkloadWorkerMachineCount":"1",
      "tkgWorkloadClusterCidr":"100.96.0.0/11",
      "tkgWorkloadServiceCidr":"100.64.0.0/13",
      "tkgWorkloadBaseOs":"photon",
      "tkgWorkloadKubeVersion":"v1.20.14",
      "tkgWorkloadEnableAviL7": "false",
      "tkgWorkloadRbacUserRoleSpec":{
         "clusterAdminUsers":"tanzu-user2@lab.vmw",
         "adminUsers":"tanzu-user1@lab.vmw",
         "editUsers":"",
         "viewUsers":""
      },
      "tkgWorkloadTsmIntegration":"false",
      "namespaceExclusions":{
         "exactName":"",
         "startsWith":""
      },
      "tkgWorkloadClusterGroupName":"",
      "tkgWorkloadEnableDataProtection":"false",
      "tkgWorkloadClusterCredential":"",
      "tkgWorkloadClusterBackupLocation":"",
      "tkgWorkloadClusterVeleroDataProtection":{
         "enableVelero":"true",
         "username": "admin",
         "passwordBase64": "cGFzc3dvcmQ=",
         "bucketName": "workload-backup",
         "backupS3Url": "http://<minio-server>:9000",
         "backupPublicUrl": "http://<minio-server>:9000"
      }
   },
   "harborSpec":{
      "enableHarborExtension":"true",
      "harborFqdn":"harbor.xx.xx",
      "harborPasswordBase64":"cGFzc3dvcmQ=",
      "harborCertPath":"/root/cert.pem",
      "harborCertKeyPath":"/root/key.pem"
   },
   "tanzuExtensions":{
      "enableExtensions":"false",
      "tkgClustersName":"",
      "logging":{
         "syslogEndpoint":{
            "enableSyslogEndpoint":"false",
            "syslogEndpointAddress":"",
            "syslogEndpointPort":"",
            "syslogEndpointMode":"",
            "syslogEndpointFormat":""
         },
         "httpEndpoint":{
            "enableHttpEndpoint":"false",
            "httpEndpointAddress":"",
            "httpEndpointPort":"",
            "httpEndpointUri":"",
            "httpEndpointHeaderKeyValue":"Authorization Bearer Axxxxxxxxxx"
         },
         "kafkaEndpoint":{
            "enableKafkaEndpoint":"false",
            "kafkaBrokerServiceName":"",
            "kafkaTopicName":""
         }
      },
      "monitoring":{
         "enableLoggingExtension":"true",
         "prometheusFqdn":"prometheus.xx.xx",
         "prometheusCertPath":"/root/cert.pem",
         "prometheusCertKeyPath":"/root/key.pem",
         "grafanaFqdn":"grafana.xx.xx",
         "grafanaCertPath":"/root/cert.pem",
         "grafanaCertKeyPath":"/root/key.pem",
         "grafanaPasswordBase64":"cGFzc3dvcmQ="
      }
   }
}
```
