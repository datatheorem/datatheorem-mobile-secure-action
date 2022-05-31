import core = require('@actions/core');
const fetch = require('node-fetch');
import FormData = require('form-data');
import fs = require('fs');


async function run() {
  try {
    // Get inputs
    const dt_upload_api_key: string = core.getInput("DT_UPLOAD_API_KEY");
    const input_binary_path: string = core.getInput("UPLOAD_BINARY_PATH");
    core.setSecret(dt_upload_api_key)

    if (!fs.existsSync(input_binary_path)) {
      throw new Error("Input file does not exist at :" + input_binary_path);
    }

    // retry upload 3 times
    for (let loop_idx = 0; loop_idx < 3; loop_idx++) {

      // Send the auth request to get the upload URL
      const auth_response = await fetch(
        "https://api.securetheorem.com/uploadapi/v1/upload_init",
        {
          method: 'POST',
          headers: {
            Authorization: "APIKey " + dt_upload_api_key,
            Accept: "application/json",
            "Content-Type": "application/json",
          },
        }
      );

      let auth_json
      try {
        auth_json = await auth_response.json()
      } catch (err) {core.setFailed(err);}

      if (auth_response.status !== 200) {
        // handles auth failure
        core.setFailed(auth_json);
        break;
      }

      const form = new FormData();
      form.append('file', fs.createReadStream(input_binary_path));

      // Send the scan request with file
      const response = await fetch(
        auth_json.upload_url,
        {
          method: 'POST',
          body: form,
        }
      );

      let jsonformat

      try{
        jsonformat = await response.json();
      } catch (err) {core.setFailed(err)}

      // Check the response
      console.log(jsonformat);
      if (response.status === 200) {
        core.setOutput('response', jsonformat);;
        break;
      } else if (loop_idx == 2) {
        core.setFailed(jsonformat);
      }
    }

  } catch (err) {
    core.setFailed(err.message);
  }
}

run();

