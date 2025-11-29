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

## Key Components

### ResumeV2 (`src/components/Resume/ResumeV2.js`)
This is the core component for the interactive resume page. It manages the state for different sections (Experience, Education, Skills, etc.) and handles the welcome animation.

- **Sub-components**: Located in `src/components/Resume/ResumeV2/`
- **Data Source**: `src/data/resume/`

### SportsV2 (`src/components/Sports/SportsV2.js`)
The interactive dashboard for displaying marathon and race achievements.

- **Features**: Filtering, Sorting, Search, Timeline View.
- **Data Source**: `src/data/sports.js`

### Dark Mode Toggle (`src/components/Template/DarkModeToggle.js`)
Manages the application-wide theme state. It uses local storage to persist the user's preference.

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
    - `base/`: Reset, typography, variables.
    - `components/`: Component-specific styles.
    - `layout/`: Grid and layout utilities.
- **Dark Mode**: Implemented via CSS variables and the `.dark-mode` class on the body.
