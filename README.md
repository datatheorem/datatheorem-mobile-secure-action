# Data Theorem Mobile Secure Github Action

Data Theorem's Mobile Secure will scan each pre-production release automatically (up to 7000 releases/day)
for security & privacy issues using static, dynamic, and behavioral analysis for both iOS and Android applications.

More information can be found here:  
https://www.datatheorem.com/products/mobile-secure

Enabling this integration requires a valid Data Theorem API key.

## Set your Data Theorem upload API key as a secret:
To find your Data Theorem API key, connect to https://www.securetheorem.com/mobile/sdlc/api_access using your Data Theorem account.'  
Create an encrypted variable named `DT_UPLOAD_API_KEY` in your Github repository

For more information, see [Github Encrypted secrets](https://docs.github.com/en/actions/reference/encrypted-secrets)

## Set the path to the binary files to upload
Configure the Action by indicating path to the file that will be uploaded in the `UPLOAD_BINARY_PATH` input.

You can use a glob pattern to indicate variable parts of the build's file name (for example, if the app's version number or build date is in the file name).  
Examples of glob patterns:
- `app-*.apk` : search for any apk starting with `app-` in workspace root directory
- `**/app-*.ipa` : search for any ipa starting with `app-` in any subdirectory of the workspace
- `{,**/}app-debug*.*` : search for any file containing `app-debug` in root the directory or in any subdirectory of the workspace
If multiple files match the provided pattern all matching files will be uploaded.

## Sample usage

```yaml
name: Build and upload to Data Theorem

on:
  push:
    branches: [ main ]

jobs:
  apk:
    name: Generate & Upload APK
    runs-on: ubuntu-20.04
    steps:
      - uses: actions/checkout@v2
      - name: set up JDK 1.8
        uses: actions/setup-java@v1
        with:
          java-version: 1.8
      - name: Build debug APK
        run: bash ./gradlew assembleDebug
      - name: Upload to Data Theorem
        uses: datatheorem/datatheorem-mobile-secure-action@v2.1.0
        with:
          UPLOAD_BINARY_PATH: "./app/build/outputs/apk/debug/app-debug.apk"
          DT_UPLOAD_API_KEY: ${{ secrets.DT_UPLOAD_API_KEY }}
```