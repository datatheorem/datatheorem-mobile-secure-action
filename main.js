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
const fetch = require('node-fetch');
const FormData = require("form-data");
const fs = require("fs");
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            // Get inputs
            const dt_upload_api_key = core.getInput("DT_UPLOAD_API_KEY");
            const input_binary_path = core.getInput("UPLOAD_BINARY_PATH");
            core.setSecret(dt_upload_api_key);
            if (!fs.existsSync(input_binary_path)) {
                throw new Error("Input file does not exist at " + input_binary_path);
            }
            // retry upload 3 times
            for (let loop_idx = 0; loop_idx < 3; loop_idx++) {
                // Send the auth request to get the upload URL
                const auth_response = yield fetch("https://api.securetheorem.com/uploadapi/v1/upload_init", {
                    method: 'POST',
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
                form.append('file', fs.createReadStream(input_binary_path));
                // Send the scan request with file
                const response = yield fetch(auth_json.upload_url, {
                    method: 'POST',
                    body: form,
                });
                let jsonformat;
                try {
                    jsonformat = yield response.json();
                }
                catch (err) {
                    core.setFailed(err);
                }
                // Check the response
                console.log(jsonformat);
                if (response.status === 200) {
                    core.setOutput('response', jsonformat);
                    ;
                    break;
                }
                else if (loop_idx == 2) {
                    core.setFailed(jsonformat);
                }
            }
        }
        catch (err) {
            core.setFailed(err.message);
        }
    });
}
run();
