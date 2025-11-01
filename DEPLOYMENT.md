# Project Voice - Deployment Guide

Complete deployment guide for GAE (backend) and TestFlight (iOS).

## Architecture Overview

```
┌─────────────────────────────────────────────────┐
│                                                 │
│  iOS App (TestFlight)                          │
│  └─ Native Keyboard Extension                  │
│     └─ API Client (multipart/form-data)       │
│                                                 │
└────────────────┬────────────────────────────────┘
                 │ HTTPS
                 │ POST /run-macro
                 ▼
┌─────────────────────────────────────────────────┐
│                                                 │
│  Google App Engine (Python 3.12)               │
│  ├─ Flask Web App                              │
│  ├─ /run-macro endpoint                        │
│  ├─ Gemini API Integration                     │
│  └─ Static Files (Web Frontend)                │
│                                                 │
└─────────────────────────────────────────────────┘
```

---

## Part 1: GAE Backend Deployment

### Prerequisites

1. **Google Cloud Project**
   ```bash
   gcloud projects create PROJECT-VOICE-[UNIQUE-ID]
   gcloud config set project PROJECT-VOICE-[UNIQUE-ID]
   ```

2. **Enable Required APIs**
   ```bash
   gcloud services enable appengine.googleapis.com
   gcloud services enable generativelanguage.googleapis.com
   ```

3. **Set up App Engine**
   ```bash
   gcloud app create --region=us-central
   ```

4. **Install Dependencies**
   ```bash
   npm install
   pip install -r requirements.txt
   ```

### Configuration

#### 1. Update `app.yaml`

Current configuration:
```yaml
runtime: python312
env_variables:
  API_KEY: "api-key"              # ← CHANGE THIS
  SECRET_KEY: "project-voice-secret"  # ← CHANGE THIS

handlers:
- url: /static
  static_dir: static
  secure: always

- url: /*
  script: auto
  secure: always
```

**Required Changes:**
```yaml
runtime: python312

# Use Secret Manager (recommended for production)
env_variables:
  SECRET_KEY: "YOUR-RANDOM-SECRET-KEY-HERE"

# Store API key in Secret Manager instead
# See: https://cloud.google.com/appengine/docs/standard/python3/using-secret-manager

handlers:
- url: /static
  static_dir: static
  secure: always
  expiration: "1d"  # Cache static files for 1 day

- url: /favicon.ico
  static_files: static/favicon.ico
  upload: static/favicon.ico
  secure: always

- url: /*
  script: auto
  secure: always
```

#### 2. Create `.gcloudignore`

```bash
# Git files
.git
.gitignore
.github/

# Node
node_modules/
npm-debug.log

# Python
__pycache__/
*.pyc
*.pyo
*.pyd
.Python
env/
venv/
.venv/

# iOS
ios/

# Development
.vscode/
.idea/
*.swp
*.swo
*~

# Testing
.coverage
htmlcov/
.pytest_cache/

# Documentation
*.md
!README.md

# Storybook
storybook-static/
.storybook/

# TypeScript
*.ts
!*.d.ts
tsconfig.json

# Source (already compiled)
src/
spec/
tests/
```

#### 3. Set Up Gemini API Key

**Option A: Environment Variable (development)**
```bash
export API_KEY="your-gemini-api-key-here"
```

**Option B: Secret Manager (production - recommended)**
```bash
# Create secret
echo -n "your-gemini-api-key" | gcloud secrets create gemini-api-key \
  --data-file=- \
  --replication-policy="automatic"

# Grant access to App Engine service account
gcloud secrets add-iam-policy-binding gemini-api-key \
  --member="serviceAccount:PROJECT-ID@appspot.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

Update `app.yaml`:
```yaml
env_variables:
  SECRET_KEY: "your-secret-key"
  # Remove API_KEY - will fetch from Secret Manager

# Access secrets in code
# See main.py for implementation
```

### Build & Deploy

#### 1. Build Frontend
```bash
npm run build
```

This creates:
- `static/index.js` - Bundled frontend
- `storybook-static/` - Component documentation

#### 2. Test Locally
```bash
npm run serve
# Or
python main.py
```

Visit: http://localhost:8080

#### 3. Deploy to GAE

**Development Deploy (with promotion):**
```bash
npm run deploy
# Or manually:
npm run build && gcloud app deploy app.yaml
```

**Production Deploy (no promotion - staged):**
```bash
npm run build && gcloud app deploy app.yaml --no-promote
```

This creates a new version without routing traffic.

#### 4. View Deployment
```bash
gcloud app browse
```

Your app will be at: `https://PROJECT-ID.uc.r.appspot.com`

### Version Management

**List versions:**
```bash
gcloud app versions list
```

**Split traffic (A/B testing):**
```bash
gcloud app services set-traffic default \
  --splits v1=50,v2=50
```

**Promote a specific version:**
```bash
gcloud app versions migrate v2
```

**Delete old versions:**
```bash
gcloud app versions delete v1
```

### Monitoring

**View logs:**
```bash
gcloud app logs tail -s default
```

**View in Console:**
https://console.cloud.google.com/logs/viewer

**Set up alerts:**
1. Go to Monitoring > Alerting
2. Create alert for error rate, latency, etc.

---

## Part 2: TestFlight iOS Deployment

### Prerequisites

1. **Apple Developer Account**
   - Enroll at: https://developer.apple.com/programs/
   - Cost: $99/year

2. **Xcode**
   - Download from Mac App Store
   - Version 15.0 or later

3. **Certificates & Provisioning**
   - iOS Distribution Certificate
   - App Store Provisioning Profile

### Setup iOS Project

#### 1. Create Xcode Project

Since Swift files are provided, you need to create the Xcode project:

```bash
cd ios
open Xcode
```

**In Xcode:**
1. File > New > Project
2. Select "iOS" > "App"
3. Product Name: `ProjectVoiceKeyboard`
4. Organization Identifier: `com.yourcompany` (use your reverse domain)
5. Interface: SwiftUI
6. Language: Swift
7. Save in: `ios/ProjectVoiceKeyboard/`

#### 2. Add Keyboard Extension Target

1. File > New > Target
2. Select "Custom Keyboard Extension"
3. Product Name: `KeyboardExtension`
4. Click Activate when prompted

#### 3. Add Source Files

**KeyboardExtension group:**
- Drag and drop from Finder:
  - `KeyboardViewController.swift`
  - `KeyboardView.swift`
  - `ApiClient.swift`
  - `EmotionSelector.swift`
  - `UserSettings.swift`
  - `Info.plist` (replace default)

**ProjectVoiceKeyboard group:**
- Add:
  - `SettingsView.swift`
  - Update `ContentView.swift`

#### 4. Configure Bundle Identifiers

**Main App:**
- Bundle Identifier: `com.yourcompany.ProjectVoiceKeyboard`

**Keyboard Extension:**
- Bundle Identifier: `com.yourcompany.ProjectVoiceKeyboard.KeyboardExtension`

#### 5. Configure App Groups (Optional but recommended)

**Enable App Groups for both targets:**

1. Select target > Signing & Capabilities
2. Click "+ Capability"
3. Select "App Groups"
4. Add group: `group.com.yourcompany.ProjectVoiceKeyboard`

Update `UserSettings.swift`:
```swift
private let appGroupIdentifier = "group.com.yourcompany.ProjectVoiceKeyboard"
```

#### 6. Configure Info.plist (Keyboard Extension)

Already provided in `ios/.../Info.plist`:

```xml
<key>RequestsOpenAccess</key>
<true/>
```

This allows network requests (required for API calls).

#### 7. Update API Endpoint

Edit `UserSettings.swift`:
```swift
var apiEndpoint: String {
    get {
        return defaults.string(forKey: Keys.apiEndpoint) ??
               "https://YOUR-PROJECT-ID.uc.r.appspot.com"
               // ← Change to your GAE URL
    }
    ...
}
```

### Build & Archive

#### 1. Select Target
- Select "Any iOS Device (arm64)" as destination
- Or connect a physical device

#### 2. Update Version & Build Number
- Select project > General
- Version: `1.0.0`
- Build: `1`

#### 3. Archive
```
Product > Archive
```

Wait for build to complete.

#### 4. Upload to App Store Connect

1. Window > Organizer
2. Select your archive
3. Click "Distribute App"
4. Choose "App Store Connect"
5. Select "Upload"
6. Choose signing options (Automatic recommended)
7. Click "Upload"

### TestFlight Setup

#### 1. App Store Connect Configuration

Visit: https://appstoreconnect.apple.com

1. **Create App:**
   - My Apps > + > New App
   - Platforms: iOS
   - Name: Project Voice Keyboard
   - Primary Language: English (or Japanese)
   - Bundle ID: Select your main app bundle ID
   - SKU: `project-voice-keyboard`

2. **App Information:**
   - Category: Productivity
   - Subcategory: (optional)
   - Age Rating: 4+

3. **Pricing:**
   - Free app

#### 2. Prepare Screenshots

**Required sizes:**
- 6.7" Display (iPhone 15 Pro Max): 1290 x 2796
- 6.5" Display (iPhone 11 Pro Max): 1242 x 2688
- 5.5" Display (iPhone 8 Plus): 1242 x 2208

**Screenshot content:**
- Main app setup screen
- Keyboard in use with emotion selector
- Settings screen
- Suggestion results

#### 3. App Privacy

**TestFlight doesn't require full privacy details, but good to prepare:**

- Data Collection: Yes (text input for AI processing)
- Data Usage: Product functionality
- Data Sharing: With Gemini API (Google)
- User Control: Clear conversation history option

#### 4. Beta Testing

**Internal Testing (25 testers max):**
1. App Store Connect > TestFlight
2. Internal Testing > Click "+"
3. Add internal testers (must have App Store Connect access)

**External Testing (10,000 testers max):**
1. TestFlight > External Testing
2. Create new group
3. Submit for Beta App Review (required first time)
4. Add testers via email or public link

### Distribute TestFlight Build

#### 1. After Upload Completes

1. Go to TestFlight tab in App Store Connect
2. Wait for "Processing" to become "Ready to Submit"
3. Click on build number

#### 2. Add Test Information

**What to Test:**
```
Please test the following:
1. Enable keyboard in Settings
2. Enable "Allow Full Access"
3. Open any app with text input
4. Switch to Project Voice Keyboard
5. Test emotion selector (💬 ❓ 🙏 🚫)
6. Type some text and check AI suggestions
7. Open main app and configure API endpoint
8. Test persona customization
9. Verify conversation history works
```

**Test Notes:**
```
Known Issues:
- Requires internet connection
- Requires GAE backend running
- First suggestion may be slow (cold start)

Configuration:
- Default API: https://YOUR-PROJECT.uc.r.appspot.com
- Can be changed in Settings app
```

#### 3. Add Testers

**Internal testers:**
- Automatically get access
- No review needed

**External testers:**
1. Click "Add External Testers"
2. Enter email addresses
3. Or create public link

Testers receive email with TestFlight invitation.

#### 4. Submit for Review (External only)

1. Provide test account (if needed)
2. Contact information
3. Click "Submit for Review"
4. Wait 24-48 hours for approval

### Tester Instructions

Send this to your testers:

```
Project Voice Keyboard - TestFlight Instructions

1. Install TestFlight app from App Store
2. Open invitation email and tap "View in TestFlight"
3. Tap "Install" in TestFlight
4. After install, open Project Voice Keyboard app
5. Follow setup instructions in app
6. Go to iOS Settings > General > Keyboard > Keyboards
7. Tap "Add New Keyboard"
8. Select "Project Voice Keyboard"
9. Tap on it again and enable "Allow Full Access"
10. Open any app (Notes, Messages) and switch to the keyboard
11. Test features and provide feedback in TestFlight

Important: Make sure to configure API endpoint in Settings if needed.
```

### Update Builds

**Upload new build:**
1. Increment build number in Xcode
2. Archive and upload again
3. New build appears in TestFlight
4. Existing testers auto-receive update

**Version updates:**
- Increment version for major changes
- Requires new review for external testing

---

## CI/CD Setup (Optional)

### GitHub Actions for GAE

Create `.github/workflows/deploy-gae.yml`:

```yaml
name: Deploy to GAE

on:
  push:
    branches: [ main ]
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
    - uses: actions/checkout@v3

    - name: Setup Node
      uses: actions/setup-node@v3
      with:
        node-version: '18'

    - name: Install dependencies
      run: npm install

    - name: Build frontend
      run: npm run build

    - name: Authenticate to Google Cloud
      uses: google-github-actions/auth@v1
      with:
        credentials_json: ${{ secrets.GCP_SA_KEY }}

    - name: Deploy to GAE
      run: gcloud app deploy app.yaml --quiet --no-promote
```

**Setup:**
1. Create service account in GCP
2. Download JSON key
3. Add to GitHub Secrets as `GCP_SA_KEY`

### Xcode Cloud for TestFlight

1. Xcode > Product > Xcode Cloud > Create Workflow
2. Configure:
   - Trigger: On push to `main`
   - Build: Archive
   - Post-Build: Distribute to TestFlight
3. Automatic uploads on every commit

---

## Environment-Specific Configuration

### Development
```bash
# Local backend
npm run serve  # http://localhost:8080

# iOS points to localhost (use ngrok for device testing)
ngrok http 8080
# Update UserSettings.swift with ngrok URL
```

### Staging
```bash
# GAE staging version
gcloud app deploy --version=staging --no-promote

# iOS TestFlight
# Use staging GAE URL in settings
```

### Production
```bash
# GAE production
gcloud app deploy --promote

# iOS App Store
# After TestFlight success, submit for App Store review
```

---

## Monitoring & Maintenance

### Backend Monitoring

**GAE Dashboard:**
- https://console.cloud.google.com/appengine

**Key Metrics:**
- Request latency (target: < 1s)
- Error rate (target: < 1%)
- Instance usage
- Gemini API quota

**Alerts:**
```bash
# Create alert for high error rate
gcloud alpha monitoring policies create \
  --notification-channels=CHANNEL_ID \
  --display-name="High Error Rate" \
  --condition-threshold-value=0.05 \
  --condition-threshold-duration=300s
```

### iOS Monitoring

**TestFlight Feedback:**
- App Store Connect > TestFlight > Feedback
- Review crashes and screenshots

**Analytics:**
- Consider Firebase Analytics
- Track keyboard usage, API success rate

**Crash Reporting:**
- Xcode Organizer > Crashes
- Or Firebase Crashlytics

---

## Troubleshooting

### GAE Issues

**Build fails:**
```bash
# Check logs
gcloud app logs tail -s default

# Verify requirements.txt
pip install -r requirements.txt

# Test locally first
npm run serve
```

**CORS errors:**
- Check Flask-CORS configuration in main.py
- Verify allowed origins

**Quota exceeded:**
- Check Gemini API quota in GCP Console
- Consider request throttling

### iOS Issues

**Archive fails:**
- Check signing certificates
- Verify bundle identifiers are unique
- Check for code signing errors in logs

**Keyboard doesn't appear:**
- Verify Info.plist has correct keys
- Check bundle identifier matches
- Enable "Allow Full Access"

**API requests fail:**
- Verify "Allow Full Access" is enabled
- Check API endpoint URL
- Test endpoint with curl
- Check network logs in Xcode Console

**Suggestions not showing:**
- Verify Gemini API key is valid
- Check backend logs for errors
- Verify FormData format matches web version

---

## Costs

### Google Cloud (GAE)

**Free Tier (daily):**
- 28 instance hours
- 1 GB egress
- 5 GB Cloud Storage

**Estimated costs (after free tier):**
- Light usage (< 100 users): $0-10/month
- Medium usage (100-1000 users): $10-50/month
- Heavy usage (1000+ users): $50-200+/month

**Gemini API:**
- Check current pricing: https://ai.google.dev/pricing
- Free tier available
- Pay per token after free tier

### Apple Developer

**Required:**
- $99/year Apple Developer Program

**Optional:**
- App Store Review: Free
- TestFlight: Free (included)

---

## Next Steps

1. **Deploy Backend:**
   ```bash
   npm run build
   gcloud app deploy
   ```

2. **Test Backend:**
   ```bash
   curl -X POST https://YOUR-PROJECT.uc.r.appspot.com/run-macro \
     -F "id=SentenceGeneric20250311" \
     -F 'userInputs={"text":"test"}'
   ```

3. **Setup Xcode Project**
   - Follow iOS setup instructions above

4. **Build & Upload to TestFlight**
   - Archive in Xcode
   - Upload to App Store Connect

5. **Invite Testers**
   - Start with internal testing
   - Expand to external when stable

6. **Monitor & Iterate**
   - Collect feedback
   - Fix issues
   - Upload new builds

---

## Support

- GAE Docs: https://cloud.google.com/appengine/docs
- TestFlight Guide: https://developer.apple.com/testflight/
- Project Issues: https://github.com/Ono-Katsuki/project-voice/issues
