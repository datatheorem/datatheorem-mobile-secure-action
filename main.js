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
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var core = require("@actions/core");
var fetch = require("node-fetch");
var glob = require("glob");
var FormData = require("form-data");
var fs = require("fs");
// Global constants
var maxUploadFiles = 3; // no more than 3 files can be uploaded at a time
var maxRetries = 3; // max number of uploads to retry
function upload_step_init(dt_upload_api_key) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, fetch("https://api.securetheorem.com/uploadapi/v1/upload_init", {
                        "headers": {
                            "Accept": "application/json",
                            "Authorization": "APIKey " + dt_upload_api_key,
                            "Content-Type": "application/json",
                        },
                        "method": "POST",
                    })];
                case 1: return [2 /*return*/, _a.sent()];
            }
        });
    });
}
function run() {
    return __awaiter(this, void 0, void 0, function () {
        var dt_upload_api_key, input_binary_path, sourcemap_file_path, username, password, comments, release_id, platform_variant, external_id, files, file_idx, output, _i, files_1, file_path, form, loop_idx, auth_response, auth_json, err_1, response, jsonformat, err_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    dt_upload_api_key = core.getInput("DT_UPLOAD_API_KEY");
                    input_binary_path = core.getInput("UPLOAD_BINARY_PATH");
                    sourcemap_file_path = core.getInput("SOURCEMAP_FILE_PATH");
                    username = core.getInput("USERNAME");
                    password = core.getInput("PASSWORD");
                    comments = core.getInput("COMMENTS");
                    release_id = core.getInput("RELEASE_ID");
                    platform_variant = core.getInput("PLATFORM_VARIANT");
                    external_id = core.getInput("EXTERNAL_ID");
                    // Mask the sensitive fields
                    core.setSecret(dt_upload_api_key);
                    core.setSecret(password);
                    // Check that the inputs are set
                    if (!dt_upload_api_key) {
                        throw new Error("DT_UPLOAD_API_KEY must be set!");
                    }
                    if (!input_binary_path) {
                        throw new Error("UPLOAD_BINARY_PATH must be set!");
                    }
                    files = glob.sync(input_binary_path);
                    if (!files.length) {
                        throw new Error("Did not find any files that match path:" + input_binary_path);
                    }
                    if (files.length > maxUploadFiles) {
                        throw new Error("Too many files (" + files.length + ") match the provided glob pattern; please write a more restrictive pattern to match no more than " + maxUploadFiles + " files.");
                    }
                    console.log("Found " + files.length + " files to upload.");
                    file_idx = 1;
                    output = [];
                    _i = 0, files_1 = files;
                    _a.label = 1;
                case 1:
                    if (!(_i < files_1.length)) return [3 /*break*/, 15];
                    file_path = files_1[_i];
                    if (!fs.existsSync(file_path)) {
                        throw new Error("Could not access file:" + file_path);
                    }
                    console.log("Processing file " + file_path + " (" + file_idx + " of " + files.length + ").");
                    form = new FormData();
                    form.append("file", fs.createReadStream(file_path));
                    if (sourcemap_file_path) {
                        try {
                            form.append("sourcemap", fs.createReadStream(sourcemap_file_path));
                        }
                        catch (err) {
                            core.setFailed(err);
                            return [2 /*return*/];
                        }
                    }
                    // only append optional fields if explicitly set
                    if (username) {
                        form.append("username", username);
                        console.log("DAST username set to: " + username);
                    }
                    if (password) {
                        form.append("password", password);
                        console.log("DAST password is set to: (hidden)");
                    }
                    if (comments) {
                        form.append("comments", comments);
                        console.log("Comments are set to: " + comments);
                    }
                    if (release_id) {
                        form.append("release_Id", release_id);
                        console.log("Release ID is set to: " + release_id);
                    }
                    if (platform_variant) {
                        form.append("platform_variant", platform_variant);
                        console.log("Platform variant is set to: " + platform_variant);
                    }
                    if (external_id) {
                        form.append("external_id", external_id);
                        console.log("External ID is set to: " + external_id);
                    }
                    loop_idx = 0;
                    _a.label = 2;
                case 2:
                    if (!(loop_idx < maxRetries)) return [3 /*break*/, 14];
                    return [4 /*yield*/, upload_step_init(dt_upload_api_key)];
                case 3:
                    auth_response = _a.sent();
                    auth_json = void 0;
                    _a.label = 4;
                case 4:
                    _a.trys.push([4, 6, , 7]);
                    return [4 /*yield*/, auth_response.json()];
                case 5:
                    auth_json = _a.sent();
                    return [3 /*break*/, 7];
                case 6:
                    err_1 = _a.sent();
                    core.setFailed(err_1);
                    return [3 /*break*/, 7];
                case 7:
                    if (auth_response.status !== 200) {
                        // handles auth failure
                        core.setFailed(auth_json);
                        return [3 /*break*/, 14];
                    }
                    // Send the scan request with file
                    console.log("Starting upload...");
                    return [4 /*yield*/, fetch(auth_json.upload_url, {
                            "method": "POST",
                            "body": form,
                        })];
                case 8:
                    response = _a.sent();
                    console.log("Finished upload.");
                    jsonformat = void 0;
                    _a.label = 9;
                case 9:
                    _a.trys.push([9, 11, , 12]);
                    return [4 /*yield*/, response.json()];
                case 10:
                    jsonformat = _a.sent();
                    return [3 /*break*/, 12];
                case 11:
                    err_2 = _a.sent();
                    core.setFailed(err_2);
                    return [3 /*break*/, 12];
                case 12:
                    output.push(jsonformat);
                    console.log("Response: HTTP/" + response.status);
                    console.log(jsonformat);
                    // Check the response
                    // If we receive 409 (ownership conflict) or if this is the last try, bail out
                    if (response.status === 200) {
                        return [3 /*break*/, 14];
                    }
                    else if (response.status === 409) {
                        core.setFailed(jsonformat);
                        return [3 /*break*/, 14];
                    }
                    else if (loop_idx == (maxRetries - 1)) {
                        core.setFailed(jsonformat);
                    }
                    _a.label = 13;
                case 13:
                    loop_idx++;
                    return [3 /*break*/, 2];
                case 14:
                    _i++;
                    return [3 /*break*/, 1];
                case 15:
                    core.setOutput("responses", output);
                    core.setOutput("response", output[0]); // keep the `response` output as the response of the first file upload to maintain compatibility
                    return [2 /*return*/];
            }
        });
    });
}
try {
    run();
}
catch (err) {
    core.setFailed(err.message);
}
