import core = require("@actions/core");
const fetch = require("node-fetch");
const glob = require("glob");
import FormData = require("form-data");
import fs = require("fs");

// Global constants
const maxUploadFiles: number = 3; // no more than 3 files can be uploaded at a time
const maxRetries: number = 3; // max number of uploads to retry

async function upload_step_init(dt_upload_api_key: string): Promise<Response> {
  return await fetch(
    "https://api.securetheorem.com/uploadapi/v1/upload_init",
    {
      "headers": {
        "Accept": "application/json",
        "Authorization": "APIKey " + dt_upload_api_key,
        "Content-Type": "application/json",
      },
      "method": "POST",
    },
  );
}

async function run() {
  // Get inputs
  // Mandatory
  const dt_upload_api_key = core.getInput("DT_UPLOAD_API_KEY");
  const input_binary_path = core.getInput("UPLOAD_BINARY_PATH");
  const sourcemap_file_path = core.getInput("SOURCEMAP_FILE_PATH");

  // Optional
  const username = core.getInput("USERNAME");
  const password = core.getInput("PASSWORD");
  const comments = core.getInput("COMMENTS");
  const release_id = core.getInput("RELEASE_ID");
  const platform_variant = core.getInput("PLATFORM_VARIANT");
  const external_id = core.getInput("EXTERNAL_ID");

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
      "Too many files (" + files.length + ") match the provided glob pattern; please write a more restrictive pattern to match no more than " + maxUploadFiles + " files."
    );
  }

  console.log("Found " + files.length + " files to upload.");

  // Upload all the files that matched the file path
  let file_idx: number = 1;
  let output: Array<any> = []
  for (const file_path of files) {
    if (!fs.existsSync(file_path)) {
      throw new Error("Could not access file:" + file_path);
    }

    console.log("Processing file " + file_path + " (" + file_idx + " of " + files.length + ").");

    const form = new FormData();
    form.append("file", fs.createReadStream(file_path));

    if (sourcemap_file_path) {
        form.append("sourcemap", fs.createReadStream(sourcemap_file_path));
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

    // retry upload maxRetries times
    for (let loop_idx = 0; loop_idx < maxRetries; loop_idx++) {

      // Send the auth request to get the upload URL
      const auth_response = await upload_step_init(dt_upload_api_key);

      let auth_json;
      try {
        auth_json = await auth_response.json();
      } catch (err) {
        core.setFailed(err);
      }

      if (auth_response.status !== 200) {
        // handles auth failure
        core.setFailed(auth_json);
        break;
      }

      // Send the scan request with file
      console.log("Starting upload...");
      const response = await fetch(
        auth_json.upload_url,
        {
          "method": "POST",
          "body": form,
        },
      );
      console.log("Finished upload.");

      let jsonformat;
      try {
        jsonformat = await response.json();
      } catch (err) {
        core.setFailed(err);
      }
      output.push(jsonformat)
      console.log("Response: HTTP/" + response.status);
      console.log(jsonformat);

      // Check the response
      // If we receive 409 (ownership conflict) or if this is the last try, bail out
      if (response.status === 200) {
        break;
      } else if (response.status === 409) {
        core.setFailed(jsonformat);
        break;
      } else if (loop_idx == (maxRetries - 1)) {
        core.setFailed(jsonformat);
      }
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
