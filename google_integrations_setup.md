# Google Integration Setup Guide (Search Console & Analytics 4)

This guide explains how to obtain real Google OAuth credentials and configure them in the **SEO AI OS** system to enable live synchronization of Google Search Console (GSC) and Google Analytics 4 (GA4) properties.

---

## 1. Google Cloud Console Configuration

To enable Google OAuth connections, you must create a project in the **Google Cloud Console**:

1. **Create a New Project**:
   - Go to [Google Cloud Console](https://console.cloud.google.com/).
   - Click on the project dropdown at the top and select **New Project**.
   - Name your project (e.g., `SEO AI OS Portal`) and click **Create**.

2. **Enable Required APIs**:
   - Navigate to **APIs & Services** > **Library**.
   - Search for and enable the following APIs:
     - **Google Search Console API** (for fetching search queries, clicks, rankings, and CTR).
     - **Google Analytics Admin API** (for listing and discovering GA4 properties connected to your Google accounts).
     - **Google Analytics Data API** (for fetching GA4 daily timelines, devices, countries, traffic sources, and conversions).

3. **Configure OAuth Consent Screen**:
   - Navigate to **APIs & Services** > **OAuth consent screen**.
   - Select **External** user type (or **Internal** if within a Google Workspace organization) and click **Create**.
   - Fill in the required **App Information** and **Developer contact information**.
   - Under **Scopes**, click **Add or Remove Scopes** and enter the following Google API read scopes:
     - `https://www.googleapis.com/auth/webmasters.readonly` (Google Search Console sites read access)
     - `https://www.googleapis.com/auth/analytics.readonly` (Google Analytics property read access)
   - Add your test Google accounts under **Test users** (required while the app is in testing/unverified status).

4. **Create OAuth 2.0 Credentials**:
   - Navigate to **APIs & Services** > **Credentials**.
   - Click **Create Credentials** > **OAuth client ID**.
   - Select **Web application** as the Application type.
   - Configure the following URIs:
     - **Authorized JavaScript origins**: `http://localhost:3000` (next.js dev frontend)
     - **Authorized redirect URIs**: `http://localhost:3001/websites/google/oauth/callback` (nestjs callback endpoint)
   - Click **Create** to obtain your **Client ID** and **Client Secret**.

---

## 2. Environment Variables Configuration

Open the NestJS backend environment file `backend/.env` (or copy `.env.example` to `.env`) and append your credentials:

```bash
# Google Cloud Console OAuth Settings
GOOGLE_CLIENT_ID="YOUR_GOOGLE_CLIENT_ID_HERE.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="YOUR_GOOGLE_CLIENT_SECRET_HERE"
GOOGLE_REDIRECT_URI="http://localhost:3001/websites/google/oauth/callback"
```

> [!IMPORTANT]
> If these variables are not set or are left as `"dummy-client-id"`, the system automatically shifts into **Local Mock/Simulated Development Mode**. In mock mode, OAuth authorization calls redirect immediately to local callbacks with simulated tokens, allowing you to test all dashboard wizard screens, mapping selectors, and daily sync graphs offline.

---

## 3. Production Deployment Notes

When deploying to a remote host (e.g. Heroku, Vercel, or custom VPS):
- Make sure to update the **Authorized redirect URIs** in Google Cloud Console to match your production backend address: `https://api.yourdomain.com/websites/google/oauth/callback`.
- Update your production environment variables:
  ```bash
  GOOGLE_REDIRECT_URI="https://api.yourdomain.com/websites/google/oauth/callback"
  ```
