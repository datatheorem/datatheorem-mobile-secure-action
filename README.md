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
      - name: Upload APK artifact
        uses: actions/upload-artifact@v2
        with:
          name: app
          path: app/build/outputs/apk/debug/app-debug.apk
      - name: Download artifact
        uses: actions/download-artifact@v2
        with: 
          name: app
      - name: Upload to Data Theorem
        uses: datatheorem/datatheorem-mobile-secure-action@v1
        with:
          UPLOAD_BINARY_PATH: "./app-debug.apk"
          DT_UPLOAD_API_KEY: ${{ secrets.DT_UPLOAD_API_KEY }}
```
