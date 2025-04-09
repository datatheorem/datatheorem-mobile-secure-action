import core = require("@actions/core");
const fetch = require("node-fetch");
const glob = require("glob");
import FormData = require("form-data");
import fs = require("fs");

// Global constants
const maxUploadFiles: number = 3; // no more than 3 files can be uploaded at a time
const maxRetries: number = 3; // max number of uploads to retry

class UploadInitError extends Error {
  response: Response;

  constructor(response: Response, ...rest) {
    super(...rest);
    this.name = "UploadInitError";
    this.response = response;
  }
}

class UploadLastError extends Error {
  status: Number;

  constructor(status: Number, ...rest) {
    super(...rest);
    this.status = status;
  }
}

async function uploadStepInit(
  uploadApiKey: string,
): Promise<string> {
  const response = await fetch(
    "https://api.securetheorem.com/uploadapi/v1/upload_init",
    {
      "headers": {
        "Accept": "application/json",
        "Authorization": `APIKey ${uploadApiKey}`,
        "Content-Type": "application/json",
      },
      "method": "POST",
    },
  );

  if (response.status !== 200) {
    throw new UploadInitError(response);
  }

  const jsonData = await response.json().catch(
    err => {
      throw new UploadInitError(response, {cause: err});
    }
  );

  if (typeof jsonData !== "object") {
    throw new UploadInitError(response);
  }

  const {"upload_url": uploadUrl} = jsonData;

  if (typeof uploadUrl !== "string") {
    throw new UploadInitError(response)
  }

  return uploadUrl;
}

async function uploadStepLast(
  uploadUrl: string,
  options: {
    file: fs.ReadStream,
    sourcemap: fs.ReadStream | undefined,
    credentials: {
      comments: string | undefined,
      password: string,
      username: string,
    } | undefined,
    externalId: string | undefined,
    platformVariant: string | undefined,
    releaseId: string | undefined,
  },
): Promise<Response> {
  const form = new FormData();

  form.append("file", options.file);

  if (options.sourcemap) {
    form.append("sourcemap", options.sourcemap);
  }

  // only append optional fields if explicitly set
  if (options.credentials) {
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
    console.log("Platform variant is set to: " + platform_variant);
  }
  if (external_id) {
    form.append("external_id", external_id);
    console.log("External ID is set to: " + external_id);
  }

  const response = await fetch(
    uploadUrl,
    {
      "body": form,
      "method": "POST",
    },
  );

  if (response.status !== 200) {
    throw new UploadLastError(response);
  }

  return await response.json().catch(
    err => {
      throw new UploadLastError(response, {cause: err});
    }
  );
}

async function run() {
  // Get inputs
  // Mandatory
  const dt_upload_api_key = core.getInput("DT_UPLOAD_API_KEY");
  const input_binary_path = core.getInput("UPLOAD_BINARY_PATH");

  // Optional
  const sourcemapFilePath = core.getInput("SOURCEMAP_FILE_PATH");
  // - DAST credentials
  const comments = core.getInput("COMMENTS");
  const password = core.getInput("PASSWORD");
  const username = core.getInput("USERNAME");
  // - Release information
  const external_id = core.getInput("EXTERNAL_ID");
  const platform_variant = core.getInput("PLATFORM_VARIANT");
  const release_id = core.getInput("RELEASE_ID");

  // Mask the sensitive fields
  core.setSecret(dt_upload_api_key);
  core.setSecret(password);

  // Check that the inputs are set
  if (!dt_upload_api_key){
    throw new Error("DT_UPLOAD_API_KEY must be set!");
  }
  if (!input_binary_path){
    throw new Error("UPLOAD_BINARY_PATH must be set!");
  }

  const files = glob.sync(input_binary_path);
  if (!files.length) {
    throw new Error("Did not find any files that match path:" + input_binary_path);
  }
  if (files.length > maxUploadFiles) {
    throw new Error(
      `Too many files (${files.length}) match the provided glob pattern; please write a more restrictive pattern to match no more than ${maxUploadFiles} files.`
    );
  }

  console.log(`Found ${files.length} files to upload.`);

  // Upload all the files that matched the file path
  let output: Array<any> = []

  for (const [file_idx, file_path] of files.entries()) {
    console.log(`Processing file ${file_path} (${file_idx} of ${files.length}).`);

    // retry upload maxRetries times
    for (let loop_idx = 0; loop_idx < maxRetries; loop_idx++) {
      // Send the scan request with file
      console.log("Starting upload...");

      // Send the auth request to get the upload URL
      const uploadUrl = await uploadStepInit(dt_upload_api_key);
      console.log(`Using upload URL: ${uploadUrl}`);

      const jsonData = uploadStepLast(
        uploadUrl,
        {
        }
      );
      console.log("Finished upload.");

      output.push(jsonData)
    }
  }

  core.setOutput("responses", output);
  core.setOutput("response", output[0]); // keep the `response` output as the response of the first file upload to maintain compatibility
}

try {
  run();
} catch (err) {
  core.setFailed(err.message);
}
