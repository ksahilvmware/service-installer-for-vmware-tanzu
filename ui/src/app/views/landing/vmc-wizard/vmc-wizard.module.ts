/*
 * Copyright 2021 VMware, Inc
 * SPDX-License-Identifier: BSD-2-Clause
 */
import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import { SharedModule } from '../../../shared/shared.module';
import { LandingModule } from '../landing.module';
import { VMCWizardRoutingModule } from './vmc-wizard-routing.module';

import { ValidationService } from '../wizard/shared/validation/validation.service';
import { WizardSharedModule } from '../wizard/shared/wizard-shared.module';
import { AVINetworkSettingComponent } from './avi-setting-step/avi-setting-step.component';
import { DumyComponent } from './dumy/dumy.component';
import { ExtensionSettingComponent } from './extension-step/extension-step.component';
import { NodeSettingStepComponent } from './node-setting-step/node-setting-step.component';
import { VMCProviderStepComponent } from './provider-step/vmc-provider-step.component';
import { SharedNodeSettingComponent } from './shared-node-setting/shared-node-setting.component';
import { TanzuSaasStepComponent } from './tanzu-saas-step/tanzu-saas-setting-step.component';
import { TKGMgmtNetworkSettingComponent } from './tkg-mgmt-data-network/tkg-mgmt-data.component';
import { TKGWorkloadNetworkSettingComponent } from './tkg-workload-data-network/tkg-workload-data.component';
import { VMCWizardComponent } from './vmc-wizard.component';
import { WorkloadNodeSettingComponent } from './workload-node-setting/workload-node-setting.component';
@NgModule({
    declarations: [
        VMCWizardComponent,
        VMCProviderStepComponent,
        NodeSettingStepComponent,
        WorkloadNodeSettingComponent,
        SharedNodeSettingComponent,
        AVINetworkSettingComponent,
        ExtensionSettingComponent,
        TKGMgmtNetworkSettingComponent,
        TKGWorkloadNetworkSettingComponent,
        TanzuSaasStepComponent,
        DumyComponent,
    ],
    imports: [
        CommonModule,
        VMCWizardRoutingModule,
        SharedModule,
        LandingModule,
        WizardSharedModule,
    ],
    exports: [
    ],
    providers: [
        ValidationService,
    ],
})
export class VMCWizardModule { }
