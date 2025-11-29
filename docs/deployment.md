# Deployment Guide

This project is set up to be easily deployed as a static site.

## Building for Production

Run the build script to generate the production-ready files:

```bash
npm run build
```

This will create a `build` directory containing the compiled assets.

## Deploying to GitHub Pages

The project includes the `gh-pages` package for easy deployment to GitHub Pages.

1. **Update `homepage` in `package.json`**:
   Ensure the `homepage` field in your `package.json` matches your GitHub Pages URL:
   ```json
   "homepage": "https://<username>.github.io/<repo-name>"
   ```

2. **Deploy**:
   Run the deploy script:
   ```bash
   npm run deploy
   ```

   This script runs the build process and then pushes the `build` folder to the `gh-pages` branch of your repository.

## Other Hosting Providers

You can deploy the `build` folder to any static site host, such as:

- **Netlify**: Drag and drop the `build` folder or connect your Git repository.
- **Vercel**: Connect your Git repository and it will auto-detect Create React App.
- **Firebase Hosting**: Initialize firebase and deploy the `build` folder.
