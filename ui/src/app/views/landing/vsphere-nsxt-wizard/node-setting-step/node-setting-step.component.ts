/*
 * Copyright 2021 VMware, Inc
 * SPDX-License-Identifier: BSD-2-Clause
 */
import { TkgEventType } from 'src/app/shared/service/Messenger';
/**
 * Angular Modules
 */
import { Component, OnInit, Input } from '@angular/core';
import {
    Validators,
    FormControl
} from '@angular/forms';
import { distinctUntilChanged, takeUntil } from 'rxjs/operators';

/**
 * App imports
 */
import { PROVIDERS, Providers } from '../../../../shared/constants/app.constants';
import { NodeType, vSphereNodeTypes } from 'src/app/views/landing/wizard/shared/constants/wizard.constants';
import { StepFormDirective } from '../../wizard/shared/step-form/step-form';
import { ValidationService } from '../../wizard/shared/validation/validation.service';
import Broker from 'src/app/shared/service/broker';
import { AppEdition } from 'src/app/shared/constants/branding.constants';
import { APIClient} from 'src/app/swagger/api-client.service';
import { Subscription } from 'rxjs';
import { VsphereNsxtDataService } from '../../../../shared/service/vsphere-nsxt-data.service';

@Component({
    selector: 'app-node-setting-step',
    templateUrl: './node-setting-step.component.html',
    styleUrls: ['./node-setting-step.component.scss']
})
export class NodeSettingStepComponent extends StepFormDirective implements OnInit {
    @Input() providerType: string;
    @Input() errorNotification: string;

    nodeTypes: Array<NodeType> = [];
    PROVIDERS: Providers = PROVIDERS;
    vSphereNodeTypes: Array<NodeType> = vSphereNodeTypes;
    nodeType: string;
    additionalNoProxyInfo: string;
    fullNoProxy: string;
    enableNetworkName = true;
    networks = [];

    subscription: Subscription;
    segmentErrorMsg = 'Provided Management segment name is not found, please select again from the drop-down';
    private uploadStatus = false;
    private isSameAsHttp;
    private httpProxyUrl;
    private httpProxyUsername;
    private httpProxyPassword;
    private httpsProxyUrl;
    private httpsProxyUsername;
    private httpsProxyPassword;
    private noProxy;
    private proxyCert;
    private enableProxy;
    private controlPlaneSetting;
    private devInstanceType;
    private prodInstanceType;
    private mgmtCluster;
    private mgmtSegment;
    private mgmtGateway;
    private mgmtClusterCidr;
    private mgmtServiceCidr;
    private mgmtBaseImage;
    // Storage Setting Fields
    private mgmtCpu;
    private mgmtMemory;
    private mgmtStorage;
    //Compliant fields
    private compliantDeployment;
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
    constructor(private validationService: ValidationService,
                public apiClient: APIClient,
                private  dataService: VsphereNsxtDataService) {

        super();
        this.nodeTypes = [...vSphereNodeTypes];
    }

    ngOnInit() {
        super.ngOnInit();
        this.formGroup.addControl(
            'controlPlaneSetting',
            new FormControl('', [
                Validators.required
            ])
        );
        this.formGroup.addControl(
            'devInstanceType',
            new FormControl('', [
                Validators.required
            ])
        );
        this.formGroup.addControl(
            'prodInstanceType',
            new FormControl('', [
                Validators.required
            ])
        );
        this.formGroup.addControl(
            'clusterName',
            new FormControl('', [
                this.validationService.isValidClusterName(),
                this.validationService.noWhitespaceOnEnds()
            ])
        );
        this.formGroup.addControl(
            'segmentName',
            new FormControl('', [Validators.required]));
        this.formGroup.addControl(
            'gatewayAddress',
            new FormControl('', [
                Validators.required,
                this.validationService.isValidIpNetworkSegment(),
                this.validationService.noWhitespaceOnEnds()
            ])
        );
        this.formGroup.addControl('clusterCidr',
            new FormControl('100.96.0.0/11', [Validators.required,
                this.validationService.isValidIpNetworkSegment(),
                this.validationService.noWhitespaceOnEnds()]));
        this.formGroup.addControl('serviceCidr',
            new FormControl('100.64.0.0/13', [Validators.required,
                this.validationService.isValidIpNetworkSegment(),
                this.validationService.noWhitespaceOnEnds()]));
        this.formGroup.addControl('baseImage', new FormControl('', [Validators.required]));
        // Custom Storage Settings
        this.formGroup.addControl('mgmtCpu',
            new FormControl('', [Validators.min(2)]));
        this.formGroup.addControl('mgmtMemory',
            new FormControl('', [Validators.min(4)]));
        this.formGroup.addControl('mgmtStorage',
            new FormControl('', [Validators.min(20)]));
        this.formGroup.addControl('clusterGroupName',
            new FormControl('', []));
            this.networks = this.apiClient.networks;
        const fieldsMapping = [
                    ['httpProxyUrl', ''],
                    ['httpProxyUsername', ''],
                    ['httpProxyPassword', ''],
                    ['httpsProxyUrl', ''],
                    ['httpsProxyUsername', ''],
                    ['httpsProxyPassword', ''],
                    ['noProxy', ''],
                    ['proxyCert', ''],
                ];
        fieldsMapping.forEach((field) => {
            this.formGroup.addControl(field[0], new FormControl(field[1], []));
        });
        this.formGroup.addControl('proxySettings', new FormControl(false));
        this.formGroup.addControl('isSameAsHttp', new FormControl(true));

        this.formGroup.addControl('clusterAdminUsers',
            new FormControl('',
                [this.validationService.noWhitespaceOnEnds()]
        ));
        this.formGroup.addControl('adminUsers',
            new FormControl('',
                [this.validationService.noWhitespaceOnEnds()]
        ));
        this.formGroup.addControl('editUsers',
            new FormControl('',
                [this.validationService.noWhitespaceOnEnds()]
        ));
        this.formGroup.addControl('viewUsers',
            new FormControl('',
                [this.validationService.noWhitespaceOnEnds()]
        ));
        this.formGroup.addControl('compliantDeployment', new FormControl(false));
        this.formGroup['canMoveToNext'] = () => {
            return (this.formGroup.valid && this.apiClient.TkgMgmtNwValidated &&
                    !this.rbacErrorClusterAdmin && !this.rbacErrorAdmin &&
                    !this.rbacErrorEdit && !this.rbacErrorView);
        };
        setTimeout(_ => {
            this.formGroup.get('compliantDeployment').valueChanges.subscribe(() => this.toggleCompliantDeployment());
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
            if (this.edition !== AppEdition.TKG) {
                this.resurrectField('clusterName',
                    [Validators.required, this.validationService.isValidClusterName(),
                    this.validationService.noWhitespaceOnEnds()],
                    this.formGroup.get('clusterName').value);
                this.resurrectField('segmentName',
                    [Validators.required],
                    this.formGroup.get('segmentName').value);
                }
            this.resurrectField('gatewayAddress',
                [Validators.required, this.validationService.isValidIpNetworkSegment(),
                this.validationService.noWhitespaceOnEnds()],
                this.formGroup.get('gatewayAddress').value);
            this.resurrectField('clusterCidr',
                [Validators.required, this.validationService.isValidIpNetworkSegment(),
                this.validationService.noWhitespaceOnEnds()],
                this.formGroup.get('clusterCidr').value);
            this.resurrectField('serviceCidr',
                [Validators.required, this.validationService.isValidIpNetworkSegment(),
                this.validationService.noWhitespaceOnEnds()],
                this.formGroup.get('serviceCidr').value);
            this.formGroup.get('segmentName').valueChanges.subscribe(
                () => {
                    this.apiClient.mgmtSegmentError = false;
                    let segmentName = this.formGroup.get('segmentName').value;
                    this.dataService.changeMgmtSegment(segmentName);
            });
            this.formGroup.get('gatewayAddress').valueChanges.subscribe(
                () => {
                    let gateway = this.formGroup.get('gatewayAddress').value;
                    this.dataService.changeMgmtGateway(gateway);
            });

            this.subscription = this.dataService.currentInputFileStatus.subscribe(
                (uploadStatus) => this.uploadStatus = uploadStatus);
            if (!this.uploadStatus) {
                this.subscription = this.dataService.currentArcasEnableProxy.subscribe(
                    (arcasEnableProxy) => this.enableProxy = arcasEnableProxy);
                this.formGroup.get('proxySettings').setValue(this.enableProxy);
                this.subscription = this.dataService.currentArcasHttpProxyUrl.subscribe(
                    (httpProxyUrl) => this.httpProxyUrl = httpProxyUrl);
                this.formGroup.get('httpProxyUrl').setValue(this.httpProxyUrl);
                this.subscription = this.dataService.currentArcasHttpProxyUsername.subscribe(
                    (httpProxyUsername) => this.httpProxyUsername = httpProxyUsername);
                this.formGroup.get('httpProxyUsername').setValue(this.httpProxyUsername);
                this.subscription = this.dataService.currentArcasHttpProxyPassword.subscribe(
                    (httpProxyPassword) => this.httpProxyPassword = httpProxyPassword);
                this.formGroup.get('httpProxyPassword').setValue(this.httpProxyPassword);

                this.subscription = this.dataService.currentArcasIsSameAsHttp.subscribe(
                    (isSameAsHttp) => this.isSameAsHttp = isSameAsHttp);
                this.formGroup.get('isSameAsHttp').setValue(this.isSameAsHttp);
                this.subscription = this.dataService.currentArcasNoProxy.subscribe(
                    (noProxy) => this.noProxy = noProxy);
                this.formGroup.get('noProxy').setValue(this.noProxy);
                this.subscription = this.dataService.currentArcasProxyCertificate.subscribe(
                    (proxyCert) => this.proxyCert = proxyCert);
                this.formGroup.get('proxyCert').setValue(this.proxyCert);
                this.subscription = this.dataService.currentArcasHttpsProxyUrl.subscribe(
                    (httpsProxyUrl) => this.httpsProxyUrl = httpsProxyUrl);
                this.formGroup.get('httpsProxyUrl').setValue(this.httpsProxyUrl);
                this.subscription = this.dataService.currentArcasHttpsProxyUsername.subscribe(
                    (httpsProxyUsername) => this.httpsProxyUsername = httpsProxyUsername);
                this.formGroup.get('httpsProxyUsername').setValue(this.httpsProxyUsername);
                this.subscription = this.dataService.currentArcasHttpsProxyPassword.subscribe(
                    (httpsProxyPassword) => this.httpsProxyPassword = httpsProxyPassword);
                this.formGroup.get('httpsProxyPassword').setValue(this.httpsProxyPassword);
            }
            if (this.uploadStatus) {
                this.subscription = this.dataService.currentMgmtDeploymentType.subscribe(
                    (controlPlaneSetting) => this.controlPlaneSetting = controlPlaneSetting);
                this.formGroup.get('controlPlaneSetting').setValue(this.controlPlaneSetting);
                if (this.controlPlaneSetting === 'dev') {
                    this.subscription = this.dataService.currentMgmtDeploymentSize.subscribe(
                        (devInstanceType) => this.devInstanceType = devInstanceType);
                    this.formGroup.get('devInstanceType').setValue(this.devInstanceType);
                } else if (this.controlPlaneSetting === 'prod') {
                    this.subscription = this.dataService.currentMgmtDeploymentSize.subscribe(
                        (prodInstanceType) => this.prodInstanceType = prodInstanceType);
                    this.formGroup.get('prodInstanceType').setValue(this.prodInstanceType);
                }
                if (this.devInstanceType === 'custom' || this.prodInstanceType === 'custom'){
                    this.subscription = this.dataService.currentMgmtCpu.subscribe(
                        (cpu) => this.mgmtCpu = cpu);
                    this.formGroup.get('mgmtCpu').setValue(this.mgmtCpu);

                    this.subscription = this.dataService.currentMgmtStorage.subscribe(
                        (storage) => this.mgmtStorage = storage);
                    this.formGroup.get('mgmtStorage').setValue(this.mgmtStorage);

                    this.subscription = this.dataService.currentMgmtMemory.subscribe(
                        (memory) => this.mgmtMemory = memory);
                    this.formGroup.get('mgmtMemory').setValue(this.mgmtMemory);
                }
                this.subscription = this.dataService.currentMgmtClusterName.subscribe(
                    (mgmtCluster) => this.mgmtCluster = mgmtCluster);
                this.formGroup.get('clusterName').setValue(this.mgmtCluster);
                this.subscription = this.dataService.currentMgmtSegment.subscribe(
                    (mgmtSegment) => this.mgmtSegment = mgmtSegment);
                if (this.apiClient.networks.indexOf(this.mgmtSegment) === -1) {
                    this.apiClient.mgmtSegmentError = true;
                } else {
                    this.formGroup.get('segmentName').setValue(this.mgmtSegment);
                    this.apiClient.mgmtSegmentError = false;
                }
                this.subscription = this.dataService.currentMgmtBaseImage.subscribe(
                    (mgmtBaseImage) => this.mgmtBaseImage = mgmtBaseImage);
                if (this.apiClient.baseImage.indexOf(this.mgmtBaseImage) !== -1) {
                    this.formGroup.get('baseImage').setValue(this.mgmtBaseImage);
                }
                this.subscription = this.dataService.currentMgmtGateway.subscribe(
                    (mgmtGateway) => this.mgmtGateway = mgmtGateway);
                this.formGroup.get('gatewayAddress').setValue(this.mgmtGateway);
                this.subscription = this.dataService.currentMgmtClusterCidr.subscribe(
                    (mgmtClusterCidr) => this.mgmtClusterCidr = mgmtClusterCidr);
                this.formGroup.get('clusterCidr').setValue(this.mgmtClusterCidr);
                this.subscription = this.dataService.currentMgmtServiceCidr.subscribe(
                    (mgmtServiceCidr) => this.mgmtServiceCidr = mgmtServiceCidr);
                this.formGroup.get('serviceCidr').setValue(this.mgmtServiceCidr);

                this.subscription = this.dataService.currentMgmtEnableProxy.subscribe(
                    (mgmtEnableProxy) => this.enableProxy = mgmtEnableProxy);
                this.formGroup.get('proxySettings').setValue(this.enableProxy);
                if (this.enableProxy) {
                    this.toggleProxySetting();
                }
                this.subscription = this.dataService.currentMgmtHttpProxyUrl.subscribe(
                    (httpProxyUrl) => this.httpProxyUrl = httpProxyUrl);
                this.formGroup.get('httpProxyUrl').setValue(this.httpProxyUrl);
                this.subscription = this.dataService.currentMgmtHttpProxyUsername.subscribe(
                    (httpProxyUsername) => this.httpProxyUsername = httpProxyUsername);
                this.formGroup.get('httpProxyUsername').setValue(this.httpProxyUsername);
                this.subscription = this.dataService.currentMgmtHttpProxyPassword.subscribe(
                    (httpProxyPassword) => this.httpProxyPassword = httpProxyPassword);
                this.formGroup.get('httpProxyPassword').setValue(this.httpProxyPassword);

                this.subscription = this.dataService.currentMgmtIsSameAsHttp.subscribe(
                    (isSameAsHttp) => this.isSameAsHttp = isSameAsHttp);
                this.formGroup.get('isSameAsHttp').setValue(this.isSameAsHttp);
                this.subscription = this.dataService.currentMgmtNoProxy.subscribe(
                    (noProxy) => this.noProxy = noProxy);
                this.formGroup.get('noProxy').setValue(this.noProxy);
                this.subscription = this.dataService.currentMgmtProxyCert.subscribe(
                    (proxyCert) => this.proxyCert = proxyCert);
                this.formGroup.get('proxyCert').setValue(this.proxyCert);
                this.subscription = this.dataService.currentMgmtHttpsProxyUrl.subscribe(
                    (httpsProxyUrl) => this.httpsProxyUrl = httpsProxyUrl);
                this.formGroup.get('httpsProxyUrl').setValue(this.httpsProxyUrl);
                this.subscription = this.dataService.currentMgmtHttpsProxyUsername.subscribe(
                    (httpsProxyUsername) => this.httpsProxyUsername = httpsProxyUsername);
                this.formGroup.get('httpsProxyUsername').setValue(this.httpsProxyUsername);
                this.subscription = this.dataService.currentMgmtHttpsProxyPassword.subscribe(
                    (httpsProxyPassword) => this.httpsProxyPassword = httpsProxyPassword);
                this.formGroup.get('httpsProxyPassword').setValue(this.httpsProxyPassword);
                this.apiClient.TkgMgmtNwValidated = true;
                if (this.apiClient.enableIdentityManagement){
                    this.subscription = this.dataService.currentMgmtClusterAdminUsers.subscribe(
                        (clusterAdminUsers) => this.clusterAdminUsers = clusterAdminUsers);
                    this.formGroup.get('clusterAdminUsers').setValue(this.clusterAdminUsers);
                    this.subscription = this.dataService.currentMgmtAdminUsers.subscribe(
                        (adminUsers) => this.adminUsers = adminUsers);
                    this.formGroup.get('adminUsers').setValue(this.adminUsers);
                    this.subscription = this.dataService.currentMgmtEditUsers.subscribe(
                        (editUsers) => this.editUsers = editUsers);
                    this.formGroup.get('editUsers').setValue(this.editUsers);
                    this.subscription = this.dataService.currentMgmtViewUsers.subscribe(
                        (viewUsers) => this.viewUsers = viewUsers);
                    this.formGroup.get('viewUsers').setValue(this.viewUsers);
                }
                if(this.apiClient.compliantDeployment || this.apiClient.isAirgapped) {
                    this.subscription = this.dataService.currentCompliantDeployment.subscribe(
                        (isCompliant) => this.compliantDeployment = isCompliant);
                    this.formGroup.get('compliantDeployment').setValue(this.compliantDeployment);
                }
            }
            this.apiClient.TkgMgmtNwValidated = true;
        });
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
            if (!this.uploadStatus) {
                this.formGroup.get('proxySettings').setValue(this.enableProxy);
                this.formGroup.get('httpProxyUrl').setValue(this.httpProxyUrl);
                this.formGroup.get('httpProxyUsername').setValue(this.httpProxyUsername);
                this.formGroup.get('httpProxyPassword').setValue(this.httpProxyPassword);
                this.formGroup.get('isSameAsHttp').setValue(this.isSameAsHttp);
                this.formGroup.get('httpsProxyUrl').setValue(this.httpsProxyUrl);
                this.formGroup.get('httpsProxyUsername').setValue(this.httpsProxyUsername);
                this.formGroup.get('httpsProxyPassword').setValue(this.httpsProxyPassword);
                this.formGroup.get('noProxy').setValue(this.noProxy);
                this.formGroup.get('proxyCert').setValue(this.proxyCert);
                this.formGroup.get('segmentName').setValue('');
            } else {
                this.formGroup.get('httpProxyPassword').setValue('');
                this.formGroup.get('httpsProxyPassword').setValue('');
                this.formGroup.get('segmentName').setValue('');
            }
        }
    }

    cardClick(envType: string) {
        this.formGroup.controls['controlPlaneSetting'].setValue(envType);
    }

    getEnvType(): string {
        return this.formGroup.controls['controlPlaneSetting'].value;
    }

    listenToEvents() {
        const noProxyFieldChangeMap = ['noProxy'];
        noProxyFieldChangeMap.forEach((field) => {
            this.formGroup.get(field).valueChanges.pipe(
                distinctUntilChanged((prev, curr) => JSON.stringify(prev) === JSON.stringify(curr)),
                takeUntil(this.unsubscribe)
                ).subscribe(() => {
                    this.generateFullNoProxy();
                    });
                });

        Broker.messenger.getSubject(TkgEventType.AWS_GET_NO_PROXY_INFO)
            .pipe(takeUntil(this.unsubscribe))
            .subscribe(event => {
                this.additionalNoProxyInfo = event.payload.info;
                this.generateFullNoProxy();
                });
    }

    generateFullNoProxy() {
        const noProxy = this.formGroup.get('noProxy');
        if (noProxy && !noProxy.value) {
            this.fullNoProxy = '';
            return;
        }
        const noProxyList = [
            ...noProxy.value.split(','),
            this.additionalNoProxyInfo,
                'localhost',
                '127.0.0.1',
                '.svc',
                '.svc.cluster.local'
            ];
        this.fullNoProxy = noProxyList.filter(elem => elem).join(',');
    }

    toggleProxySetting() {
        const proxySettingFields = [
            'httpProxyUrl',
            'httpProxyUsername',
            'httpProxyPassword',
            'isSameAsHttp',
            'httpsProxyUrl',
            'httpsProxyUsername',
            'httpsProxyPassword',
            'noProxy',
            'proxyCert',
        ];
        if (this.formGroup.value['proxySettings']) {
            this.resurrectField('httpProxyUrl', [
                Validators.required,
                this.validationService.isHttpOrHttps(),
                this.validationService.noWhitespaceOnEnds()
            ], this.formGroup.value['httpProxyUrl']);
            this.resurrectField('httpProxyUsername', [
                this.validationService.noWhitespaceOnEnds()
            ], this.formGroup.value['httpProxyUsername']);
            this.resurrectField('noProxy', [
                this.validationService.noWhitespaceOnEnds()
            ], this.formGroup.value['noProxy']);
            this.resurrectField('proxyCert', [
            ], this.formGroup.value['proxyCert']);
            if (!this.formGroup.value['isSameAsHttp']) {
                this.resurrectField('httpsProxyUsername', [
                    this.validationService.noWhitespaceOnEnds()
                ], this.formGroup.value['httpsProxyUsername']);
                this.resurrectField('httpsProxyUrl', [
                    Validators.required,
                    this.validationService.isHttpOrHttps(),
                    this.validationService.noWhitespaceOnEnds()
                ], this.formGroup.value['httpsProxyUrl']);
        } else {
            const httpsFields = [
                'httpsProxyUrl',
                'httpsProxyUsername',
                'httpsProxyPassword',
            ];
            httpsFields.forEach((field) => {
                this.disarmField(field, true);
                });
            }
        } else {
            proxySettingFields.forEach((field) => {
                this.disarmField(field, true);
            });
        }
    }

    checkCustom() {
        const storageFields = [
            'mgmtCpu',
            'mgmtMemory',
            'mgmtStorage',
        ];
        if (this.formGroup.get('devInstanceType').valid ||
            this.formGroup.get('prodInstanceType').valid) {
            if (this.formGroup.get('devInstanceType').value === 'custom' ||
                this.formGroup.get('prodInstanceType').value === 'custom') {
                this.resurrectField('mgmtCpu', [
                    Validators.required,
                    Validators.min(2)],
                    this.formGroup.value['mgmtCpu']);
                this.resurrectField('mgmtMemory', [
                    Validators.required,
                    Validators.min(4)],
                    this.formGroup.value['mgmtMemory']);
                this.resurrectField('mgmtStorage', [
                    Validators.required,
                    Validators.min(20)],
                    this.formGroup.value['mgmtStorage']);
            } else {
                storageFields.forEach((field) => {
                    this.disarmField(field, true);
                });
            }
        }
    }


    onClusterAdminFieldChange() {
        if (this.formGroup.get('clusterAdminUsers').valid && this.formGroup.get('clusterAdminUsers').value !== "") {
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
        if (this.formGroup.get('adminUsers').valid && this.formGroup.get('adminUsers').value !== "") {
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
        if (this.formGroup.get('editUsers').valid && this.formGroup.get('editUsers').value !== "") {
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
        if (this.formGroup.get('viewUsers').valid && this.formGroup.get('viewUsers').value !== "") {
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


    toggleCompliantDeployment() {
        if(!this.apiClient.tmcEnabled) {
            if(this.formGroup.value['compliantDeployment']) {
                this.apiClient.compliantDeployment = true;
                this.apiClient.baseImage = ['ubuntu'];
                this.apiClient.baseImageVersion = ['v1.26.5'];
                this.formGroup.get('baseImage').setValue('ubuntu');
            }
            else {
                this.apiClient.baseImage = ['photon', 'ubuntu'];
                this.apiClient.baseImageVersion = ['v1.26.5', 'v1.25.10', 'v1.24.14'];
                this.apiClient.compliantDeployment = false;
            }
        } else {
            this.apiClient.baseImage = ['photon'];
            this.apiClient.compliantDeployment = false;
        }
    }
}
