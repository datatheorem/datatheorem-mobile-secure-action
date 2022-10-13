import core = require("@actions/core");
const fetch = require("node-fetch");
const glob = require("glob");
import FormData = require("form-data");
import fs = require("fs");

async function run() {
  try {
    // Get inputs
    const dt_upload_api_key: string = core.getInput("DT_UPLOAD_API_KEY");
    const input_binary_path: string = core.getInput("UPLOAD_BINARY_PATH");
    // Mask the API key
    core.setSecret(dt_upload_api_key);
    // Check that the inputs are set
    if (!dt_upload_api_key){
      throw new Error(
        "DT_UPLOAD_API_KEY must be set!"
      );
    }
    if (!input_binary_path){
      throw new Error(
        "UPLOAD_BINARY_PATH must be set!"
      );
    }

    const files = glob.sync(input_binary_path);
    if (!files.length) {
      throw new Error(
        "Did not find any files that match path:" + input_binary_path
      );
    }
    console.log("Found files matching path: " + input_binary_path);
    console.log(files);

    // Upload all the files that matched the file path
    let output: Array<any> = []
    for (const file_path of files) {
      if (!fs.existsSync(file_path)) {
        throw new Error("Could not find file:" + file_path);
      }
      // retry upload 3 times
      for (let loop_idx = 0; loop_idx < 3; loop_idx++) {
        // Send the auth request to get the upload URL
        const auth_response = await fetch(
          "https://api.securetheorem.com/uploadapi/v1/upload_init",
          {
            method: "POST",
            headers: {
              Authorization: "APIKey " + dt_upload_api_key,
              Accept: "application/json",
              "Content-Type": "application/json",
            },
          }
        );

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

        const form = new FormData();
        form.append("file", fs.createReadStream(file_path));

        // Send the scan request with file
        console.log("Starting upload of:" + file_path);
        const response = await fetch(auth_json.upload_url, {
          method: "POST",
          body: form,
        });
        console.log("Finished upload of:" + file_path);
        let jsonformat;

        try {
          jsonformat = await response.json();
        } catch (err) {
          core.setFailed(err);
        }
        output.push(jsonformat)

        // Check the response
        if (response.status === 200) {
          console.log(jsonformat);
          break;
        } else if (loop_idx == 2) {
          core.setFailed(jsonformat);
        }
      }
    }
    core.setOutput("responses", output);
    core.setOutput("response", output[0]); // keep the `response` output as the response of the first file upload to maintain compatibility
  } catch (err) {
    core.setFailed(err.message);
  }
}

run();
