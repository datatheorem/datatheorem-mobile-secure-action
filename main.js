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
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            // Get inputs
            const dt_upload_api_key = core.getInput("DT_UPLOAD_API_KEY");
            const input_binary_path = core.getInput("UPLOAD_BINARY_PATH");
            // Mask the API key
            core.setSecret(dt_upload_api_key);
            // Check that the inputs are set
            if (!dt_upload_api_key) {
                throw new Error("DT_UPLOAD_API_KEY must be set!");
            }
            if (!input_binary_path) {
                throw new Error("UPLOAD_BINARY_PATH must be set!");
            }
            const files = glob.sync(input_binary_path);
            if (!files.length) {
                throw new Error("Did not find any files that match path:" + input_binary_path);
            }
            if (files.length > 3) {
                throw new Error("Too many files match the provided glob pattern, please write a more restrictive pattern");
            }
            // Upload all the files that matched the file path
            let output = [];
            for (const file_path of files) {
                if (!fs.existsSync(file_path)) {
                    throw new Error("Could not find file:" + file_path);
                }
                // retry upload 3 times
                for (let loop_idx = 0; loop_idx < 3; loop_idx++) {
                    // Send the auth request to get the upload URL
                    const auth_response = yield fetch("https://api.securetheorem.com/uploadapi/v1/upload_init", {
                        method: "POST",
                        headers: {
                            Authorization: "APIKey " + dt_upload_api_key,
                            Accept: "application/json",
                            "Content-Type": "application/json",
                        },
                    });
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
                    const form = new FormData();
                    form.append("file", fs.createReadStream(file_path));
                    // Send the scan request with file
                    console.log("Starting upload of:" + file_path);
                    const response = yield fetch(auth_json.upload_url, {
                        method: "POST",
                        body: form,
                    });
                    console.log("Finished upload of:" + file_path);
                    let jsonformat;
                    try {
                        jsonformat = yield response.json();
                    }
                    catch (err) {
                        core.setFailed(err);
                    }
                    output.push(jsonformat);
                    // Check the response
                    if (response.status === 200) {
                        console.log(jsonformat);
                        break;
                    }
                    else if (loop_idx == 2) {
                        core.setFailed(jsonformat);
                    }
                }
            }
            core.setOutput("responses", output);
            core.setOutput("response", output[0]); // keep the `response` output as the response of the first file upload to maintain compatibility
        }
        catch (err) {
            core.setFailed(err.message);
        }
    });
}
run();
