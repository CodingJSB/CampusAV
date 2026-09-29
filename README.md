# CampusAV — College Classroom AV Lifecycle & Budget Planning Engine

A transient, privacy-first classroom AV technology inventory, maintenance tracker, replacement cycle forecasting, and automated fiscal year budget planning dashboard for higher education institutions.

**100% Client-Side Architecture**: Sensitive campus budget numbers, serial tags, and room inventories are processed strictly in browser memory. No data is transmitted to an external server.

---

## 🚀 Quick Start (Local Development)

### Prerequisites
- [Node.js](https://nodejs.org/) (version 18, 20, or newer)
- `npm` (comes with Node.js) or `pnpm` / `bun`

### Installation & Run

1. **Clone your repository**:
   ```bash
   git clone <YOUR_GITHUB_REPO_URL>
   cd <REPO_NAME>
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the local development server**:
   ```bash
   npm run dev
   ```

4. **Open in browser**:
   Navigate to `http://localhost:3000` (or `http://localhost:5173`).

---

## 📦 Build for Production

To create an optimized production build:

```bash
npm run build
```

The compiled static assets will be output to the `dist/` directory. You can preview the production build locally with:

```bash
npm run preview
```

---

## 🌐 Free 1-Click Hosting & Deployment Options

Since **CampusAV** runs 100% client-side, it can be hosted for free with zero server maintenance on:

### Option 1: GitHub Pages (Automatic via GitHub Actions)
1. Go to your repository on GitHub.
2. Navigate to **Settings** > **Pages**.
3. Under **Build and deployment** > **Source**, select **GitHub Actions**.
4. In your repository, create `.github/workflows/deploy.yml` with:
   ```yaml
   name: Deploy to GitHub Pages

   on:
     push:
       branches: [ main ]

   permissions:
     contents: read
     pages: write
     id-token: write

   concurrency:
     group: "pages"
     cancel-in-progress: true

   jobs:
     deploy:
       environment:
         name: github-pages
         url: ${{ steps.deployment.outputs.page_url }}
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v4
         - uses: actions/setup-node@v4
           with:
             node-version: 20
         - run: npm install
         - run: npm run build
         - uses: actions/configure-pages@v4
         - uses: actions/upload-pages-artifact@v3
           with:
             path: './dist'
         - id: deployment
           uses: actions/deploy-pages@v4
   ```
5. Push to `main`, and your site will be live at `https://<your-username>.github.io/<repo-name>/`.

### Option 2: Vercel / Netlify / Cloudflare Pages
- Connect your GitHub repository directly to [Vercel](https://vercel.com/) or [Netlify](https://www.netlify.com/).
- Framework preset: **Vite**
- Build command: `npm run build`
- Output directory: `dist`
- Deploys automatically on every git push.

---

## 📊 Features & Workflows

1. **Transient & Privacy First**:
   - No login or credentials required.
   - Upload your `.xlsx`, `.xls`, or `.csv` spreadsheet upon opening the app.
   - 1-click **"Clear Session"** button to purge active data from browser memory.
2. **Classroom Bundled Overhauls**:
   - Group hardware into complete classroom retrofit packages (e.g., $30,800 for Roger Bacon 250, $22,450 for Nobel 122).
   - Aligns whole-room refresh cycles with summer or winter recess windows.
3. **Premature Component Swap Tracking**:
   - Automatically flags failing components (e.g. lamp failure, dock cam issue) that need early swap ahead of master room overhaul.
4. **Next Quarter Outlay**:
   - Itemized upcoming quarter capital and maintenance budget forecast.
5. **Multi-Year CapEx Schedule**:
   - 6-year capital budget projections with hardware vs. labor breakdown.
6. **Executive PDF Export**:
   - Generates official multi-page PDF reports for Provosts, Deans, and Trustees.

---

## 📄 License
Apache-2.0
