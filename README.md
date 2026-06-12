# Personal Website

A modern, responsive personal portfolio website built with React.js featuring interactive components, dark mode support, and a comprehensive showcase of professional experience, projects, and achievements.

## 📚 Documentation

Detailed documentation is available in the `docs/` folder:

- [**Setup Guide**](docs/setup_guide.md): Installation, prerequisites, and troubleshooting.
- [**Architecture**](docs/architecture.md): Project structure, key components, and data management.
- [**Customization**](docs/customization.md): How to update content (resume, sports, projects) and styling.
- [**Deployment**](docs/deployment.md): Building for production and deploying to Cloudflare Pages.
- [**Contributing**](docs/contributing.md): Guidelines for contributing to the project.

## 🚀 Quick Start

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd personal-site
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start development server**
   ```bash
   npm start
   ```

## 🛠️ Scripts

| Command | Description |
|---|---|
| `npm start` | Start the development server |
| `npm run build` | Build for production (runs `cms:sync` first via `prebuild`) |
| `npm run lint` | Run ESLint across the project |
| `npm test` | Run the Jest test suite |
| `npm run cms:sync` | Regenerate `src/data/*.js` from `src/cms-content/` markdown |
| `npm run cms:server` | Local Decap CMS proxy for editing content at `/cms/` in dev |

## 📄 License

This project is open source and available under the [MIT License](LICENSE).
