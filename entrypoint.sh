#!/bin/bash -l

set -ex


# Check required environment variables
if [ -z $INPUT_DT_UPLOAD_API_KEY ]; then
  echo "Missing input: DT_UPLOAD_API_KEY"
  exit 1
fi

if [ -z "${INPUT_UPLOAD_BINARY_PATH}" ]; then
  echo "Missing input: UPLOAD_BINARY_PATH"
  exit 1
elif [ ! -f "${INPUT_UPLOAD_BINARY_PATH}" ]; then
  echo "App binary file not found"
  exit 1
fi

maxRetries=3
for (( retry = 0; retry < maxRetries; retry++ ))
do
  # Step 1: get the upload URL
  echo "Get upload url"
  step1_response=$(curl -s -w "%{http_code}" -X POST -H "Authorization: APIKey ${INPUT_DT_UPLOAD_API_KEY}"  --data ""  https://api.securetheorem.com/uploadapi/v1/upload_init)
  http_code=${step1_response: -3}
  response_body=${step1_response::-3}

  # Check that http status code is 200
  [ ! ${http_code} -eq 200 ] && echo ${response_body} && exit 1
  upload_url=$(echo ${response_body} | jq -r ".upload_url")

  # Step 2: upload the APK
  step2_response=$(curl -F file=@${INPUT_UPLOAD_BINARY_PATH} ${upload_url}) && echo ${step2_response} && break
done

if [ ${retry} -ge ${maxRetries} ]; then
  echo "Upload failed after ${maxRetries} attempts"
  exit 1
fi
