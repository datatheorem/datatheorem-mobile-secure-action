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
- `{,**/}app-debug*.*` : search for any file containing `app-debug` in root the directory or in any subdirectory of the workspace.

If multiple files match the provided pattern, all matching files will be uploaded. However, to prevent accidentally uploading content of a large directory there is a limit of 3 matching files.  If more than 3 files match the pattern, the upload will fail with a corresponding error message.

## Set optional parameters
You can optionally provide username and password to be used with dynamic (DAST) testing.  Optional parameters (including username and password) are described in more details in the [API documentation](https://datatheorem.github.io/PortalApi/mobile_security_devops/uploading_mobile_apps.html).  We strongly recommend using [Github Encrypted secrets](https://docs.github.com/en/actions/reference/encrypted-secrets) to protect the dynamic testing credentials.

At this time, comments, release id, external id, and platform variant parameters are supported, in addition to username/password.  When optional parameters are specified, they override previosly provided values.  If optional parameters are omitted, previously provided value are used for username/password, and other parameters are set to blank/unused.  For example, a build for which comments are not provided will show no comments.

If multiple files match the provided pattern, the same set of optional values will be sent with each file. 

## Vulnerability Blocking

The action supports automatic build blocking based on security findings. When `BLOCK_ON_SEVERITY` is specified, the action will:

1. Wait for the scan to complete (up to 5 minutes)
2. Check for security findings at or above the specified severity level
3. Block the build if any vulnerabilities are found at the minimum severity threshold

### Severity Levels
- `HIGH`: Block on high severity vulnerabilities only
- `MEDIUM`: Block on medium and high severity vulnerabilities  
- `LOW`: Block on all severity vulnerabilities (low, medium, high)

### Example with Vulnerability Blocking
```yaml
- name: Upload to Data Theorem with blocking if high or medium vulnerabilities are found
  uses: datatheorem/datatheorem-mobile-secure-action@v2.3.1
  with:
    UPLOAD_BINARY_PATH: "./app/build/outputs/apk/debug/app-debug.apk"
    DT_UPLOAD_API_KEY: ${{ secrets.DT_UPLOAD_API_KEY }}
    BLOCK_ON_SEVERITY: "MEDIUM"
```

**Note:** The vulnerability blocking feature will cause the action to wait for scan completion before proceeding. This adds time to your build process but ensures security issues are caught before deployment.

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
          USERNAME: "test_user"
          PASSWORD: ${{ secrets.DT_DAST_PASSWORD }}
          COMMENTS: "This is a pre-production build."
          RELEASE_ID: ${{ vars.GITHUB_RUN_NUMBER }}
          EXTERNAL_ID: "App_12230045"
          BLOCK_ON_SEVERITY: "HIGH"  # Optional: Block build on high severity vulnerabilities

```
