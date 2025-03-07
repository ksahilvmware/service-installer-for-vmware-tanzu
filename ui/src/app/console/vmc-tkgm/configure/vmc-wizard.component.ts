/*
 * Copyright 2021 VMware, Inc
 * SPDX-License-Identifier: BSD-2-Clause
 */
// Angular imports
import { Component, ElementRef, Input, OnInit, ViewChild } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { Title } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { saveAs as importedSaveAs } from "file-saver";
import { ClrLoadingState } from '@clr/angular';


// App imports
import { FormMetaDataService } from 'src/app/shared/service/form-meta-data.service';
import { PROVIDERS, Providers } from 'src/app/shared/constants/app.constants';
import { APP_ROUTES, Routes } from 'src/app/shared/constants/routes.constants';
import { AppDataService } from 'src/app/shared/service/app-data.service';
import { VMCDataService } from 'src/app/shared/service/vmc-data.service';
import { DataService} from 'src/app/shared/service/data.service';
import { VsphereNsxtDataService } from 'src/app/shared/service/vsphere-nsxt-data.service';
import { VsphereTkgsService } from "src/app/shared/service/vsphere-tkgs-data.service";
import { APIClient } from 'src/app/swagger/api-client.service';
import { WizardBaseDirective } from 'src/app/views/landing/wizard/shared/wizard-base/wizard-base';
import { ViewJSONModalComponent } from 'src/app/views/landing/wizard/shared/components/modals/view-json-modal/view-json-modal.component';
import { VCDDataService } from 'src/app/shared/service/vcd-data.service';

@Component({
    selector: 'app-vmc-wizard',
    templateUrl: './vmc-wizard.component.html',
    styleUrls: ['./vmc-wizard.component.scss'],
})
export class VMCWizardComponent extends WizardBaseDirective implements OnInit {
    @ViewChild(ViewJSONModalComponent) viewJsonModal: ViewJSONModalComponent;
    @ViewChild('attachments') attachment : any;
    @Input() public form;
    @Input() public AVIFormValid;
    @Input() public providerType = 'vmc';
    @Input() public infraType = 'tkgm';
    public APP_ROUTES: Routes = APP_ROUTES;
    public PROVIDERS: Providers = PROVIDERS;

    public deploymentPending = false;
    public disableDeployButton = false;
    public showAwsTestMessage = false;
    public showIPValidationSuccess = false;
    public errorNotification: string;
    public successNotification: string;
    public filePath: string;
    public logFileName = 'service_installer_log_bundle';
    public show = false;

    public displayWizard = false;
    public fileName: string;
    public fileUploaded = false;
    public file: File;
    public generatedFileName: string;
    public uploadStatus = false;

    loadingState: ClrLoadingState = ClrLoadingState.DEFAULT;
    constructor(
        public apiClient: APIClient,
        router: Router,
        private appDataService: AppDataService,
        private formBuilder: FormBuilder,
        formMetaDataService: FormMetaDataService,
        vmcDataService: VMCDataService,
        dataService: DataService,
        nsxtDataService: VsphereNsxtDataService,
        vsphereTkgsDataService: VsphereTkgsService,
        vcdDataSerice: VCDDataService,
        titleService: Title,
        el: ElementRef) {

        super(router, el, formMetaDataService, titleService, dataService, vmcDataService, nsxtDataService, vsphereTkgsDataService, vcdDataSerice);

        this.form = this.formBuilder.group({
            vmcProviderForm: this.formBuilder.group({
            }),
            vmcMgmtNodeSettingForm: this.formBuilder.group({
            }),
            vmcSharedServiceNodeSettingForm: this.formBuilder.group({
            }),
            vmcWorkloadNodeSettingForm: this.formBuilder.group({
            }),
            vmcAVINetworkSettingForm: this.formBuilder.group({
            }),
            vmcExtensionSettingForm: this.formBuilder.group({
            }),
            vmcTKGMgmtDataNWForm: this.formBuilder.group({
            }),
            vmcTKGWorkloadDataNWForm: this.formBuilder.group({
            }),
            vmcTanzuSaasSettingForm: this.formBuilder.group({
            }),
            dnsNtpForm: this.formBuilder.group({
            }),
            IdentityMgmtForm: this.formBuilder.group({
            }),
        });
        this.provider = this.appDataService.getProviderType();
    }

    public ngOnInit() {
        super.ngOnInit();
        // delay showing first panel to avoid panel not defined console err
        setTimeout((_) => {
            if (this.uploadStatus) {
                this.vmcUploadNextStep();
                this.show = true;
            } else {
                this.show = true;
            }
        });

        this.titleService.setTitle('ARCAS');
    }

    public getStepDescription(stepName: string): string {
        if (stepName === 'provider') {
            return 'Validate SDDC token for VMC connectivity.';
        }
        else if (stepName === 'mgmtNodeSetting') {
            if (this.getFieldValue('vsphereMgmtNodeSettingForm', 'controlPlaneSetting')) {
                let mode = 'Development cluster selected: 1 node control plane';
                if (this.getFieldValue('vsphereMgmtNodeSettingForm', 'controlPlaneSetting') === 'prod') {
                    mode = 'Production cluster selected: 3 node control plane';
                }
                return mode;
            } else {
                return `Configure the resources backing the management cluster`;
            }
        }
        else if (stepName === 'sharedServiceNodeSetting') {
        if (this.getFieldValue('vsphereSharedServiceNodeSettingForm', 'controlPlaneSetting')) {
            let mode = 'Development cluster selected: 1 node control plane';
            if (this.getFieldValue('vsphereSharedServiceNodeSettingForm', 'controlPlaneSetting') === 'prod') {
                mode = 'Production cluster selected: 3 node control plane';
            }
            return mode;
            } else {
            return `Configure the resources backing the shared services cluster`;
            }
        }
        else if (stepName === 'workloadNodeSetting') {
            if (this.getFieldValue('vsphereWorkloadNodeSettingForm', 'controlPlaneSetting')) {
                let mode = 'Development cluster selected: 1 node control plane';
                if (this.getFieldValue('vsphereWorkloadNodeSettingForm', 'controlPlaneSetting') === 'prod') {
                    mode = 'Production cluster selected: 3 node control plane';
                }
                return mode;
            } else {
                return `Configure the resources backing the workload cluster`;
            }
        }
        else if (stepName === 'aviNetworkSetting') {
            if (this.getFieldValue('vmcAVINetworkSettingForm', 'mgmtSegmentName')) {
                return 'VMware NSX Advanced Load Balancer settings configured';
            } else {
                return 'Configure VMware NSX Advanced Load Balancer settings';
            }
        }
        else if (stepName === 'extensionSetting') {
            return  'Configure User-managed packages for Tanzu Kubernetes Grid clusters';
        }
        else if (stepName === 'TKGMgmtDataNW') {
            if (this.getFieldValue('TKGMgmtDataNWForm', 'gatewayCidr')) {
                return 'Tanzu Kubernetes Grid management data network set';
            } else {
                return 'Configure Tanzu Kubernetes Grid management data network settings';
            }
        }
        else if (stepName === 'tkgWorkloadDataNW') {
            if (this.getFieldValue('TKGWorkloadDataNWForm', 'gatewayCidr')) {
                return 'Tanzu Kubernetes Grid workload data network configured';
            } else {
                return 'Configure Tanzu Kubernetes Grid workload data network settings';
            }
        }
        else if (stepName === 'tanzuSaasSetting') {
            return 'Configure Tanzu Mission Control and Tanzu Observability endpoints';
        }
    }

    public removeFile() {
        if (this.fileName) {
            this.attachment.nativeElement.value = '';
            this.fileUploaded = false;
            this.fileName = '';
            this.file = null;
        }
    }
    public reviewConfiguration(review) {
        const pageTitle = 'VMC Confirm Settings';
        this.titleService.setTitle(pageTitle);
        this.disableDeployButton = true;
        this.errorNotification = '';
        this.showAwsTestMessage = false;
        this.showIPValidationSuccess = false;

        this.disableDeployButton = false;
        this.showAwsTestMessage = false;
        this.errorNotification = '';
        // Turn this ON
        this.review = review;
    }

    public getMgmtClusterSize() {
        if (this.getFieldValue('vmcMgmtNodeSettingForm', 'controlPlaneSetting') === 'dev') {
            return this.getFieldValue('vmcMgmtNodeSettingForm', 'devInstanceType');
        } else {
            return this.getFieldValue('vmcMgmtNodeSettingForm', 'prodInstanceType');
        }
    }

    public getSharedClusterSize() {
        if (this.getFieldValue('vmcSharedServiceNodeSettingForm', 'controlPlaneSetting') === 'dev') {
            return this.getFieldValue('vmcSharedServiceNodeSettingForm', 'devInstanceType');
        } else {
            return this.getFieldValue('vmcSharedServiceNodeSettingForm', 'prodInstanceType');
        }
    }

    public getWorkloadClusterSize() {
        if (this.getFieldValue('vmcWorkloadNodeSettingForm', 'controlPlaneSetting') === 'dev') {
            return this.getFieldValue('vmcWorkloadNodeSettingForm', 'devInstanceType');
        } else {
            return this.getFieldValue('vmcWorkloadNodeSettingForm', 'prodInstanceType');
        }
    }

    public enableLoggingExtension(key) {
        if (this.getFieldValue('vmcExtensionSettingForm', 'loggingEndpoint') === key) {
            return 'true';
        } else {
            return 'false';
        }
    }

    public setTSMEnable() {
        let tmcEnable = this.getStringBoolFieldValue('vmcTanzuSaasSettingForm', 'tmcSettings');
        if (tmcEnable === 'true') {
            return this.getStringBoolFieldValue('vmcWorkloadNodeSettingForm', 'tsmSettings');
        } else {
            return 'false';
        }
    }

    public setTSMExactName() {
        let tmcEnable = this.getStringBoolFieldValue('vmcTanzuSaasSettingForm', 'tmcSettings');
        if (tmcEnable === 'true') {
            let tsmEnable = this.getStringBoolFieldValue('vmcWorkloadNodeSettingForm', 'tsmSettings');
            if (tsmEnable === 'true') {
                return this.getFieldValue('vmcWorkloadNodeSettingForm', 'exactName');
            } else {
                return '';
            }
        } else {
            return '';
        }
    }


    public getCustomCertsAsList(certs: string) {
        if (certs === "" || certs.length === 0) return [];
        let certList = certs.split(',');
        let listOfCerts = [];
        let iter = 0;
        while (iter < certList.length){
            listOfCerts.push(certList[iter].trim());
            iter++;
        }
        return listOfCerts;
    }


    public setTSMStartsWithName() {
        let tmcEnable = this.getStringBoolFieldValue('vmcTanzuSaasSettingForm', 'tmcSettings');
        if (tmcEnable === 'true') {
            let tsmEnable = this.getStringBoolFieldValue('vmcWorkloadNodeSettingForm', 'tsmSettings');
            if (tsmEnable === 'true') {
                return this.getFieldValue('vmcWorkloadNodeSettingForm', 'startsWithName');
            } else {
                return '';
            }
        } else {
            return '';
        }
    }


    public getPayload() {
        let workloadGiven = this.apiClient.workloadClusterSettings && this.apiClient.workloadDataSettings;
        const payload = {
            'envSpec': {
                'sddcRefreshToken': this.getFieldValue('vmcProviderForm', 'sddcToken'),
                'orgName': this.getFieldValue('vmcProviderForm', 'orgName'),
                'sddcName': this.getFieldValue('vmcProviderForm', 'sddcName'),
                'sddcDatacenter': this.getFieldValue('vmcProviderForm', 'datacenter'),
                'sddcCluster': this.getFieldValue('vmcProviderForm', 'cluster'),
                'sddcDatastore': this.getFieldValue('vmcProviderForm', 'datastore'),
                'contentLibraryName': this.getFieldValue('vmcProviderForm', 'contentLib'),
                'aviOvaName': this.getFieldValue('vmcProviderForm', 'aviOvaImage'),
                'resourcePoolName': this.getFieldValue('vmcProviderForm', 'resourcePool'),
            },
            'marketplaceSpec': {
                'refreshToken': this.getFieldValue('vmcProviderForm', 'marketplaceRefreshToken'),
            },
            'ceipParticipation' : this.getStringBoolFieldValue('vmcProviderForm', 'isCeipEnabled'),
            'envVariablesSpec': {
                'dnsServersIp': this.getFieldValue('dnsNtpForm', 'dnsServer'),
                'searchDomains': this.getFieldValue('dnsNtpForm', 'searchDomain'),
                'ntpServersIp': this.getFieldValue('dnsNtpForm', 'ntpServer'),
            },
            'saasEndpoints': {
                'tmcDetails': {
                    'tmcAvailability': this.getStringBoolFieldValue('vmcTanzuSaasSettingForm', 'tmcSettings'),
                    'tmcRefreshToken': this.getFieldValue('vmcTanzuSaasSettingForm', 'refreshToken'),
                    'tmcInstanceURL': this.getFieldValue('vmcTanzuSaasSettingForm', 'tmcInstanceURL'),
                },
                'tanzuObservabilityDetails': {
                    'tanzuObservabilityAvailability': this.getStringBoolFieldValue('vmcTanzuSaasSettingForm', 'toSettings'),
                    'tanzuObservabilityUrl': this.getFieldValue('vmcTanzuSaasSettingForm', 'toUrl'),
                    'tanzuObservabilityRefreshToken': this.getFieldValue('vmcTanzuSaasSettingForm', 'toRefreshToken'),
                },
            },
            'componentSpec': {
                'aviMgmtNetworkSpec': {
                    'aviMgmtGatewayCidr': this.getFieldValue('vmcAVINetworkSettingForm', 'aviMgmtGatewayIp'),
                    'aviMgmtDhcpStartRange': this.getFieldValue('vmcAVINetworkSettingForm', 'aviMgmtDhcpStartRange'),
                    'aviMgmtDhcpEndRange': this.getFieldValue('vmcAVINetworkSettingForm', 'aviMgmtDhcpEndRange'),
                },
                'aviComponentSpec': {
                    'aviPasswordBase64': btoa(this.getFieldValue('vmcAVINetworkSettingForm', 'aviPassword')),
                    'aviBackupPassPhraseBase64': btoa(this.getFieldValue('vmcAVINetworkSettingForm', 'aviBackupPassphrase')),
                    'enableAviHa': this.getStringBoolFieldValue('vmcAVINetworkSettingForm', 'enableHA'),
                    'aviClusterIp': this.getFieldValue('vmcAVINetworkSettingForm', 'clusterIp'),
                    'aviSize': this.getFieldValue('vmcAVINetworkSettingForm', 'aviSize'),
                    'aviCertPath': this.getFieldValue('vmcAVINetworkSettingForm', 'aviCertPath'),
                    'aviCertKeyPath': this.getFieldValue('vmcAVINetworkSettingForm', 'aviCertKeyPath'),
                },
                'identityManagementSpec': {
                    'identityManagementType': this.getFieldValue('IdentityMgmtForm', 'identityType'),
                    'oidcSpec': {
                        'oidcIssuerUrl': this.getFieldValue('IdentityMgmtForm', 'issuerURL'),
                        'oidcClientId': this.getFieldValue('IdentityMgmtForm', 'clientId'),
                        'oidcClientSecret': this.getFieldValue('IdentityMgmtForm', 'clientSecret'),
                        'oidcScopes': this.getFieldValue('IdentityMgmtForm', 'scopes'),
                        'oidcUsernameClaim': this.getFieldValue('IdentityMgmtForm', 'oidcUsernameClaim'),
                        'oidcGroupsClaim': this.getFieldValue('IdentityMgmtForm', 'oidcGroupsClaim'),
                    },
                    'ldapSpec': {
                        'ldapEndpointIp': this.getFieldValue('IdentityMgmtForm', 'endpointIp'),
                        'ldapEndpointPort': this.getFieldValue('IdentityMgmtForm', 'endpointPort'),
                        'ldapBindPWBase64': btoa(this.getFieldValue('IdentityMgmtForm', 'bindPW')),
                        'ldapBindDN': this.getFieldValue('IdentityMgmtForm', 'bindDN'),
                        'ldapUserSearchBaseDN': this.getFieldValue('IdentityMgmtForm', 'userSearchBaseDN'),
                        'ldapUserSearchFilter': this.getFieldValue('IdentityMgmtForm', 'userSearchFilter'),
                        'ldapUserSearchUsername': this.getFieldValue('IdentityMgmtForm', 'userSearchUsername'),
                        'ldapGroupSearchBaseDN': this.getFieldValue('IdentityMgmtForm', 'groupSearchBaseDN'),
                        'ldapGroupSearchFilter': this.getFieldValue('IdentityMgmtForm', 'groupSearchFilter'),
                        'ldapGroupSearchUserAttr': this.getFieldValue('IdentityMgmtForm', 'groupSearchUserAttr'),
                        'ldapGroupSearchGroupAttr': this.getFieldValue('IdentityMgmtForm', 'groupSearchGroupAttr'),
                        'ldapGroupSearchNameAttr': this.getFieldValue('IdentityMgmtForm', 'groupSearchNameAttr'),
                        'ldapRootCAData': this.getFieldValue('IdentityMgmtForm', 'ldapRootCAData'),
                    }
                },
                'tkgClusterVipNetwork': {
                    'tkgClusterVipNetworkGatewayCidr': this.getFieldValue('vmcAVINetworkSettingForm', 'aviClusterVipGatewayIp'),
                    'tkgClusterVipDhcpStartRange': this.getFieldValue('vmcAVINetworkSettingForm', 'aviClusterVipStartRange'),
                    'tkgClusterVipDhcpEndRange': this.getFieldValue('vmcAVINetworkSettingForm', 'aviClusterVipEndRange'),
                    'tkgClusterVipIpStartRange': this.getFieldValue('vmcAVINetworkSettingForm', 'aviClusterVipSeStartRange'),
                    'tkgClusterVipIpEndRange': this.getFieldValue('vmcAVINetworkSettingForm', 'aviClusterVipSeEndRange'),
                },
                'tkgMgmtSpec': {
                    'tkgMgmtNetworkName': this.getFieldValue('vmcMgmtNodeSettingForm', 'segmentName'),
                    'tkgMgmtGatewayCidr': this.getFieldValue('vmcMgmtNodeSettingForm', 'gatewayAddress'),
                    'tkgMgmtClusterName': this.getFieldValue('vmcMgmtNodeSettingForm', 'clusterName'),
                    'tkgMgmtSize': this.getMgmtClusterSize(),
                    'tkgMgmtCpuSize': this.getFieldValue('vmcMgmtNodeSettingForm', 'mgmtCpu').toString(),
                    'tkgMgmtMemorySize': this.getFieldValue('vmcMgmtNodeSettingForm', 'mgmtMemory').toString(),
                    'tkgMgmtStorageSize': this.getFieldValue('vmcMgmtNodeSettingForm', 'mgmtStorage').toString(),
                    'tkgMgmtDeploymentType': this.getFieldValue('vmcMgmtNodeSettingForm', 'controlPlaneSetting'),
                    'tkgMgmtClusterCidr': this.getFieldValue('vmcMgmtNodeSettingForm', 'clusterCidr'),
                    'tkgMgmtServiceCidr': this.getFieldValue('vmcMgmtNodeSettingForm', 'serviceCidr'),
                    'tkgMgmtBaseOs': this.getFieldValue('vmcMgmtNodeSettingForm', 'baseImage'),
                    'tkgMgmtRbacUserRoleSpec': {
                        'clusterAdminUsers': this.getFieldValue('vmcMgmtNodeSettingForm', 'clusterAdminUsers'),
                        'adminUsers': this.getFieldValue('vmcMgmtNodeSettingForm', 'adminUsers'),
                        'editUsers': this.getFieldValue('vmcMgmtNodeSettingForm', 'editUsers'),
                        'viewUsers': this.getFieldValue('vmcMgmtNodeSettingForm', 'viewUsers'),
                    },
                    'tkgMgmtClusterGroupName': this.apiClient.tmcEnabled ? this.getFieldValue('vmcMgmtNodeSettingForm', 'clusterGroupName') : ""
                },
                'tkgSharedServiceSpec': {
                    'tkgSharedGatewayCidr': this.getFieldValue('vmcSharedServiceNodeSettingForm', 'gatewayAddress'),
                    'tkgSharedDhcpStartRange': this.getFieldValue('vmcSharedServiceNodeSettingForm', 'sharedServiceDhcpStartRange'),
                    'tkgSharedDhcpEndRange': this.getFieldValue('vmcSharedServiceNodeSettingForm', 'sharedServiceDhcpEndRange'),
                    'tkgSharedClusterName': this.getFieldValue('vmcSharedServiceNodeSettingForm', 'clusterName'),
                    'tkgSharedserviceSize': this.getSharedClusterSize(),
                    'tkgSharedserviceCpuSize': this.getFieldValue('vmcSharedServiceNodeSettingForm', 'sharedCpu').toString(),
                    'tkgSharedserviceMemorySize': this.getFieldValue('vmcSharedServiceNodeSettingForm', 'sharedMemory').toString(),
                    'tkgSharedserviceStorageSize': this.getFieldValue('vmcSharedServiceNodeSettingForm', 'sharedStorage').toString(),
                    'tkgSharedserviceDeploymentType': this.getFieldValue('vmcSharedServiceNodeSettingForm', 'controlPlaneSetting'),
                    'tkgSharedserviceWorkerMachineCount': this.getFieldValue('vmcSharedServiceNodeSettingForm', 'workerNodeCount').toString(),
                    'tkgSharedserviceClusterCidr': this.getFieldValue('vmcSharedServiceNodeSettingForm', 'clusterCidr'),
                    'tkgSharedserviceServiceCidr': this.getFieldValue('vmcSharedServiceNodeSettingForm', 'serviceCidr'),
                    'tkgSharedserviceBaseOs': this.getFieldValue('vmcSharedServiceNodeSettingForm', 'baseImage'),
                    'tkgSharedserviceKubeVersion': this.getFieldValue('vmcSharedServiceNodeSettingForm', 'baseImageVersion'),
                    'tkgSharedserviceEnableAviL7': this.getStringBoolFieldValue('vmcSharedServiceNodeSettingForm', 'enableL7'),
                    'tkgCustomCertsPath': this.getCustomCertsAsList(this.getFieldValue('vmcSharedServiceNodeSettingForm', 'tkgCustomCert')),
                    'tkgSharedserviceRbacUserRoleSpec': {
                        'clusterAdminUsers': this.getFieldValue('vmcSharedServiceNodeSettingForm', 'clusterAdminUsers'),
                        'adminUsers': this.getFieldValue('vmcSharedServiceNodeSettingForm', 'adminUsers'),
                        'editUsers': this.getFieldValue('vmcSharedServiceNodeSettingForm', 'editUsers'),
                        'viewUsers': this.getFieldValue('vmcSharedServiceNodeSettingForm', 'viewUsers'),
                    },
                    'tkgSharedserviceClusterGroupName': this.apiClient.tmcEnabled ? this.getFieldValue('vmcSharedServiceNodeSettingForm', 'clusterGroupName'): "",
                    'tkgSharedserviceEnableDataProtection': this.apiClient.tmcEnabled ? this.getStringBoolFieldValue('vmcSharedServiceNodeSettingForm', 'enableDataProtection') : "false",
                    'tkgSharedClusterCredential': this.apiClient.tmcEnabled ? this.getFieldValue('vmcSharedServiceNodeSettingForm', 'veleroCredential') : "",
                    'tkgSharedClusterBackupLocation': this.apiClient.tmcEnabled ? this.getFieldValue('vmcSharedServiceNodeSettingForm', 'veleroTargetLocation') : "",
                    'tkgSharedClusterVeleroDataProtection': {
                        'enableVelero': this.apiClient.tmcEnabled ? "false" : this.getStringBoolFieldValue('vmcSharedServiceNodeSettingForm', 'enableVelero'),
                        'username': this.apiClient.tmcEnabled ? "" : this.getFieldValue('vmcSharedServiceNodeSettingForm', 'veleroUsername'),
                        'passwordBase64': this.apiClient.tmcEnabled ? "" : btoa(this.getFieldValue('vmcSharedServiceNodeSettingForm', 'veleroPassword')),
                        'bucketName': this.apiClient.tmcEnabled ? "" : this.getFieldValue('vmcSharedServiceNodeSettingForm', 'veleroBucket'),
                        'backupRegion': this.apiClient.tmcEnabled ? "" : this.getFieldValue('vmcSharedServiceNodeSettingForm', 'veleroRegion'),
                        'backupS3Url': this.apiClient.tmcEnabled ? "" : this.getFieldValue('vmcSharedServiceNodeSettingForm', 'veleroS3Url'),
                        'backupPublicUrl': this.apiClient.tmcEnabled ? "" : this.getFieldValue('vmcSharedServiceNodeSettingForm', 'veleroPublicUrl'),
                    },
                },
                'tkgMgmtDataNetworkSpec': {
                    'tkgMgmtDataGatewayCidr': this.getFieldValue('vmcTKGMgmtDataNWForm', 'TKGMgmtGatewayCidr'),
                    'tkgMgmtDataDhcpStartRange': this.getFieldValue('vmcTKGMgmtDataNWForm', 'TKGMgmtDhcpStartRange'),
                    'tkgMgmtDataDhcpEndRange': this.getFieldValue('vmcTKGMgmtDataNWForm', 'TKGMgmtDhcpEndRange'),
                    'tkgMgmtDataServiceStartRange': this.getFieldValue('vmcTKGMgmtDataNWForm', 'TKGMgmtServiceStartRange'),
                    'tkgMgmtDataServiceEndRange': this.getFieldValue('vmcTKGMgmtDataNWForm', 'TKGMgmtServiceEndRange'),
                },
                'tkgWorkloadDataNetworkSpec': {
                    'tkgWorkloadDataGatewayCidr': this.getFieldValue('vmcTKGWorkloadDataNWForm', 'TKGDataGatewayCidr'),
                    'tkgWorkloadDataDhcpStartRange': this.getFieldValue('vmcTKGWorkloadDataNWForm', 'TKGDataDhcpStartRange'),
                    'tkgWorkloadDataDhcpEndRange': this.getFieldValue('vmcTKGWorkloadDataNWForm', 'TKGDataDhcpEndRange'),
                    'tkgWorkloadDataServiceStartRange': this.getFieldValue('vmcTKGWorkloadDataNWForm', 'TKGWrkServiceStartRange'),
                    'tkgWorkloadDataServiceEndRange': this.getFieldValue('vmcTKGWorkloadDataNWForm', 'TKGWrkServiceEndRange'),
                },
                'tkgWorkloadSpec': {
                    'tkgWorkloadGatewayCidr': this.getFieldValue('vmcWorkloadNodeSettingForm', 'gatewayAddress'),
                    'tkgWorkloadDhcpStartRange': this.getFieldValue('vmcWorkloadNodeSettingForm', 'workloadDhcpStartRange'),
                    'tkgWorkloadDhcpEndRange': this.getFieldValue('vmcWorkloadNodeSettingForm', 'workloadDhcpEndRange'),
                    'tkgWorkloadClusterName': this.getFieldValue('vmcWorkloadNodeSettingForm', 'clusterName'),
                    'tkgWorkloadSize': this.getWorkloadClusterSize(),
                    'tkgWorkloadCpuSize': !workloadGiven? "" : this.getFieldValue('vmcWorkloadNodeSettingForm', 'wrkCpu').toString(),
                    'tkgWorkloadMemorySize': !workloadGiven ? "" : this.getFieldValue('vmcWorkloadNodeSettingForm', 'wrkMemory').toString(),
                    'tkgWorkloadStorageSize': !workloadGiven ? "" : this.getFieldValue('vmcWorkloadNodeSettingForm', 'wrkStorage').toString(),
                    'tkgWorkloadDeploymentType': this.getFieldValue('vmcWorkloadNodeSettingForm', 'controlPlaneSetting'),
                    'tkgWorkloadWorkerMachineCount': !workloadGiven ? "" : this.getFieldValue('vmcWorkloadNodeSettingForm', 'workerNodeCount').toString(),
                    'tkgWorkloadClusterCidr': this.getFieldValue('vmcWorkloadNodeSettingForm', 'clusterCidr'),
                    'tkgWorkloadServiceCidr': this.getFieldValue('vmcWorkloadNodeSettingForm', 'serviceCidr'),
                    'tkgWorkloadBaseOs': this.getFieldValue('vmcWorkloadNodeSettingForm', 'baseImage'),
                    'tkgWorkloadKubeVersion': this.getFieldValue('vmcWorkloadNodeSettingForm', 'baseImageVersion'),
                    'tkgWorkloadEnableAviL7': !workloadGiven ? "false": this.getStringBoolFieldValue('vmcWorkloadNodeSettingForm', 'enableL7'),
                    'tkgWorkloadRbacUserRoleSpec': {
                        'clusterAdminUsers': this.getFieldValue('vmcWorkloadNodeSettingForm', 'clusterAdminUsers'),
                        'adminUsers': this.getFieldValue('vmcWorkloadNodeSettingForm', 'adminUsers'),
                        'editUsers': this.getFieldValue('vmcWorkloadNodeSettingForm', 'editUsers'),
                        'viewUsers': this.getFieldValue('vmcWorkloadNodeSettingForm', 'viewUsers'),
                    },
                    'tkgWorkloadTsmIntegration': !workloadGiven ? 'false' : this.setTSMEnable(),
                    'namespaceExclusions': {
                        'exactName': !workloadGiven ? "" : this.setTSMExactName(),
                        'startsWith': !workloadGiven ? "" : this.setTSMStartsWithName(),
                    },
                    'tkgWorkloadClusterGroupName': !workloadGiven ? "" : this.apiClient.tmcEnabled ? this.getFieldValue('vmcWorkloadNodeSettingForm', 'clusterGroupName'): "",
                    'tkgWorkloadEnableDataProtection': !workloadGiven ? "false" : this.apiClient.tmcEnabled ? this.getStringBoolFieldValue('vmcWorkloadNodeSettingForm', 'enableDataProtection') : "false",
                    'tkgWorkloadClusterCredential': !workloadGiven ? "" : this.apiClient.tmcEnabled ? this.getFieldValue('vmcWorkloadNodeSettingForm', 'veleroCredential'): "",
                    'tkgWorkloadClusterBackupLocation': !workloadGiven ? "" : this.apiClient.tmcEnabled ? this.getFieldValue('vmcWorkloadNodeSettingForm', 'veleroTargetLocation') : "",
                    'tkgWorkloadClusterVeleroDataProtection': {
                        'enableVelero': !workloadGiven ? "false" : this.apiClient.tmcEnabled ? "false": this.getStringBoolFieldValue('vmcWorkloadNodeSettingForm', 'enableVelero'),
                        'username': !workloadGiven ? "" : this.apiClient.tmcEnabled ? "" : this.getFieldValue('vmcWorkloadNodeSettingForm', 'veleroUsername'),
                        'passwordBase64': !workloadGiven ? "" : this.apiClient.tmcEnabled ? "" : btoa(this.getFieldValue('vmcWorkloadNodeSettingForm', 'veleroPassword')),
                        'bucketName': !workloadGiven ? "" : this.apiClient.tmcEnabled ? "" : this.getFieldValue('vmcWorkloadNodeSettingForm', 'veleroBucket'),
                        'backupRegion': !workloadGiven ? "" : this.apiClient.tmcEnabled ? "" : this.getFieldValue('vmcWorkloadNodeSettingForm', 'veleroRegion'),
                        'backupS3Url': !workloadGiven ? "" : this.apiClient.tmcEnabled ? "" : this.getFieldValue('vmcWorkloadNodeSettingForm', 'veleroS3Url'),
                        'backupPublicUrl': !workloadGiven ? "" : this.apiClient.tmcEnabled ? "" : this.getFieldValue('vmcWorkloadNodeSettingForm', 'veleroPublicUrl'),
                    },
                },
                'harborSpec': {
                    'enableHarborExtension': this.apiClient.sharedServicesClusterSettings.toString(),
                    'harborFqdn': this.getFieldValue('vmcSharedServiceNodeSettingForm', 'harborFqdn'),
                    'harborPasswordBase64': btoa(this.getFieldValue('vmcSharedServiceNodeSettingForm', 'harborPassword')),
                    'harborCertPath': this.getFieldValue('vmcSharedServiceNodeSettingForm', 'harborCertPath'),
                    'harborCertKeyPath': this.getFieldValue('vmcSharedServiceNodeSettingForm', 'harborCertKeyPath'),
                }
            },
            'tanzuExtensions': {
                'enableExtensions': this.getStringBoolFieldValue('vmcExtensionSettingForm', 'tanzuExtensions'),
                'tkgClustersName': this.getFieldValue('vmcExtensionSettingForm', 'tanzuExtensionClusters'),
                'logging': {
                    'syslogEndpoint': {
                        'enableSyslogEndpoint': this.enableLoggingExtension('Syslog'),
                        'syslogEndpointAddress': this.getFieldValue('vmcExtensionSettingForm', 'syslogEndpointAddress'),
                        'syslogEndpointPort': this.getFieldValue('vmcExtensionSettingForm', 'syslogEndpointPort'),
                        'syslogEndpointMode': this.getFieldValue('vmcExtensionSettingForm', 'syslogEndpointMode'),
                        'syslogEndpointFormat': this.getFieldValue('vmcExtensionSettingForm', 'syslogEndpointFormat'),
                    },
                    'httpEndpoint': {
                        'enableHttpEndpoint': this.enableLoggingExtension('HTTP'),
                        'httpEndpointAddress': this.getFieldValue('vmcExtensionSettingForm', 'httpEndpointAddress'),
                        'httpEndpointPort': this.getFieldValue('vmcExtensionSettingForm', 'httpEndpointPort'),
                        'httpEndpointUri': this.getFieldValue('vmcExtensionSettingForm', 'httpEndpointUri'),
                        'httpEndpointHeaderKeyValue': this.getFieldValue('vmcExtensionSettingForm', 'httpEndpointHeaderKeyValue'),
                    },
                    'kafkaEndpoint': {
                        'enableKafkaEndpoint': this.enableLoggingExtension('Kafka'),
                        'kafkaBrokerServiceName': this.getFieldValue('vmcExtensionSettingForm', 'kafkaBrokerServiceName'),
                        'kafkaTopicName': this.getFieldValue('vmcExtensionSettingForm', 'kafkaTopicName'),
                    },
                },
                'monitoring': {
                    'enableLoggingExtension': !this.apiClient.toEnabled ? this.getStringBoolFieldValue('vmcExtensionSettingForm', 'enableMonitoring') : "false",
                    'prometheusFqdn': !this.apiClient.toEnabled ? this.getFieldValue('vmcExtensionSettingForm', 'prometheusFqdn') : "",
                    'prometheusCertPath': !this.apiClient.toEnabled ? this.getFieldValue('vmcExtensionSettingForm', 'prometheusCertPath') : "",
                    'prometheusCertKeyPath': !this.apiClient.toEnabled ? this.getFieldValue('vmcExtensionSettingForm', 'prometheusCertKeyPath') : "",
                    'grafanaFqdn': !this.apiClient.toEnabled ? this.getFieldValue('vmcExtensionSettingForm', 'grafanaFqdn') : "",
                    'grafanaCertPath': !this.apiClient.toEnabled ? this.getFieldValue('vmcExtensionSettingForm', 'grafanaCertPath') : "",
                    'grafanaCertKeyPath': !this.apiClient.toEnabled ? this.getFieldValue('vmcExtensionSettingForm', 'grafanaCertKeyPath') : "",
                    'grafanaPasswordBase64': !this.apiClient.toEnabled ? btoa(this.getFieldValue('vmcExtensionSettingForm', 'grafanaPassword')) : "",
                }
            }
        };
        this.apiClient.vmcPayload = payload;
        return payload;
    }

    openViewJsonModal() {
        this.getPayload();
        this.generatedFileName = 'vmc-tkgm.json';
        this.viewJsonModal.open(this.generatedFileName);
    }

    public generateInput() {
        const payload = this.getPayload();
        this.disableDeployButton = true;
        this.generatedFileName = 'vmc-tkgm.json';
        this.filePath = '/opt/vmware/arcas/src/' + this.generatedFileName;
        this.showAwsTestMessage = false;
        // Call the Generate API
        this.apiClient.generateInputJSON(payload, this.generatedFileName, 'vmc').subscribe((data: any) => {
            if (data && data !== null) {
                if (data.responseType === 'SUCCESS') {
                    this.showAwsTestMessage = true;
                } else if (data.responseType === 'ERROR') {
                    this.errorNotification = data.msg;
                }
            } else {
                this.errorNotification = 'Generation of input json failed.';
            }
        }, (error: any) => {
            if (error.responseType === 'ERROR') {
                this.errorNotification = error.msg;
            } else {
                this.errorNotification = 'Generation of input json failed.';
            }
        });
    }

    public deploy() {
        this.getPayload();
        this.navigate(APP_ROUTES.WIZARD_PROGRESS);
    }

    public downloadSupportBundle() {
        this.loadingState = ClrLoadingState.LOADING;
        this.apiClient.downloadLogBundle('vsphere').subscribe(blob => {
            importedSaveAs(blob, this.logFileName);
            this.loadingState = ClrLoadingState.DEFAULT;
        }, (error: any) => {
            this.loadingState = ClrLoadingState.DEFAULT;
            this.errorNotification = "Failed to download Support Bundle for Service Installer";
        });
    }

}
