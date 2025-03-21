# Copyright 2021 VMware, Inc.
# SPDX-License-Identifier: BSD-2-Clause

import logging

from flask import Blueprint, current_app, jsonify, request
from jinja2 import Template

from common.common_utilities import (
    createResourceFolderAndWait,
    deployAndConfigureAvi,
    downloadAviController,
    envCheck,
    form_avi_ha_cluster,
    get_avi_version,
    isAviHaEnabled,
    manage_avi_certificates,
    ping_check_gateways,
    preChecks,
)
from common.lib.govc_client import GovcClient
from common.operation.constants import CertName, ControllerLocation, Paths, ResourcePoolAndFolderName, SegmentsName
from common.util.file_helper import FileHelper
from common.util.local_cmd_helper import LocalCmdHelper

logger = logging.getLogger(__name__)
avi_config = Blueprint("avi_config", __name__, static_folder="aviConfig")


@avi_config.route("/api/tanzu/vmc/alb", methods=["POST"])
def configure_alb():
    avi_dep = deploy_alb()
    if avi_dep[1] != 200:
        current_app.logger.error(str(avi_dep[0].json["msg"]))
        d = {"responseType": "ERROR", "msg": "Failed to deploy avi " + str(avi_dep[0].json["msg"]), "STATUS_CODE": 500}
        return jsonify(d), 500
    avi_cert = manage_alb_certs()
    if avi_cert[1] != 200:
        current_app.logger.error(str(avi_cert[0].json["msg"]))
        d = {
            "responseType": "ERROR",
            "msg": "Failed to manage avi cert " + str(avi_cert[0].json["msg"]),
            "STATUS_CODE": 500,
        }
        return jsonify(d), 500
    d = {"responseType": "SUCCESS", "msg": "Avi configured Successfully", "STATUS_CODE": 200}
    current_app.logger.info("AVI configured Successfully")
    return jsonify(d), 200


@avi_config.route("/api/tanzu/vmc/alb/config", methods=["POST"])
def deploy_alb():
    pre = preChecks()
    if pre[1] != 200:
        current_app.logger.error(pre[0].json["msg"])
        d = {"responseType": "ERROR", "msg": pre[0].json["msg"], "STATUS_CODE": 500}
        return jsonify(d), 500
    password = current_app.config["VC_PASSWORD"]
    vcenter_username = current_app.config["VC_USER"]
    vcenter_ip = current_app.config["VC_IP"]
    cluster_name = current_app.config["VC_CLUSTER"]
    data_center = current_app.config["VC_DATACENTER"]
    data_store = current_app.config["VC_DATASTORE"]
    parent_resourcepool = current_app.config["RESOURCE_POOL"]
    env = envCheck()
    if env[1] != 200:
        current_app.logger.error("Wrong env provided " + env[0])
        d = {"responseType": "ERROR", "msg": "Wrong env provided " + env[0], "STATUS_CODE": 500}
        return jsonify(d), 500
    env = env[0]

    current_app.logger.info("Performing ping checks for default gateways...")
    if not ping_check_gateways(env):
        d = {"responseType": "ERROR", "msg": "Ping test failed for default gateways", "STATUS_CODE": 500}
        return jsonify(d), 500
    else:
        current_app.logger.info("Ping check passed for gateways")

    refreshToken = request.get_json(force=True)["marketplaceSpec"]["refreshToken"]
    if refreshToken:
        download_status = downloadAviController(env)
        if download_status[1] != 200:
            current_app.logger.error(download_status[0])
            d = {"responseType": "ERROR", "msg": download_status[0].json["msg"], "STATUS_CODE": 500}
            return jsonify(d), 500
    else:
        current_app.logger.info(
            "MarketPlace refresh token is not provided, skipping the download of AVI Controller OVA"
        )
    create = createResourceFolderAndWait(
        vcenter_ip,
        vcenter_username,
        password,
        cluster_name,
        data_center,
        ResourcePoolAndFolderName.AVI_RP,
        ResourcePoolAndFolderName.AVI_Components_FOLDER,
        parent_resourcepool,
    )
    data_center = data_center.replace(" ", "#remove_me#")
    data_store = data_store.replace(" ", "#remove_me#")
    if parent_resourcepool:
        rp_pool = (
            data_center
            + "/host/"
            + cluster_name
            + "/Resources/"
            + parent_resourcepool
            + "/"
            + ResourcePoolAndFolderName.AVI_RP
        )
    else:
        rp_pool = data_center + "/host/" + cluster_name + "/Resources/" + ResourcePoolAndFolderName.AVI_RP
    if create[1] != 200:
        current_app.logger.error("Failed to create resource pool and folder " + create[0].json["msg"])
        d = {
            "responseType": "ERROR",
            "msg": "Failed to create resource pool " + str(create[0].json["msg"]),
            "STATUS_CODE": 500,
        }
        return jsonify(d), 500
    rp_pool = rp_pool.replace(" ", "#remove_me#")
    govc_client = GovcClient(current_app.config, LocalCmdHelper())
    if not govc_client.check_network_exists(network_name=SegmentsName.DISPLAY_NAME_AVI_MANAGEMENT):
        current_app.logger.error("Failed to find the network " + SegmentsName.DISPLAY_NAME_AVI_MANAGEMENT)
        d = {
            "responseType": "ERROR",
            "msg": "Failed to find the network " + SegmentsName.DISPLAY_NAME_AVI_MANAGEMENT,
            "STATUS_CODE": 500,
        }
        return jsonify(d), 500
    control_plan = request.get_json(force=True)["componentSpec"]["tkgMgmtSpec"]["tkgMgmtDeploymentType"]
    if str(control_plan) == "prod":
        control_plan = "dev"
    if str(control_plan).lower() == "dev":
        deploy_options = template_alb_deployment_spec()
        controller_location = (
            "/" + current_app.config["VC_CONTENT_LIBRARY_NAME"] + "/" + current_app.config["VC_AVI_OVA_NAME"]
        )
        controller_location = controller_location.replace(" ", "#remove_me#")
        options = f"-options {deploy_options} -dc={data_center} -ds={data_store} \
            -folder={ResourcePoolAndFolderName.AVI_Components_FOLDER} -pool=/{rp_pool}"
    else:
        current_app.logger.error("Currently only dev plan is supported for NSX ALB controller")
        d = {
            "responseType": "ERROR",
            "msg": "Currently only dev plan is supported for NSX ALB controller",
            "STATUS_CODE": 500,
        }
        return jsonify(d), 500
    env = envCheck()
    if env[1] != 200:
        current_app.logger.error("Wrong env provided " + env[0])
        d = {"responseType": "ERROR", "msg": "Wrong env provided " + env[0], "STATUS_CODE": 500}
        return jsonify(d), 500
    env = env[0]
    avi_version = get_avi_version(env)
    dep = deployAndConfigureAvi(
        govc_client=govc_client,
        vm_name=ControllerLocation.CONTROLLER_NAME,
        controller_ova_location=controller_location,
        deploy_options=options,
        performOtherTask=True,
        env=env,
        avi_version=avi_version,
    )
    if dep[1] != 200:
        current_app.logger.error("Failed to deploy and configure AVI ")
        d = {
            "responseType": "ERROR",
            "msg": "Failed to deploy and configure AVI  " + str(dep[0].json["msg"]),
            "STATUS_CODE": 500,
        }
        return jsonify(d), 500
    if isAviHaEnabled(env):
        dep = deployAndConfigureAvi(
            govc_client=govc_client,
            vm_name=ControllerLocation.CONTROLLER_NAME2,
            controller_ova_location=controller_location,
            deploy_options=options,
            performOtherTask=False,
            env=env,
            avi_version=avi_version,
        )
        if dep[1] != 200:
            current_app.logger.error("Failed to deploy and configure 2nd AVI " + str(dep[0].json["msg"]))
            d = {
                "responseType": "ERROR",
                "msg": "Failed to deploy and configure 2nd AVI  " + str(dep[0].json["msg"]),
                "STATUS_CODE": 500,
            }
            return jsonify(d), 500
        dep = deployAndConfigureAvi(
            govc_client=govc_client,
            vm_name=ControllerLocation.CONTROLLER_NAME3,
            controller_ova_location=controller_location,
            deploy_options=options,
            performOtherTask=False,
            env=env,
            avi_version=avi_version,
        )
        if dep[1] != 200:
            current_app.logger.error("Failed to deploy and configure 3rd AVI " + str(dep[0].json["msg"]))
            d = {
                "responseType": "ERROR",
                "msg": "Failed to deploy and configure 3rd AVI  " + str(dep[0].json["msg"]),
                "STATUS_CODE": 500,
            }
            return jsonify(d), 500
        ip = govc_client.get_vm_ip(ControllerLocation.CONTROLLER_NAME, datacenter_name=data_center)[0]
        if ip is None:
            current_app.logger.error("Failed to get IP of AVI controller")
            d = {"responseType": "ERROR", "msg": "Failed to get IP of AVI controller", "STATUS_CODE": 500}
            return jsonify(d), 500
        res, status = form_avi_ha_cluster(ip, env, govc_client, avi_version)
        if res is None:
            current_app.logger.error("Failed to form AVI ha cluster " + str(status))
            d = {"responseType": "ERROR", "msg": "Failed to form AVI ha cluster " + str(status), "STATUS_CODE": 500}
            return jsonify(d), 500
    d = {"responseType": "SUCCESS", "msg": "Successfully deployed and configured AVI", "STATUS_CODE": 200}
    return jsonify(d), 200


@avi_config.route("/api/tanzu/vmc/alb/certcreation", methods=["POST"])
def manage_alb_certs():
    pre = preChecks()
    if pre[1] != 200:
        current_app.logger.error(pre[0].json["msg"])
        d = {"responseType": "ERROR", "msg": pre[0].json["msg"], "STATUS_CODE": 500}
        return jsonify(d), 500
    data_center = current_app.config["VC_DATACENTER"]
    govc_client = GovcClient(current_app.config, LocalCmdHelper())
    ip = govc_client.get_vm_ip(ControllerLocation.CONTROLLER_NAME, datacenter_name=data_center)
    if ip is None:
        current_app.logger.error("Failed to get IP of AVI controller")
        d = {"responseType": "ERROR", "msg": "Failed to get IP of AVI controller", "STATUS_CODE": 500}
        return jsonify(d), 500
    env = envCheck()
    if env[1] != 200:
        current_app.logger.error("Wrong env provided " + env[0])
        d = {"responseType": "ERROR", "msg": "Wrong env provided " + env[0], "STATUS_CODE": 500}
        return jsonify(d), 500
    env = env[0]
    avi_version = get_avi_version(env)
    cert = manage_avi_certificates(ip[0], avi_version, env, None, CertName.NAME)
    if cert[1] != 200:
        current_app.logger.error("Failed to manage-certificate for AVI " + cert[0].json["msg"])
        d = {
            "responseType": "ERROR",
            "msg": "Failed to manage-certificate for AVI " + cert[0].json["msg"],
            "STATUS_CODE": 500,
        }
        return jsonify(d), 500
    is_gen = cert[2]
    if is_gen:
        current_app.logger.info("Generated and replaced the certificate successfully")
        d = {
            "responseType": "SUCCESS",
            "msg": "Generated and replaced the certificate successfully",
            "STATUS_CODE": 200,
        }
        return jsonify(d), 200
    else:
        current_app.logger.info("Certificate is already generated")
        d = {"responseType": "SUCCESS", "msg": "Certificate is already generated", "STATUS_CODE": 200}
        return jsonify(d), 200


def template_alb_deployment_spec():
    deploy_options = Template(FileHelper.read_resource(Paths.VMC_ALB_DEPLOY_J2))
    FileHelper.write_to_file(
        deploy_options.render(
            network=SegmentsName.DISPLAY_NAME_AVI_MANAGEMENT, vm_name=ControllerLocation.CONTROLLER_NAME
        ),
        Paths.VMC_ALB_DEPLOY_JSON,
    )
    return Paths.VMC_ALB_DEPLOY_JSON
