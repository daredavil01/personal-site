# Project Architecture

## Directory Structure

```bash
personal-site/
├── public/                 # Static assets (images, favicon, etc.)
├── src/
│   ├── components/         # Reusable React components
│   ├── data/               # Static data files (JSON/JS objects)
│   ├── layouts/            # Page layout wrappers
│   ├── pages/              # Main page components
│   ├── static/             # Styles (SCSS)
│   └── index.js            # Entry point
├── docs/                   # Project documentation
└── package.json            # Dependencies and scripts
```

### Challenges Hub (`src/pages/Challenges.js`)
The central landing page for all personal and professional challenges. It provides context on my growth journey and links to specific challenge implementations.

- **Sub-pages**: Located in `src/pages/` (e.g., `OneHundredDays.js`)
- **Data Source**: `src/data/` (e.g., `100DaysToOffload.js`)

### Sports Dashboard (`src/pages/Sports.js`)
An interactive dashboard for displaying marathon and race achievements. It features filtering, sorting, and location-based views.

- **Data Source**: `src/data/sports.js`

## Data Management

The application uses static data files located in `src/data/` to populate content. This allows for easy updates without modifying component logic.

- `resume/`: Contains individual files for degrees, positions, courses, etc.
- `sports.js`: Array of race objects.
- `projects.js`: List of projects.
- `routes.js`: Navigation configuration.

## Styling

The project uses SCSS for styling.

- **Main Entry**: `src/static/css/main.scss`
- **Structure**:
    - `base/`: Reset, typography, variables (Stone/Slate palette).
    - `components/`: Component-specific styles.
    - `layout/`: Grid and layout utilities.
- **Theme**: Unified light-mode design focused on readability and premium aesthetics, using Tailwind CSS and custom SCSS.
