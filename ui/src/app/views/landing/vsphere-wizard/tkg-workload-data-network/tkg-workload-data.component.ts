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

/**
 * App imports
 */
import { PROVIDERS, Providers } from '../../../../shared/constants/app.constants';
import { StepFormDirective } from '../../wizard/shared/step-form/step-form';
import { ValidationService } from '../../wizard/shared/validation/validation.service';
import { APIClient } from 'src/app/swagger/api-client.service';
import { Subscription } from 'rxjs';
import { DataService } from '../../../../shared/service/data.service';

@Component({
    selector: 'app-tkg-workload-nw-setting-step',
    templateUrl: './tkg-workload-data.component.html',
    styleUrls: ['./tkg-workload-data.component.scss']
})
export class TKGWorkloadNetworkSettingComponent extends StepFormDirective implements OnInit {
    @Input() providerType: string;
    @Input() errorNotification: string;
    PROVIDERS: Providers = PROVIDERS;
    displayForm = false;
    networks = [];
    subscription: Subscription;
    segmentErrorMsg = 'TKG Workload Data Segment not found, please update the segment value from the drop-down list';
    private uploadStatus = false;
    private segment: string;
    private gatewayCidr: string;
    private dhcpStart: string;
    private dhcpEnd: string;
    constructor(private validationService: ValidationService,
        public apiClient: APIClient,
        private dataService: DataService) {

        super();
    }

    ngOnInit() {
        super.ngOnInit();
        this.formGroup.addControl(
            'workloadClusterSettings',
            new FormControl(false)
        );
        this.formGroup.addControl(
            'TKGDataSegmentName',
            new FormControl('', [])
        );
        this.formGroup.addControl(
            'TKGDataGatewayCidr',
            new FormControl('', [])
        );
        this.formGroup.addControl(
            'TKGDataDhcpStartRange',
            new FormControl('', [])
        );
        this.formGroup.addControl(
            'TKGDataDhcpEndRange',
            new FormControl('', [])
        );
        this.formGroup['canMoveToNext'] = () => {
            this.findInvalidControls();
            if (!this.apiClient.workloadDataSettings) {
                this.apiClient.tkgWrkDataSegmentError = false;
                return this.formGroup.valid;
            }
            else {
                this.onTkgMgmtDataValidateClick();
                return (this.formGroup.valid && this.apiClient.TkgWrkDataNwValidated);
            }
        };
        setTimeout(_ => {
            this.displayForm = true;
            if(this.apiClient.workloadDataSettings) {
                this.resurrectField('TKGDataSegmentName',
                    [Validators.required],
                    this.formGroup.get('TKGDataSegmentName').value);
                this.resurrectField('TKGDataGatewayCidr',
                    [Validators.required, this.validationService.isValidIpNetworkSegment(),
                    this.validationService.noWhitespaceOnEnds()],
                    this.formGroup.get('TKGDataGatewayCidr').value);
                this.resurrectField('TKGDataDhcpStartRange',
                    [Validators.required, this.validationService.isValidIp(),
                    this.validationService.noWhitespaceOnEnds()],
                    this.formGroup.get('TKGDataDhcpStartRange').value);
                this.resurrectField('TKGDataDhcpEndRange',
                    [Validators.required, this.validationService.isValidIp(),
                    this.validationService.noWhitespaceOnEnds()],
                    this.formGroup.get('TKGDataDhcpEndRange').value);
                this.formGroup.get('TKGDataSegmentName').valueChanges.subscribe(
                    () => this.apiClient.tkgWrkDataSegmentError = false)
                this.formGroup.get('TKGDataGatewayCidr').valueChanges.subscribe(
                    () => this.apiClient.TkgWrkDataNwValidated = false);
                this.formGroup.get('TKGDataDhcpStartRange').valueChanges.subscribe(
                    () => this.apiClient.TkgWrkDataNwValidated = false);
                this.formGroup.get('TKGDataDhcpEndRange').valueChanges.subscribe(
                    () => this.apiClient.TkgWrkDataNwValidated = false);
                this.subscription = this.dataService.currentInputFileStatus.subscribe(
                    (uploadStatus) => this.uploadStatus = uploadStatus);
                if (this.uploadStatus) {
                    this.subscription = this.dataService.currentTkgWrkDataSegment.subscribe(
                        (segment) => this.segment = segment);
                    if (this.apiClient.networks.indexOf(this.segment) === -1) {
                        this.apiClient.tkgWrkDataSegmentError = true;
                    } else {
                        this.formGroup.get('TKGDataSegmentName').setValue(this.segment);
                        this.apiClient.tkgWrkDataSegmentError = false;
                    }
                    this.subscription = this.dataService.currentTkgWrkDataGateway.subscribe(
                        (gateway) => this.gatewayCidr = gateway);
                    this.formGroup.get('TKGDataGatewayCidr').setValue(this.gatewayCidr);
                    this.subscription = this.dataService.currentTkgWrkDataDhcpStart.subscribe(
                        (dhcpStart) => this.dhcpStart = dhcpStart);
                    this.formGroup.get('TKGDataDhcpStartRange').setValue(this.dhcpStart);
                    this.subscription = this.dataService.currentTkgWrkDataDhcpEnd.subscribe(
                        (dhcpEnd) => this.dhcpEnd = dhcpEnd);
                    this.formGroup.get('TKGDataDhcpEndRange').setValue(this.dhcpEnd);

                    if ((this.gatewayCidr !== '') && (this.dhcpStart !== '') && (this.dhcpEnd !== '') &&
                        (this.formGroup.get('TKGDataGatewayCidr').valid &&
                        this.formGroup.get('TKGDataDhcpStartRange').valid &&
                        this.formGroup.get('TKGDataDhcpEndRange').valid))
                    {
                        const block = new Netmask(this.gatewayCidr);
                        if (block.contains(this.dhcpStart) && block.contains(this.dhcpEnd)) {
                            this.apiClient.TkgWrkDataNwValidated = true;
                            this.errorNotification = null;
                        } else if (!block.contains(this.dhcpStart) && !block.contains(this.dhcpEnd)) {
                            this.errorNotification = 'DHCP Start and End IP are out of the provided subnet';
                            this.apiClient.TkgWrkDataNwValidated = false;
                        } else if (!block.contains(this.dhcpStart)) {
                            this.errorNotification = 'DHCP Start IP is out of the provided subnet.';
                            this.apiClient.TkgWrkDataNwValidated = false;
                        } else if (!block.contains(this.dhcpEnd)) {
                            this.errorNotification = 'DHCP End IP is out of the provided subnet';
                            this.apiClient.TkgWrkDataNwValidated = false;
                        }
                    }
                }
            }
        });
        this.networks = this.apiClient.networks;
    }

    setSavedDataAfterLoad() {
        if (this.hasSavedData()) {
            super.setSavedDataAfterLoad();
            if (!this.uploadStatus) {
                this.formGroup.get('TKGDataSegmentName').setValue('');
            }
        }
    }

    onTkgMgmtDataValidateClick() {
        if (this.apiClient.workloadDataSettings){
            if(this.formGroup.get('TKGDataGatewayCidr').valid &&
                this.formGroup.get('TKGDataDhcpStartRange').valid &&
                this.formGroup.get('TKGDataDhcpEndRange').valid &&
                this.formGroup.get('TKGDataGatewayCidr').value != null &&
                this.formGroup.get('TKGDataDhcpStartRange').value != null &&
                this.formGroup.get('TKGDataDhcpEndRange').value) {
                this.errorNotification = null;
                const gatewayIp = this.formGroup.get('TKGDataGatewayCidr').value;
                const dhcpStart = this.formGroup.get('TKGDataDhcpStartRange').value;
                const dhcpEnd = this.formGroup.get('TKGDataDhcpEndRange').value;
                const block = new Netmask(gatewayIp);
                if (block.contains(dhcpStart) && block.contains(dhcpEnd)) {
                    this.apiClient.TkgWrkDataNwValidated = true;
                    this.errorNotification = '';
                } else if (!block.contains(dhcpStart) && !block.contains(dhcpEnd)) {
                    this.errorNotification = 'DHCP Start and End IP are out of the provided subnet';
                    this.apiClient.TkgWrkDataNwValidated = false;
                } else if (!block.contains(dhcpStart)) {
                    this.errorNotification = 'DHCP Start IP is out of the provided subnet.';
                    this.apiClient.TkgWrkDataNwValidated = false;
                } else if (!block.contains(dhcpEnd)) {
                    this.errorNotification = 'DHCP End IP is out of the provided subnet';
                    this.apiClient.TkgWrkDataNwValidated = false;
                }
            }
        }
    }

    toggleWorkloadClusterSettings() {
        const mandatoryWorkloadFields = [
            'TKGDataSegmentName',
            'TKGDataGatewayCidr',
            'TKGDataDhcpStartRange',
            'TKGDataDhcpEndRange',
        ];

        if (this.formGroup.value['workloadClusterSettings']) {
            this.apiClient.workloadDataSettings = true;
            this.resurrectField('TKGDataSegmentName', [Validators.required], this.formGroup.value['TKGDataSegmentName']);
            this.resurrectField('TKGDataGatewayCidr', [Validators.required, this.validationService.isValidIpNetworkSegment(), this.validationService.noWhitespaceOnEnds()], this.formGroup.value['TKGDataGatewayCidr']);
            this.resurrectField('TKGDataDhcpStartRange', [Validators.required, this.validationService.noWhitespaceOnEnds(), this.validationService.isValidIp()], this.formGroup.value['TKGDataDhcpStartRange']);
            this.resurrectField('TKGDataDhcpEndRange', [Validators.required, this.validationService.isValidIp(), this.validationService.noWhitespaceOnEnds()], this.formGroup.value['TKGDataDhcpEndRange']);
        } else {
            this.apiClient.workloadDataSettings = false;
            this.apiClient.tkgWrkDataSegmentError = false;
            mandatoryWorkloadFields.forEach((field) => {
                this.disarmField(field, true);
            });
        }
    }

    public findInvalidControls() {
        const controls = this.formGroup.controls;
        for (const name in controls) {
            if (controls[name].invalid) {
                console.log(name);
                console.log(controls[name].errors);
            }
        }
    }

}
