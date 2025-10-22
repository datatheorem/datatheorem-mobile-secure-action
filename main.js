"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const core = require("@actions/core");
const fetch = require("node-fetch");
const glob = require("glob");
const FormData = require("form-data");
const fs = require("fs");
// Global constants
const maxUploadFiles = 3; // no more than 3 files can be uploaded at a time
const maxRetries = 3; // max number of uploads to retry
function upload_step_init(dt_upload_api_key) {
    return __awaiter(this, void 0, void 0, function* () {
        return yield fetch("https://api.securetheorem.com/uploadapi/v1/upload_init", {
            headers: {
                Accept: "application/json",
                Authorization: "APIKey " + dt_upload_api_key,
                "Content-Type": "application/json",
            },
            method: "POST",
        });
    });
}
function check_scan_status(dt_results_api_key, mobile_app_id, scan_id) {
    return __awaiter(this, void 0, void 0, function* () {
        return yield fetch(`https://api.securetheorem.com/apis/mobile_security/results/v2/mobile_apps/${mobile_app_id}/scans/${scan_id}`, {
            headers: {
                Accept: "application/json",
                Authorization: "APIKey " + dt_results_api_key,
            },
            method: "GET",
        });
    });
}
function get_security_findings(dt_results_api_key, mobile_app_id, results_since, severity) {
    return __awaiter(this, void 0, void 0, function* () {
        const baseUrl = "https://api.securetheorem.com/apis/mobile_security/results/v2/security_findings";
        const params = new URLSearchParams({
            mobile_app_id,
            results_since,
            status_group: "OPEN",
        });
        if (severity) {
            params.append("severity", severity);
        }
        const url = `${baseUrl}?${params.toString()}`;
        return yield fetch(url, {
            headers: {
                Accept: "application/json",
                Authorization: "APIKey " + dt_results_api_key,
            },
            method: "GET",
        });
    });
}
function check_severity_findings(dt_results_api_key, mobile_app_id, results_since, severity_level) {
    return __awaiter(this, void 0, void 0, function* () {
        const severity_checks = {
            HIGH: ["HIGH"],
            MEDIUM: ["HIGH", "MEDIUM"],
            LOW: ["HIGH", "MEDIUM", "LOW"],
        };
        const severities_to_check = severity_checks[severity_level.toUpperCase()];
        if (!severities_to_check) {
            throw new Error(`Invalid severity level: ${severity_level}`);
        }
        let total_findings = 0;
        for (const severity of severities_to_check) {
            const findings_response = yield get_security_findings(dt_results_api_key, mobile_app_id, results_since, severity);
            if (findings_response.status !== 200) {
                throw new Error(`Error fetching security findings for ${severity} severity: HTTP ${findings_response.status}`);
            }
            const findings_data = yield findings_response.json();
            const count = findings_data.total_count || 0;
            total_findings += count;
            if (count > 0) {
                return { has_findings: true, total_count: total_findings };
            }
        }
        return { has_findings: false, total_count: 0 };
    });
}
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        // Get inputs
        // Mandatory
        const dt_upload_api_key = core.getInput("DT_UPLOAD_API_KEY");
        const input_binary_path = core.getInput("UPLOAD_BINARY_PATH");
        const dt_results_api_key = core.getInput("DT_RESULTS_API_KEY");
        // Optional
        const sourcemap_file_path = core.getInput("SOURCEMAP_FILE_PATH");
        const username = core.getInput("USERNAME");
        const password = core.getInput("PASSWORD");
        const comments = core.getInput("COMMENTS");
        const release_id = core.getInput("RELEASE_ID");
        const platform_variant = core.getInput("PLATFORM_VARIANT");
        const external_id = core.getInput("EXTERNAL_ID");
        const block_on_severity = core.getInput("BLOCK_ON_SEVERITY");
        const warn_on_severity = core.getInput("WARN_ON_SEVERITY");
        const polling_timeout = core.getInput("POLLING_TIMEOUT");
        var parsed_polling_timeout;
        if (polling_timeout) {
            parsed_polling_timeout = parseInt(polling_timeout, 10);
            if (isNaN(parsed_polling_timeout)) {
                throw new Error("POLLING_TIMEOUT must be a number");
            }
            if (parsed_polling_timeout <= 0) {
                throw new Error("POLLING_TIMEOUT must be greater than 0");
            }
        }
        // Validate severity levels
        if (block_on_severity &&
            !["HIGH", "MEDIUM", "LOW"].includes(block_on_severity.toUpperCase())) {
            throw new Error("BLOCK_ON_SEVERITY must be one of: HIGH, MEDIUM, LOW");
        }
        if (warn_on_severity &&
            !["HIGH", "MEDIUM", "LOW"].includes(warn_on_severity.toUpperCase())) {
            throw new Error("WARN_ON_SEVERITY must be one of: HIGH, MEDIUM, LOW");
        }
        // Mask the sensitive fields
        core.setSecret(dt_upload_api_key);
        core.setSecret(dt_results_api_key);
        core.setSecret(password);
        // Check that the inputs are set
        if (!dt_upload_api_key) {
            throw new Error("DT_UPLOAD_API_KEY must be set!");
        }
        if (!input_binary_path) {
            throw new Error("UPLOAD_BINARY_PATH must be set!");
        }
        if (block_on_severity && !dt_results_api_key) {
            throw new Error("DT_RESULTS_API_KEY must be set when BLOCK_ON_SEVERITY is enabled!");
        }
        if (warn_on_severity && !dt_results_api_key) {
            throw new Error("DT_RESULTS_API_KEY must be set when WARN_ON_SEVERITY is enabled!");
        }
        const files = glob.sync(input_binary_path);
        if (!files.length) {
            throw new Error(`Did not find any files that match path: ${input_binary_path}`);
        }
        if (files.length > maxUploadFiles) {
            throw new Error(`Too many files (${files.length}) match the provided glob pattern; please write a more restrictive pattern to match no more than ${maxUploadFiles} files.`);
        }
        console.log(`Found ${files.length} files to upload.`);
        // Upload all the files that matched the file path
        let file_idx = 1;
        let output = [];
        let upload_ids = [];
        let scan_info = [];
        for (const file_path of files) {
            if (!fs.existsSync(file_path)) {
                throw new Error(`Could not access file: ${file_path}`);
            }
            console.log(`Processing file ${file_path} (${file_idx} of ${files.length}).`);
            const form = new FormData();
            form.append("file", fs.createReadStream(file_path));
            if (sourcemap_file_path) {
                if (!fs.existsSync(sourcemap_file_path)) {
                    throw new Error(`Could not access file: ${sourcemap_file_path}`);
                }
                try {
                    form.append("sourcemap", fs.createReadStream(sourcemap_file_path));
                }
                catch (err) {
                    core.setFailed(err);
                    return;
                }
            }
            // only append optional fields if explicitly set
            if (username) {
                form.append("username", username);
                console.log(`DAST username set to: ${username}`);
            }
            if (password) {
                form.append("password", password);
                console.log("DAST password is set to: (hidden)");
            }
            if (comments) {
                form.append("comments", comments);
                console.log(`Comments are set to: ${comments}`);
            }
            if (release_id) {
                form.append("release_Id", release_id);
                console.log(`Release ID is set to: ${release_id}`);
            }
            if (platform_variant) {
                form.append("platform_variant", platform_variant);
                console.log(`Platform variant is set to: ${platform_variant}`);
            }
            if (external_id) {
                form.append("external_id", external_id);
                console.log(`External ID is set to: ${external_id}`);
            }
            // retry upload maxRetries times
            for (let loop_idx = 0; loop_idx < maxRetries; loop_idx++) {
                // Send the auth request to get the upload URL
                const auth_response = yield upload_step_init(dt_upload_api_key);
                let auth_json;
                try {
                    auth_json = yield auth_response.json();
                }
                catch (err) {
                    core.setFailed(err);
                }
                if (auth_response.status !== 200) {
                    // handles auth failure
                    core.setFailed(auth_json);
                    break;
                }
                // Send the scan request with file
                console.log("Starting upload...");
                const response = yield fetch(auth_json.upload_url, {
                    method: "POST",
                    body: form,
                });
                console.log("Finished upload.");
                let jsonformat;
                try {
                    jsonformat = yield response.json();
                }
                catch (err) {
                    core.setFailed(err);
                }
                output.push(jsonformat);
                console.log(`Response: HTTP/${response.status}`);
                console.log(jsonformat);
                // Check the response
                // If we receive 409 (ownership conflict) or if this is the last try, bail out
                if (response.status === 200) {
                    if (jsonformat.upload_id) {
                        upload_ids.push(jsonformat.upload_id);
                    }
                    if (jsonformat.mobile_app_id && jsonformat.scan_id) {
                        scan_info.push({
                            mobile_app_id: jsonformat.mobile_app_id,
                            scan_id: jsonformat.scan_id,
                        });
                    }
                    break;
                }
                if (response.status === 409) {
                    core.setFailed(jsonformat);
                    break;
                }
                if (loop_idx == maxRetries - 1) {
                    core.setFailed(jsonformat);
                }
            }
            file_idx++;
        }
        // Check for vulnerabilities if BLOCK_ON_SEVERITY or WARN_ON_SEVERITY is set
        if ((!block_on_severity && !warn_on_severity) || scan_info.length === 0) {
            core.setOutput("responses", output);
            core.setOutput("response", output[0]); // keep the `response` output as the response of the first file upload to maintain compatibility
            return;
        }
        if (block_on_severity) {
            console.log(`Checking for vulnerabilities with minimum severity: ${block_on_severity}`);
        }
        if (warn_on_severity) {
            console.log(`Warning on vulnerabilities with minimum severity: ${warn_on_severity}`);
        }
        for (const scan of scan_info) {
            const { mobile_app_id, scan_id } = scan;
            var maxWaitTime = 300000; // 5 minutes
            if (parsed_polling_timeout) {
                maxWaitTime = parsed_polling_timeout * 1000;
            }
            // Poll for scan completion with 23-second intervals
            const pollInterval = 23000; // 23 seconds
            const startTime = Date.now();
            console.log(`Waiting for scan ${scan_id} to complete...`);
            while (Date.now() - startTime < maxWaitTime) {
                try {
                    const status_response = yield check_scan_status(dt_results_api_key, mobile_app_id, scan_id);
                    if (status_response.status === 401 || status_response.status === 403) {
                        console.log(`Authentication error checking scan status for ${scan_id}: HTTP ${status_response.status}. Please check your DT_RESULTS_API_KEY credentials.`);
                        process.exit(1);
                    }
                    if (status_response.status !== 200) {
                        console.log(`Error checking scan status for ${scan_id}: HTTP ${status_response.status}`);
                        yield new Promise((resolve) => setTimeout(resolve, pollInterval));
                        continue;
                    }
                    const status_data = yield status_response.json();
                    const scan_status = status_data.status;
                    if (scan_status &&
                        ["FAILED", "SCAN_ATTEMPT_ERROR", "CANCELLED"].includes(scan_status)) {
                        console.log(`Scan ${scan_id} failed, skipping vulnerability check`);
                        break;
                    }
                    if (scan_status !== "COMPLETED") {
                        console.log(`Scan ${scan_id} still in progress (current status: ${scan_status}), waiting...`);
                        yield new Promise((resolve) => setTimeout(resolve, pollInterval));
                        continue;
                    }
                    console.log(`Scan ${scan_id} completed, checking for security findings...`);
                    // Use start_date from status_data as results_since
                    const results_since = status_data.start_date;
                    if (!results_since) {
                        console.log(`No start_date found in scan data for ${scan_id}`);
                        break;
                    }
                    // Check for blocking vulnerabilities first
                    if (block_on_severity) {
                        try {
                            const { has_findings, total_count } = yield check_severity_findings(dt_results_api_key, mobile_app_id, results_since, block_on_severity);
                            if (has_findings) {
                                console.log(`Found ${total_count} security findings at or above ${block_on_severity} severity level`);
                                core.setFailed(`Build blocked due to ${total_count} security findings at or above ${block_on_severity} severity level`);
                                return;
                            }
                            console.log(`No security findings found at or above ${block_on_severity} severity level for scan ${scan_id}`);
                        }
                        catch (error) {
                            console.log(`Error checking security findings for scan ${scan_id}: ${error.message}`);
                            break;
                        }
                    }
                    // Check for warning vulnerabilities
                    if (warn_on_severity) {
                        try {
                            const { has_findings, total_count } = yield check_severity_findings(dt_results_api_key, mobile_app_id, results_since, warn_on_severity);
                            if (has_findings) {
                                console.log(`⚠️  WARNING: Found ${total_count} security findings at or above ${warn_on_severity} severity level for scan ${scan_id}`);
                                console.log(`⚠️  These findings do not block the build, but should be reviewed and addressed.`);
                            }
                            else {
                                console.log(`No security findings found at or above ${warn_on_severity} severity level for scan ${scan_id}`);
                            }
                        }
                        catch (error) {
                            console.log(`Error checking security findings for warnings for scan ${scan_id}: ${error.message}`);
                        }
                    }
                    break;
                }
                catch (error) {
                    console.log(`Error checking scan status for ${scan_id}: ${error.message}`);
                    yield new Promise((resolve) => setTimeout(resolve, pollInterval));
                }
            }
            if (Date.now() - startTime >= maxWaitTime) {
                console.log(`Timeout waiting for scan results for scan ${scan_id}`);
            }
        }
        core.setOutput("responses", output);
        core.setOutput("response", output[0]); // keep the `response` output as the response of the first file upload to maintain compatibility
    });
}
try {
    run();
}
catch (err) {
    core.setFailed(err.message);
}
