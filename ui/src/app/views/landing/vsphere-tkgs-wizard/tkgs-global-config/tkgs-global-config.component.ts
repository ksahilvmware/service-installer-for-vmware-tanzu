/**
 * Angular Modules
 */
import { Component, Input, OnInit } from '@angular/core';
import {
    FormControl,
} from '@angular/forms';

/**
 * App imports
 */
import { StepFormDirective } from '../../wizard/shared/step-form/step-form';
import { ValidationService } from '../../wizard/shared/validation/validation.service';
import { APIClient } from 'src/app/swagger/api-client.service';
import { Subscription } from "rxjs";
import { VsphereTkgsService } from "../../../../shared/service/vsphere-tkgs-data.service";
@Component({
    selector: 'app-global-config-step',
    templateUrl: './tkgs-global-config.component.html',
    styleUrls: ['./tkgs-global-config.component.scss']
})
export class TKGSGlobalConfig extends StepFormDirective implements OnInit {
    @Input() errorNotification: any;

    subscription: Subscription;
    private uploadStatus = false;
    private defaultCNI;

    //Proxy fields


    constructor(private validationService: ValidationService,
                public apiClient: APIClient,
                private dataService: VsphereTkgsService) {

        super();
    }
    ngOnInit() {
        super.ngOnInit();
        this.formGroup.addControl(
            'defaultCNI',
            new FormControl('antrea', []));

        this.formGroup.addControl('tkgsCerts',
            new FormControl('',[]));
        this.formGroup.addControl('newCertType',
            new FormControl('', [])
        );
        this.formGroup.addControl('newCertValue',
            new FormControl('',
                [this.validationService.noWhitespaceOnEnds()])
        );

        setTimeout(_ => {

            this.subscription = this.dataService.currentInputFileStatus.subscribe(
                (uploadStatus) => this.uploadStatus = uploadStatus);
            if (this.uploadStatus) {
                this.subscription = this.dataService.currentDefaultCNI.subscribe(
                    (cni) => this.defaultCNI = cni);
                this.formGroup.get('defaultCNI').setValue(this.defaultCNI);
            }
        });
    }

    setSavedDataAfterLoad() {
        super.setSavedDataAfterLoad();
        // don't fill password field with ****
        if (!this.uploadStatus) {
        }
    }

    deleteCert(certValue: string) {
        this.apiClient.tkgsAdditionalCerts.delete(certValue);
        this.formGroup.get('tkgsCerts').setValue(this.apiClient.tkgsAdditionalCerts);
    }

    addCert(type: string, value: string) {
        if(!this.apiClient.tkgsAdditionalCerts.has(value)) {
            this.apiClient.tkgsAdditionalCerts.set(value, type);
            this.formGroup.get('tkgsCerts').setValue(this.apiClient.tkgsAdditionalCerts);
            this.formGroup.get('newCertType').setValue('');
            this.formGroup.get('newCertValue').setValue('');
        } else {
            this.errorNotification = "Additional certificate with the same name already exists!";
        }
    }

}
