/*
 * Copyright 2021 VMware, Inc
 * SPDX-License-Identifier: BSD-2-Clause
 */
/**
 * Angular Modules
 */
import { Component, OnInit, Input } from '@angular/core';
import {
    Validators,
    FormControl
} from '@angular/forms';
import { Netmask } from 'netmask';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';
import { ClrLoadingState } from '@clr/angular';

/**
 * App imports
 */
import { PROVIDERS, Providers } from '../../../../shared/constants/app.constants';
import { NodeType, vSphereNodeTypes, toNodeTypes } from 'src/app/views/landing/wizard/shared/constants/wizard.constants';
import { StepFormDirective } from '../../wizard/shared/step-form/step-form';
import { ValidationService } from '../../wizard/shared/validation/validation.service';
import { AppEdition } from 'src/app/shared/constants/branding.constants';
import { APIClient } from 'src/app/swagger/api-client.service';
import { Subscription } from 'rxjs';
import { VMCDataService } from '../../../../shared/service/vmc-data.service';

const SupervisedField = ['veleroCredential', 'veleroTargetLocation', 'clusterGroupName'];

@Component({
    selector: 'app-workload-node-setting-step',
    templateUrl: './workload-node-setting.component.html',
    styleUrls: ['./workload-node-setting.component.scss']
})
export class WorkloadNodeSettingComponent extends StepFormDirective implements OnInit {
    @Input() providerType: string;
    @Input() errorNotification: string;
    nodeTypes: Array<NodeType> = [];
    toNodeTypes: Array<NodeType> = [];
    PROVIDERS: Providers = PROVIDERS;
    vSphereNodeTypes: Array<NodeType> = vSphereNodeTypes;
    toClusterNodeTypes: Array<NodeType> = toNodeTypes;
    nodeType: string;
    additionalNoProxyInfo: string;
    fullNoProxy: string;
    enableNetworkName = true;
    networks = [];

    segmentErrorMsg = 'Workload Segment not found, please update the segment value from the drop-down list';
    subscription: Subscription;
    private uploadStatus = false;
    private enableL7 = false;
    private controlPlaneSetting;
    private devInstanceType;
    private prodInstanceType;
    private wrkCluster;

    private wrkGateway;
    private workerNodeCount;
    private wrkDhcpStart;
    private wrkDhcpEnd;
    private wrkClusterCidr;
    private wrkServiceCidr;
    private enableTsm: boolean;
    private exactName;
    private startsWithName;
    private wrkBaseImage;
    private wrkBaseImageVersion;
    // Storage Setting Fields
    private wrkCpu;
    private wrkMemory;
    private wrkStorage;

    public clusterAdminUserSet = new Set();
    public adminUserSet = new Set();
    public editUserSet = new Set();
    public viewUserSet = new Set();
    private clusterAdminUsers;
    private adminUsers;
    private editUsers;
    private viewUsers;
    public rbacErrorClusterAdmin = false;
    public errorRBACClusterAdmin = "";
    public rbacErrorAdmin = false;
    public errorRBACAdmin = "";
    public rbacErrorEdit = false;
    public errorRBACEdit = "";
    public rbacErrorView = false;
    public errorRBACView = "";

    // VELERO
    loadingState: ClrLoadingState = ClrLoadingState.DEFAULT;
    public fetchCredential = false;
    public fetchBackupLocation = false;
    public validateCredential = false;
    public validateBackupLocation = false;
    public validatedDataProtection = false;
    public credentialValidationError = "";
    public targetLocationValidationError = "";
    // Offline VELERO
    private enableVelero = false;
    private veleroBucket;
    private veleroUsername;
    private veleroPassword;
    private veleroRegion;
    private veleroS3Url;
    private veleroPublicUrl;

    constructor(private validationService: ValidationService,
                public apiClient: APIClient,
                private  dataService: VMCDataService) {

        super();
        this.toClusterNodeTypes = [...toNodeTypes];
        this.nodeTypes = [...vSphereNodeTypes];
    }

    ngOnInit() {
        super.ngOnInit();

        this.formGroup.addControl('workloadClusterSettings', new FormControl(false));

        this.formGroup.addControl(
            'controlPlaneSetting',
            new FormControl('', [])
        );
        this.formGroup.addControl(
            'devInstanceType',
            new FormControl('', [])
        );
        this.formGroup.addControl(
            'prodInstanceType',
            new FormControl('', [])
        );
        this.formGroup.addControl(
            'clusterName',
            new FormControl('', [])
        );
        this.formGroup.addControl(
            'gatewayAddress',
            new FormControl('', [])
        );
        this.formGroup.addControl(
            'workloadDhcpStartRange',
            new FormControl('', [])
        );
        this.formGroup.addControl(
            'workloadDhcpEndRange',
            new FormControl('', [])
        );

        this.formGroup.addControl(
            'enableL7',
            new FormControl(false, [])
        );

        this.formGroup.addControl(
            'workerNodeCount',
            new FormControl('', [])
        );
        this.formGroup.addControl(
            'clusterCidr',
            new FormControl('100.96.0.0/11', [])
        );
        this.formGroup.addControl(
            'serviceCidr',
            new FormControl('100.64.0.0/13', [])
        );
        this.formGroup.addControl(
            'baseImage',
            new FormControl('', [])
        );
        this.formGroup.addControl(
            'baseImageVersion',
            new FormControl('', [])
        );
        this.formGroup.addControl(
            'tsmSettings',
            new FormControl(false)
        );
        this.formGroup.addControl(
            'exactName',
            new FormControl('', [])
        );
        this.formGroup.addControl(
            'startsWithName',
            new FormControl('', [])
        );
        // Custom Storage Settings
        this.formGroup.addControl('wrkCpu',
            new FormControl('', [])
        );
        this.formGroup.addControl(
            'wrkMemory',
            new FormControl('', [])
        );
        this.formGroup.addControl(
            'wrkStorage',
            new FormControl('', [])
        );

        this.formGroup.addControl(
            'clusterAdminUsers',
            new FormControl('', [])
        );
        this.formGroup.addControl(
            'adminUsers',
            new FormControl('', [])
        );
        this.formGroup.addControl(
            'editUsers',
            new FormControl('', [])
        );
        this.formGroup.addControl(
            'viewUsers',
            new FormControl('', [])
        );
        this.formGroup.addControl(
            'clusterGroupName',
            new FormControl('', [])
        );
        this.formGroup.addControl(
            'enableDataProtection',
            new FormControl(false)
        );
        this.formGroup.addControl(
            'veleroCredential',
            new FormControl('', [])
        );
        this.formGroup.addControl(
            'veleroTargetLocation',
            new FormControl('', [])
        );
        this.formGroup.addControl(
            'enableVelero',
            new FormControl(false)
        );
        this.formGroup.addControl(
            'veleroBucket',
            new FormControl('', [])
        );
        this.formGroup.addControl(
            'veleroUsername',
            new FormControl('', [])
        );
        this.formGroup.addControl(
            'veleroPassword',
            new FormControl('', [])
        );
        this.formGroup.addControl(
            'veleroRegion',
            new FormControl('', [])
        );
        this.formGroup.addControl(
            'veleroS3Url',
            new FormControl('', [])
        );
        this.formGroup.addControl(
            'veleroPublicUrl',
            new FormControl('', [])
        );
        SupervisedField.forEach(field => {
            this.formGroup.get(field).valueChanges.pipe(
                debounceTime(500),
                distinctUntilChanged((prev, curr) => JSON.stringify(prev) === JSON.stringify(curr)),
                takeUntil(this.unsubscribe))
                .subscribe(() => {
                    if (this.apiClient.wrkDataProtectionEnabled && this.validatedDataProtection){
                        this.validatedDataProtection = false;
                        this.loadingState = ClrLoadingState.DEFAULT;
                    }
                });
        });
        this.formGroup['canMoveToNext'] = () => {
            this.toggleWorkloadClusterSettings();
            if(!this.apiClient.workloadClusterSettings){
                return this.formGroup.valid;
            } else {
                this.onTkgWrkValidateClick();
                this.setMinWorker();
                if (this.apiClient.wrkDataProtectionEnabled) {
                    if (this.uploadStatus) {
                        return (this.formGroup.valid && this.apiClient.TkgWrkNwValidated &&
                            !this.rbacErrorClusterAdmin && !this.rbacErrorAdmin &&
                            !this.rbacErrorEdit && !this.rbacErrorView &&
                            this.validatedDataProtection);
                    }
                    return (this.formGroup.valid && this.apiClient.TkgWrkNwValidated &&
                        !this.rbacErrorClusterAdmin && !this.rbacErrorAdmin &&
                        !this.rbacErrorEdit && !this.rbacErrorView &&
                        this.fetchCredential && this.fetchBackupLocation &&
                        this.validatedDataProtection);
                } else {
                    return (this.formGroup.valid && this.apiClient.TkgWrkNwValidated &&
                        !this.rbacErrorClusterAdmin && !this.rbacErrorAdmin &&
                        !this.rbacErrorEdit && !this.rbacErrorView);
                }
            }
        };
        setTimeout(_ => {
            if(this.apiClient.workloadClusterSettings){
                this.formGroup.get('controlPlaneSetting').valueChanges.subscribe(data => {
                    if (data === 'dev') {
                        this.nodeType = 'dev';
                        this.formGroup.get('devInstanceType').setValidators([
                            Validators.required
                        ]);
                        this.formGroup.controls['prodInstanceType'].clearValidators();
                        this.formGroup.controls['prodInstanceType'].setValue('');
                    } else if (data === 'prod') {
                        this.nodeType = 'prod';
                        this.formGroup.controls['prodInstanceType'].setValidators([
                            Validators.required
                        ]);
                        this.formGroup.get('devInstanceType').clearValidators();
                        this.formGroup.controls['devInstanceType'].setValue('');
                    }
                    this.formGroup.get('devInstanceType').updateValueAndValidity();
                    this.formGroup.controls['prodInstanceType'].updateValueAndValidity();
                });
                this.formGroup.get('workerNodeCount').valueChanges.subscribe(data => {
                    if (this.apiClient.workloadClusterSettings){
                        if(this.apiClient.tmcEnabled && this.nodeType === 'prod'){
                            this.formGroup.get('workerNodeCount').setValidators([
                                Validators.required, Validators.min(3)]);
                        }else{
                            this.formGroup.get('workerNodeCount').setValidators([
                                Validators.required, Validators.min(1)]);
                        }
                    }
                });

                if (this.edition !== AppEdition.TKG) {
                    this.resurrectField('clusterName',
                        [Validators.required, this.validationService.isValidClusterName(),
                        this.validationService.noWhitespaceOnEnds()],
                        this.formGroup.get('clusterName').value);
                }
                this.resurrectField('gatewayAddress',
                    [Validators.required, this.validationService.isValidIpNetworkSegment(),
                    this.validationService.noWhitespaceOnEnds()],
                    this.formGroup.get('gatewayAddress').value);
                this.resurrectField('workloadDhcpStartRange',
                    [Validators.required, this.validationService.isValidIp(),
                    this.validationService.noWhitespaceOnEnds()],
                    this.formGroup.get('workloadDhcpStartRange').value);
                this.resurrectField('workloadDhcpEndRange',
                    [Validators.required, this.validationService.isValidIp(),
                    this.validationService.noWhitespaceOnEnds()],
                    this.formGroup.get('workloadDhcpEndRange').value);
                this.resurrectField('workerNodeCount',
                    [Validators.required],
                    this.formGroup.get('workerNodeCount').value);
                this.resurrectField('clusterCidr',
                    [Validators.required, this.validationService.isValidIpNetworkSegment(),
                    this.validationService.noWhitespaceOnEnds()],
                    this.formGroup.get('clusterCidr').value);
                this.resurrectField('serviceCidr',
                    [Validators.required, this.validationService.isValidIpNetworkSegment(),
                    this.validationService.noWhitespaceOnEnds()],
                    this.formGroup.get('serviceCidr').value);
                this.formGroup.get('gatewayAddress').valueChanges.subscribe(
                    () => this.apiClient.TkgWrkNwValidated = false);
                this.formGroup.get('workloadDhcpStartRange').valueChanges.subscribe(
                    () => this.apiClient.TkgWrkNwValidated = false);
                this.formGroup.get('workloadDhcpEndRange').valueChanges.subscribe(
                    () => this.apiClient.TkgWrkNwValidated = false);

                this.subscription = this.dataService.currentInputFileStatus.subscribe(
                    (uploadStatus) => this.uploadStatus = uploadStatus);
                if (!this.uploadStatus) {
                }
                if (this.uploadStatus) {
                    this.subscription = this.dataService.currentWrkDeploymentType.subscribe(
                    (controlPlaneSetting) => this.controlPlaneSetting = controlPlaneSetting);
                    this.formGroup.get('controlPlaneSetting').setValue(this.controlPlaneSetting);
                    if (this.controlPlaneSetting === 'dev') {
                        this.subscription = this.dataService.currentWrkDeploymentSize.subscribe(
                            (devInstanceType) => this.devInstanceType = devInstanceType);
                        if (this.apiClient.toEnabled) {
                            if (['small', 'medium', 'large', 'extra-large'].indexOf(this.devInstanceType) !== -1) {
                                this.formGroup.get('devInstanceType').setValue(this.devInstanceType);
                            }
                        } else {
                            if (['small', 'medium', 'large', 'extra-large'].indexOf(this.devInstanceType) !== -1) {
                                this.formGroup.get('devInstanceType').setValue(this.devInstanceType);
                            }
                        }
                    } else if (this.controlPlaneSetting === 'prod') {
                        this.subscription = this.dataService.currentWrkDeploymentSize.subscribe(
                            (prodInstanceType) => this.prodInstanceType = prodInstanceType);
                        if (this.apiClient.toEnabled) {
                            if (['small', 'medium', 'large', 'extra-large'].indexOf(this.prodInstanceType) !== -1) {
                                this.formGroup.get('prodInstanceType').setValue(this.prodInstanceType);
                            }
                        } else {
                            if (['small', 'medium', 'large', 'extra-large'].indexOf(this.prodInstanceType) !== -1) {
                                this.formGroup.get('prodInstanceType').setValue(this.prodInstanceType);
                            }
                        }
                    }
                    this.subscription = this.dataService.currentAviL7Workload.subscribe(
                        (enableL7) => this.enableL7 = enableL7);
                    this.formGroup.get('enableL7').setValue(this.enableL7);
                    if (this.devInstanceType === 'custom' || this.prodInstanceType === 'custom'){
                        this.subscription = this.dataService.currentWrkCpu.subscribe(
                            (cpu) => this.wrkCpu = cpu);
                        this.formGroup.get('wrkCpu').setValue(this.wrkCpu);
                        this.subscription = this.dataService.currentWrkStorage.subscribe(
                            (storage) => this.wrkStorage = storage);
                        this.formGroup.get('wrkStorage').setValue(this.wrkStorage);
                        this.subscription = this.dataService.currentWrkMemory.subscribe(
                            (memory) => this.wrkMemory = memory);
                        this.formGroup.get('wrkMemory').setValue(this.wrkMemory);
                    }
                    this.subscription = this.dataService.currentWrkClusterName.subscribe(
                        (wrkCluster) => this.wrkCluster = wrkCluster);
                    this.formGroup.get('clusterName').setValue(this.wrkCluster);
                    this.subscription = this.dataService.currentWrkGateway.subscribe(
                        (wrkGateway) => this.wrkGateway = wrkGateway);
                    this.formGroup.get('gatewayAddress').setValue(this.wrkGateway);
                    this.subscription = this.dataService.currentWrkClusterCidr.subscribe(
                        (wrkClusterCidr) => this.wrkClusterCidr = wrkClusterCidr);
                    this.formGroup.get('clusterCidr').setValue(this.wrkClusterCidr);
                    this.subscription = this.dataService.currentWrkServiceCidr.subscribe(
                        (wrkServiceCidr) => this.wrkServiceCidr = wrkServiceCidr);
                    this.formGroup.get('serviceCidr').setValue(this.wrkServiceCidr);

                    this.subscription = this.dataService.currentWrkBaseImage.subscribe(
                        (wrkBaseImage) => this.wrkBaseImage = wrkBaseImage);
                    this.subscription = this.dataService.currentWrkBaseImageVersion.subscribe(
                        (wrkBaseImageVersion) => this.wrkBaseImageVersion = wrkBaseImageVersion);
                    if (this.apiClient.baseImage.indexOf(this.wrkBaseImage) !== -1) {
                        this.formGroup.get('baseImage').setValue(this.wrkBaseImage);
                    }
                    if (this.apiClient.baseImageVersion.indexOf(this.wrkBaseImageVersion) !== -1) {
                        this.formGroup.get('baseImageVersion').setValue(this.wrkBaseImageVersion);
                    }

                    this.subscription = this.dataService.currentWrkDhcpStart.subscribe(
                        (dhcpStart) => this.wrkDhcpStart = dhcpStart);
                    this.formGroup.get('workloadDhcpStartRange').setValue(this.wrkDhcpStart);
                    this.subscription = this.dataService.currentWrkDhcpEnd.subscribe(
                        (dhcpEnd) => this.wrkDhcpEnd = dhcpEnd);
                    this.formGroup.get('workloadDhcpEndRange').setValue(this.wrkDhcpEnd);

                    if ((this.wrkGateway !== '') && (this.wrkDhcpStart !== '') && (this.wrkDhcpEnd !== '')) {
                        const block = new Netmask(this.wrkGateway);
                        if (block.contains(this.wrkDhcpStart) && block.contains(this.wrkDhcpEnd)) {
                            this.apiClient.TkgWrkNwValidated = true;
                            this.errorNotification = '';
                        } else if (!block.contains(this.wrkDhcpStart) && !block.contains(this.wrkDhcpEnd)) {
                            this.apiClient.TkgWrkNwValidated = false;
                            this.errorNotification = 'DHCP Start and End IP is out of the provided subnet';
                        } else if (!block.contains(this.wrkDhcpStart)) {
                            this.apiClient.TkgWrkNwValidated = false;
                            this.errorNotification = 'DHCP Start IP is out of the provided subnet';
                        } else if (!block.contains(this.wrkDhcpEnd)) {
                            this.apiClient.TkgSharedNwValidated = false;
                            this.errorNotification = 'DHCP End IP is out of the provided subnet';
                        }
                    }
                    if(!this.apiClient.tmcEnabled) {
                        this.subscription = this.dataService.currentWrkEnableVelero.subscribe(
                            (enable) => this.enableVelero = enable);
                        this.formGroup.get('enableVelero').setValue(this.enableVelero);
                        if(this.enableVelero) {
                            this.subscription = this.dataService.currentWrkVeleroUsername.subscribe(
                                (username) => this.veleroUsername = username);
                            this.formGroup.get('veleroUsername').setValue(this.veleroUsername);
                            this.subscription = this.dataService.currentWrkVeleroPassword.subscribe(
                                (password) => this.veleroPassword = password);
                            this.formGroup.get('veleroPassword').setValue(this.veleroPassword);
                            this.subscription = this.dataService.currentWrkVeleroBucketName.subscribe(
                                (bucket) => this.veleroBucket = bucket);
                            this.formGroup.get('veleroBucket').setValue(this.veleroBucket);
                            this.subscription = this.dataService.currentWrkVeleroRegion.subscribe(
                                (region) => this.veleroRegion = region);
                            this.formGroup.get('veleroRegion').setValue(this.veleroRegion);
                            this.subscription = this.dataService.currentWrkVeleroS3Url.subscribe(
                                (s3Url) => this.veleroS3Url = s3Url);
                            this.formGroup.get('veleroS3Url').setValue(this.veleroS3Url);
                            this.subscription = this.dataService.currentWrkVeleroPublicUrl.subscribe(
                                (publicUrl) => this.veleroPublicUrl = publicUrl);
                            this.formGroup.get('veleroPublicUrl').setValue(this.veleroPublicUrl);
                        }
                    }

                    if (this.apiClient.enableIdentityManagement){
                        this.subscription = this.dataService.currentWrkClusterAdminUsers.subscribe(
                            (clusterAdminUsers) => this.clusterAdminUsers = clusterAdminUsers);
                        this.formGroup.get('clusterAdminUsers').setValue(this.clusterAdminUsers);
                        this.subscription = this.dataService.currentWrkAdminUsers.subscribe(
                            (adminUsers) => this.adminUsers = adminUsers);
                        this.formGroup.get('adminUsers').setValue(this.adminUsers);
                        this.subscription = this.dataService.currentWrkEditUsers.subscribe(
                            (editUsers) => this.editUsers = editUsers);
                        this.formGroup.get('editUsers').setValue(this.editUsers);
                        this.subscription = this.dataService.currentWrkViewUsers.subscribe(
                            (viewUsers) => this.viewUsers = viewUsers);
                        this.formGroup.get('viewUsers').setValue(this.viewUsers);
                    }
                    if (this.apiClient.tmcEnabled) {
                        this.subscription = this.dataService.currentEnableTSM.subscribe(
                            (tsmEnable) => this.enableTsm = tsmEnable);
                        this.formGroup.get('tsmSettings').setValue(this.enableTsm);
                        this.toggleTSMSetting();
                        if (this.enableTsm) {
                            this.subscription = this.dataService.currentExactNamespaceExclusion.subscribe(
                                (tsmExactName) => this.exactName = tsmExactName);
                            this.formGroup.get('exactName').setValue(this.exactName);
                            this.subscription = this.dataService.currentStartsWithNamespaceExclusion.subscribe(
                                (tsmStartsWith) => this.startsWithName = tsmStartsWith);
                            this.formGroup.get('startsWithName').setValue(this.startsWithName);
                        }
                    } else {
                        this.formGroup.get('tsmSettings').setValue(false);
                        this.formGroup.get('exactName').setValue('');
                        this.formGroup.get('startsWithName').setValue('');
                    }
                    this.subscription = this.dataService.currentWrkWorkerNodeCount.subscribe(
                        (worker) => this.workerNodeCount = worker);
                    if (this.apiClient.tmcEnabled && this.nodeType==='prod') {
                        if (this.workerNodeCount >= 3) {
                            this.formGroup.get('workerNodeCount').setValue(this.workerNodeCount);
                        }
                    } else {
                        if (this.workerNodeCount >= 1) {
                            this.formGroup.get('workerNodeCount').setValue(this.workerNodeCount);
                        }
                    }
                }
            }
        });
        this.networks = this.apiClient.networks;
    }

    setSavedDataAfterLoad() {
        if (this.hasSavedData()) {
            this.cardClick(this.getSavedValue('devInstanceType', '') === '' ? 'prod' : 'dev');
            super.setSavedDataAfterLoad();
            // set the node type ID by finding it by the node type name
            let savedNodeType = this.nodeTypes.find(n => n.name === this.getSavedValue('devInstanceType', ''));
            if (savedNodeType) {
                this.formGroup.get('devInstanceType').setValue(savedNodeType.id);
            }
            savedNodeType = this.nodeTypes.find(n => n.name === this.getSavedValue('prodInstanceType', ''));
            if (savedNodeType) {
                this.formGroup.get('prodInstanceType').setValue(savedNodeType.id);
            }
        }
    }

    cardClick(envType: string) {
        this.formGroup.controls['controlPlaneSetting'].setValue(envType);
    }

    getEnvType(): string {
        return this.formGroup.controls['controlPlaneSetting'].value;
    }

    setMinWorker() {
        if (this.formGroup.controls['controlPlaneSetting'].value === 'prod' && this.apiClient.tmcEnabled) {
            this.formGroup.get('workerNodeCount').setValidators([Validators.min(3), Validators.required]);
        } else {
            this.formGroup.get('workerNodeCount').setValidators([Validators.min(1), Validators.required]);
        }
    }

    toggleTSMSetting() {
        const tsmSettingsFields = [
            'exactName',
            'startsWithName',
        ];
        if (this.apiClient.tmcEnabled && this.formGroup.value['tsmSettings']) {
            this.resurrectField('exactName', [this.validationService.noWhitespaceOnEnds()], this.formGroup.value['exactName']);
            this.resurrectField('startsWithName', [this.validationService.noWhitespaceOnEnds()], this.formGroup.value['startsWithName']);
        } else {
            tsmSettingsFields.forEach((field) => {
                this.disarmField(field, true);
            });
        }
    }

    getBaseOsVersion() {
        this.apiClient.getKubeVersions('vmc').subscribe((data: any) => {
            if (data && data !== null) {
                if (data.responseType === 'SUCCESS') {
                    this.apiClient.baseImageVersion = data.KUBE_VERSION_LIST;
                    this.formGroup.get('baseImageVersion').enable();
                    if (this.uploadStatus) {
                        if (this.wrkBaseImageVersion !== '') {
                            if (this.apiClient.baseImageVersion.indexOf(this.wrkBaseImageVersion) !== -1) {
                                this.formGroup.get('baseImageVersion').setValue(this.wrkBaseImageVersion);
                            }
                        }
                    }
                } else if (data.responseType === 'ERROR') {
                    this.errorNotification = 'Base OS Version: ' + data.msg;
                }
            } else {
                this.errorNotification = 'Base OS Version: Some Error occurred while fetching Kube Versions';
            }
        }, (error: any) => {
            if (error.responseType === 'ERROR') {
                this.errorNotification = 'Base OS Version: ' + error.msg;
            } else {
                this.errorNotification = 'Base OS Version: Some Error occurred while fetching Kube Versions';
            }
        });
    }

    onBaseOsChange() {
        if (this.formGroup.get('baseImage').valid) {
            if (this.formGroup.get('baseImage').value !== '') {
                this.getBaseOsVersion();
            }
        }
    }

    public onTkgWrkValidateClick() {
        if (this.apiClient.workloadClusterSettings){
            if (this.formGroup.get('gatewayAddress').valid &&
                this.formGroup.get('workloadDhcpStartRange').valid &&
                this.formGroup.get('workloadDhcpEndRange').valid) {
                const gatewayIp = this.formGroup.get('gatewayAddress').value;
                const dhcpStart = this.formGroup.get('workloadDhcpStartRange').value;
                const dhcpEnd = this.formGroup.get('workloadDhcpEndRange').value;
                const block = new Netmask(gatewayIp);
                if (block.contains(dhcpStart) && block.contains(dhcpEnd)) {
                    this.apiClient.TkgWrkNwValidated = true;
                    this.errorNotification = '';
                } else if (!(block.contains(dhcpStart)) && !(block.contains(dhcpEnd))) {
                    this.apiClient.TkgWrkNwValidated = false;
                    this.errorNotification = 'DHCP Start and End IP is out of the provided subnet';
                } else if (!block.contains(dhcpStart)) {
                    this.apiClient.TkgWrkNwValidated = false;
                    this.errorNotification = 'DHCP Start IP is out of the provided subnet';
                } else if (!block.contains(dhcpEnd)) {
                    this.apiClient.TkgSharedNwValidated = false;
                    this.errorNotification = 'DHCP End IP is out of the provided subnet';
                }
            }
        }
    }

    checkCustom() {
        const storageFields = [
            'wrkCpu',
            'wrkMemory',
            'wrkStorage',
        ];
        if (this.formGroup.get('devInstanceType').valid ||
            this.formGroup.get('prodInstanceType').valid) {
            if (this.formGroup.get('devInstanceType').value === 'custom' ||
                this.formGroup.get('prodInstanceType').value === 'custom') {
                this.resurrectField('wrkCpu', [
                    Validators.required,
                    Validators.min(2)],
                    this.formGroup.value['wrkCpu']);
                this.resurrectField('wrkMemory', [
                    Validators.required,
                    Validators.min(4)],
                    this.formGroup.value['wrkMemory']);
                this.resurrectField('wrkStorage', [
                    Validators.required,
                    Validators.min(20)],
                    this.formGroup.value['wrkStorage']);
            } else {
                storageFields.forEach((field) => {
                    this.disarmField(field, true);
                });
            }
        }
    }

    onClusterAdminFieldChange() {
        if (this.formGroup.get('clusterAdminUsers').valid &&
            this.formGroup.get('clusterAdminUsers').value !== "" &&
            this.formGroup.get('clusterAdminUsers').value !== null) {
            let clusterAdminUsers = this.formGroup.get('clusterAdminUsers').value.split(',');
            this.clusterAdminUserSet.clear();
            for (let item of clusterAdminUsers) {
                item = item.trim();
                if (item === "") continue;
                if (this.clusterAdminUserSet.has(item)) {
                    this.rbacErrorClusterAdmin = true;
                    this.errorRBACClusterAdmin = item + " user is already present in CLUSTER ADMIN ROLE list";
                    return;
                } else if(this.adminUserSet.has(item)) {
                    this.rbacErrorClusterAdmin = true;
                    this.errorRBACClusterAdmin = item + " user is already present in ADMIN ROLE list";
                    return;
                } else if (this.editUserSet.has(item)) {
                    this.rbacErrorClusterAdmin = true;
                    this.errorRBACClusterAdmin = item + " user is already present in EDIT ROLE list";
                    return;
                } else if (this.viewUserSet.has(item)) {
                    this.rbacErrorClusterAdmin = true;
                    this.errorRBACClusterAdmin = item + " user is already present in VIEW ROLE list";
                    return;
                } else {
                    this.clusterAdminUserSet.add(item);
                }
            }
            this.rbacErrorClusterAdmin = false;
        }
    }


    onAdminFieldChange() {
        if (this.formGroup.get('adminUsers').valid &&
            this.formGroup.get('adminUsers').value !== "" &&
            this.formGroup.get('adminUsers').value !== null) {
            let adminUsers = this.formGroup.get('adminUsers').value.split(',');
            this.adminUserSet.clear();
            for (let item of adminUsers) {
                item = item.trim();
                if (item === "") continue;
                if (this.clusterAdminUserSet.has(item)) {
                    this.rbacErrorAdmin = true;
                    this.errorRBACAdmin = item + " user is already present in CLUSTER ADMIN ROLE list";
                    return;
                } else if(this.adminUserSet.has(item)) {
                    this.rbacErrorAdmin = true;
                    this.errorRBACAdmin = item + " user is already present in ADMIN ROLE list";
                    return;
                } else if (this.editUserSet.has(item)) {
                    this.rbacErrorAdmin = true;
                    this.errorRBACAdmin = item + " user is already present in EDIT ROLE list";
                    return;
                } else if (this.viewUserSet.has(item)) {
                    this.rbacErrorAdmin = true;
                    this.errorRBACAdmin = item + " user is already present in VIEW ROLE list";
                    return;
                } else {
                    this.adminUserSet.add(item);
                }
            }
            this.rbacErrorAdmin = false;
        }
    }


    onEditFieldChange() {
        if (this.formGroup.get('editUsers').valid &&
            this.formGroup.get('editUsers').value !== "" &&
            this.formGroup.get('editUsers').value !== null) {
            let editUsers = this.formGroup.get('editUsers').value.split(',');
            this.editUserSet.clear();
            for (let item of editUsers) {
                item = item.trim();
                if (item === "") continue;
                if (this.clusterAdminUserSet.has(item)) {
                    this.rbacErrorEdit = true;
                    this.errorRBACEdit = item + " user is already present in CLUSTER ADMIN ROLE list";
                    return;
                } else if(this.adminUserSet.has(item)) {
                    this.rbacErrorEdit = true;
                    this.errorRBACEdit = item + " user is already present in ADMIN ROLE list";
                    return;
                } else if (this.editUserSet.has(item)) {
                    this.rbacErrorEdit = true;
                    this.errorRBACEdit = item + " user is already present in EDIT ROLE list";
                    return;
                } else if (this.viewUserSet.has(item)) {
                    this.rbacErrorEdit = true;
                    this.errorRBACEdit = item + " user is already present in VIEW ROLE list";
                    return;
                } else {
                    this.editUserSet.add(item);
                }
            }
            this.rbacErrorEdit = false;
        }
    }


    onViewFieldChange() {
        if (this.formGroup.get('viewUsers').valid &&
            this.formGroup.get('viewUsers').value !== "" &&
            this.formGroup.get('viewUsers').value !== null) {
            let viewUsers = this.formGroup.get('viewUsers').value.split(',');
            this.viewUserSet.clear();
            for (let item of viewUsers) {
                item = item.trim();
                if (item === "") continue;
                if (this.clusterAdminUserSet.has(item)) {
                    this.rbacErrorView = true;
                    this.errorRBACView = item + " user is already present in CLUSTER ADMIN ROLE list";
                    return;
                } else if(this.adminUserSet.has(item)) {
                    this.rbacErrorView = true;
                    this.errorRBACView = item + " user is already present in ADMIN ROLE list";
                    return;
                } else if (this.editUserSet.has(item)) {
                    this.rbacErrorView = true;
                    this.errorRBACView = item + " user is already present in EDIT ROLE list";
                    return;
                } else if (this.viewUserSet.has(item)) {
                    this.rbacErrorView = true;
                    this.errorRBACView = item + " user is already present in VIEW ROLE list";
                    return;
                } else {
                    this.viewUserSet.add(item);
                }
            }
            this.rbacErrorView = false;
        }
    }


    fetchVeleroCredentials() {
        let tmcData = {
            "refreshToken": "",
            "instanceUrl": ""
        };
        let refreshToken;
        let instanceUrl;
        this.dataService.currentApiToken.subscribe((token) => refreshToken = token);
        tmcData["refreshToken"] = refreshToken;
        this.dataService.currentInstanceUrl.subscribe((url) => instanceUrl = url);
        tmcData["instanceUrl"] = instanceUrl;
        this.apiClient.fetchCredentials(tmcData, 'vmc').subscribe((data: any) => {
            if (data && data !== null) {
                if (data.responseType === 'SUCCESS') {
                    this.apiClient.dataProtectionCredentials = data.CREDENTIALS;
                    this.fetchCredential = true;
                    this.credentialValidationError = "";
                    if (this.uploadStatus) {
                        let credential;
                        this.dataService.currentWrkDataProtectionCreds.subscribe((cred) => credential = cred);
                        if (this.apiClient.dataProtectionCredentials.indexOf(credential) !== -1){
                            this.formGroup.get('veleroCredential').setValue(credential);
                        }
                    }
                } else if (data.responseType === 'ERROR') {
                    this.fetchCredential = false;
                    this.credentialValidationError = data.msg;
                }
            } else {
                this.fetchCredential = false;
                this.credentialValidationError = "Failed to fetch available credentials";
            }
        }, (error: any) => {
            if (error.responseType === 'ERROR') {
                this.fetchCredential = false;
                this.credentialValidationError = error.msg;
            } else {
                this.fetchCredential = false;
                this.credentialValidationError = "Failed to fetch available credentials";
            }
        });
    }

    fetchVeleroBackupLocations() {
        let tmcData = {
            "refreshToken": "",
            "instanceUrl": ""
        };
        let refreshToken;
        let instanceUrl;
        this.dataService.currentApiToken.subscribe((token) => refreshToken = token);
        tmcData["refreshToken"] = refreshToken;
        this.dataService.currentInstanceUrl.subscribe((url) => instanceUrl = url);
        tmcData["instanceUrl"] = instanceUrl;
        this.apiClient.fetchTargetLocations(tmcData, 'vmc').subscribe((data: any) => {
            if (data && data !== null) {
                if (data.responseType === 'SUCCESS') {
                    this.apiClient.dataProtectionTargetLocations = data.TARGET_LOCATIONS;
                    this.fetchBackupLocation = true;
                    this.targetLocationValidationError = "";
                    if (this.uploadStatus) {
                        let backupLocation;
                        this.dataService.currentWrkDataProtectionTargetLocation.subscribe((loc) => backupLocation = loc);
                        if (this.apiClient.dataProtectionTargetLocations.indexOf(backupLocation) !== -1){
                            this.formGroup.get('veleroTargetLocation').setValue(backupLocation);
                        }
                    }
                } else if (data.responseType === 'ERROR') {
                    this.fetchBackupLocation = false;
                    this.targetLocationValidationError = data.msg;
                }
            } else {
                this.fetchBackupLocation = false;
                this.targetLocationValidationError = "Failed to fetch available backup locations";
            }
        }, (error: any) => {
            if (error.responseType === 'ERROR') {
                this.fetchBackupLocation = false;
                this.targetLocationValidationError = error.msg;
            } else {
                this.fetchBackupLocation = false;
                this.targetLocationValidationError = "Failed to fetch available backup locations";
            }
        });
    }

    validateVeleroCredential(credential, targetLocation, clusterGroup) {
        let tmcData = {
            "refreshToken": "",
            "instanceUrl": "",
            "credential": credential,
            "targetLocation": targetLocation,
            "clusterGroupName": clusterGroup
        };
        let refreshToken;
        let instanceUrl;
        this.dataService.currentApiToken.subscribe((token) => refreshToken = token);
        tmcData["refreshToken"] = refreshToken;
        this.dataService.currentInstanceUrl.subscribe((url) => instanceUrl = url);
        tmcData["instanceUrl"] = instanceUrl;
        this.apiClient.validateCredentials(tmcData, 'vmc', 'workload').subscribe((data: any) => {
            if (data && data !== null) {
                if (data.responseType === 'SUCCESS') {
                    this.credentialValidationError = "";
                    this.validateVeleroBackupLocation(credential, targetLocation, clusterGroup);
                } else if (data.responseType === 'ERROR') {
                    this.validatedDataProtection = false;
                    this.credentialValidationError = data.msg;
                    this.loadingState = ClrLoadingState.DEFAULT;
                }
            } else {
                this.validatedDataProtection = false;
                this.credentialValidationError = "Failed to fetch available credentials";
                this.loadingState = ClrLoadingState.DEFAULT;
            }
        }, (error: any) => {
            if (error.responseType === 'ERROR') {
                this.validatedDataProtection = false;
                this.credentialValidationError = error.msg;
                this.loadingState = ClrLoadingState.DEFAULT;
            } else {
                this.validatedDataProtection = false;
                this.credentialValidationError = "Failed to fetch available credentials";
                this.loadingState = ClrLoadingState.DEFAULT;
            }
        });
    }

    onValidateDataProtection() {
        if (this.formGroup.get('veleroCredential').value !== '' &&
            this.formGroup.get('veleroTargetLocation').value !== '' &&
            this.formGroup.get('clusterGroupName').value !== ''){
            this.loadingState = ClrLoadingState.LOADING;
            this.validateVeleroCredential(this.formGroup.get('veleroCredential').value,
                this.formGroup.get('veleroTargetLocation').value, this.formGroup.get('clusterGroupName').value);
        }
    }

    onVeleroCredentialChange() {
        this.validateCredential = false;
        if(this.formGroup.get('veleroCredential').value !== ''){
        }
    }

    onVeleroBackupLocationChange() {
        this.validateCredential = false;
        if(this.formGroup.get('veleroTargetLocation').value !== ''){
        }
    }

    validateVeleroBackupLocation(credential, backupLocation, clusterGroupName) {
        let tmcData = {
            "refreshToken": "",
            "instanceUrl": "",
            "credential": credential,
            "backupLocation": backupLocation,
            "clusterGroupName": clusterGroupName
        };
        let refreshToken;
        let instanceUrl;
        this.dataService.currentApiToken.subscribe((token) => refreshToken = token);
        tmcData["refreshToken"] = refreshToken;
        this.dataService.currentInstanceUrl.subscribe((url) => instanceUrl = url);
        tmcData["instanceUrl"] = instanceUrl;
        this.apiClient.validateTargetLocations(tmcData, 'vmc', 'workload').subscribe((data: any) => {
            if (data && data !== null) {
                if (data.responseType === 'SUCCESS') {
                    this.validatedDataProtection = true;
                    this.targetLocationValidationError = "";
                    this.loadingState = ClrLoadingState.DEFAULT;
                } else if (data.responseType === 'ERROR') {
                    this.validatedDataProtection = false;
                    this.targetLocationValidationError = data.msg;
                    this.loadingState = ClrLoadingState.DEFAULT;
                }
            } else {
                this.validatedDataProtection = false;
                this.targetLocationValidationError = "Failed to fetch available backup locations";
                this.loadingState = ClrLoadingState.DEFAULT;
            }
        }, (error: any) => {
            if (error.responseType === 'ERROR') {
                this.validatedDataProtection = false;
                this.targetLocationValidationError = error.msg;
                this.loadingState = ClrLoadingState.DEFAULT;
            } else {
                this.validatedDataProtection = false;
                this.targetLocationValidationError = "Failed to fetch available backup locations";
                this.loadingState = ClrLoadingState.DEFAULT;
            }
        });
    }

    toggleEnableDataProtection() {
        const dataProtectionFields = [
            'veleroCredential',
            'veleroTargetLocation',
        ];
        if (this.formGroup.value['enableDataProtection']) {
            this.apiClient.wrkDataProtectionEnabled = true;
            this.resurrectField('veleroCredential', [
                Validators.required
            ], this.formGroup.value['veleroCredential']);
            this.resurrectField('veleroTargetLocation', [
                Validators.required
            ], this.formGroup.value['veleroTargetLocation']);
            this.resurrectField('clusterGroupName', [
                Validators.required
            ], this.formGroup.value['clusterGroupName']);
            this.fetchVeleroCredentials();
            this.fetchVeleroBackupLocations();
        } else {
            this.apiClient.wrkDataProtectionEnabled = false;
            dataProtectionFields.forEach((field) => {
                this.disarmField(field, true);
            });
        }
    }

    toggleEnableVelero() {
        const veleroFields = [
            'veleroUsername',
            'veleroPassword',
            'veleroBucket',
            'veleroRegion',
            'veleroS3Url',
            'veleroPublicUrl'
        ];
        if (!this.apiClient.tmcEnabled && this.formGroup.value['enableVelero']) {
            this.resurrectField('veleroUsername', [
                Validators.required
            ], this.formGroup.value['veleroUsername']);
            this.resurrectField('veleroPassword', [
                Validators.required
            ], this.formGroup.value['veleroPassword']);
            this.resurrectField('veleroBucket', [
                Validators.required
            ], this.formGroup.value['veleroBucket']);

            this.resurrectField('veleroRegion', [
                Validators.required
            ], this.formGroup.value['veleroRegion']);
            this.resurrectField('veleroS3Url', [
                Validators.required, this.validationService.isHttpOrHttps()
            ], this.formGroup.value['veleroS3Url']);
            this.resurrectField('veleroPublicUrl', [
                Validators.required, this.validationService.isHttpOrHttps()
            ], this.formGroup.value['veleroPublicUrl']);
        } else {
            this.apiClient.sharedDataProtectonEnabled = false;
            veleroFields.forEach((field) => {
                this.disarmField(field, true);
            });
        }
    }

    getDisabled(): boolean {
        return !(this.formGroup.get('veleroCredential').valid && this.formGroup.get('veleroTargetLocation').valid);
    }

    toggleWorkloadClusterSettings() {
        const mandatoryWorkloadFields = [
            'controlPlaneSetting',
            'devInstanceType',
            'prodInstanceType',
            'clusterName',
            'gatewayAddress',
            'workloadDhcpStartRange',
            'workloadDhcpEndRange',
            'clusterCidr',
            'serviceCidr',
            'baseImage',
            'baseImageVersion',
            'wrkCpu',
            'wrkMemory',
            'wrkStorage',
            'workerNodeCount',
            'clusterAdminUsers',
            'adminUsers',
            'editUsers',
            'viewUsers',
            'tsmSettings',
            'exactName',
            'startsWithName',
            'clusterGroupName',
            'enableDataProtection',
            'veleroCredential',
            'veleroTargetLocation',
            'enableVelero',
            'veleroUsername',
            'veleroPassword',
            'veleroBucket',
            'veleroRegion',
            'veleroS3Url',
            'veleroPublicUrl'
        ];

        if (this.formGroup.value['workloadClusterSettings']) {
            this.apiClient.workloadClusterSettings = true;
            this.resurrectField('controlPlaneSetting', [Validators.required], this.formGroup.value['controlPlaneSetting']);
            this.resurrectField('devInstanceType', [], this.formGroup.value['devInstanceType']);
            this.resurrectField('prodInstanceType', [], this.formGroup.value['prodInstanceType']);
            this.resurrectField('clusterName', [Validators.required, this.validationService.isValidClusterName(), this.validationService.noWhitespaceOnEnds()], this.formGroup.value['clusterName']);

            this.resurrectField('gatewayAddress', [Validators.required, this.validationService.isValidIpNetworkSegment(), this.validationService.noWhitespaceOnEnds()], this.formGroup.value['gatewayAddress']);
            this.resurrectField('workloadDhcpStartRange', [Validators.required, this.validationService.isValidIp(), this.validationService.noWhitespaceOnEnds()], this.formGroup.value['workloadDhcpStartRange']);
            this.resurrectField('workloadDhcpEndRange', [Validators.required, this.validationService.isValidIp(), this.validationService.noWhitespaceOnEnds()], this.formGroup.value['workloadDhcpEndRange']);

            this.resurrectField('clusterCidr', [Validators.required, this.validationService.noWhitespaceOnEnds(), this.validationService.isValidIpNetworkSegment()], this.formGroup.value['clusterCidr']);
            this.resurrectField('serviceCidr', [Validators.required, this.validationService.isValidIpNetworkSegment(), this.validationService.noWhitespaceOnEnds()], this.formGroup.value['serviceCidr']);
            this.resurrectField('baseImage', [Validators.required], this.formGroup.value['baseImage']);
            this.resurrectField('baseImageVersion', [Validators.required], this.formGroup.value['baseImageVersion']);
            this.resurrectField('wrkCpu', [Validators.min(2)], this.formGroup.value['wrkCpu']);
            this.resurrectField('wrkMemory', [Validators.min(4)], this.formGroup.value['wrkMemory']);
            this.resurrectField('wrkStorage', [Validators.min(20)], this.formGroup.value['wrkStorage']);
            this.resurrectField('workerNodeCount', [Validators.required], this.formGroup.value['workerNodeCount']);

            this.resurrectField('clusterAdminUsers', [this.validationService.noWhitespaceOnEnds()], this.formGroup.value['clusterAdminUsers']);
            this.resurrectField('adminUsers', [this.validationService.noWhitespaceOnEnds()], this.formGroup.value['adminUsers']);
            this.resurrectField('editUsers', [this.validationService.noWhitespaceOnEnds()], this.formGroup.value['editUsers']);
            this.resurrectField('viewUsers', [this.validationService.noWhitespaceOnEnds()], this.formGroup.value['viewUsers']);
        } else {
            this.apiClient.workloadClusterSettings = false;
            mandatoryWorkloadFields.forEach((field) => {
                this.disarmField(field, true);
            });
        }
    }

    toggleEnableL7() {
        const aviL7Fields = [];
        if(this.formGroup.value['enableL7']) {

        } else {
            aviL7Fields.forEach((field) => {
                this.disarmField(field, true);
            });
        }
    }

}
