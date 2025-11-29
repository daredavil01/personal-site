# Customization Guide

This guide explains how to update content and customize the look of the website.

## Updating Content

### Resume
To update your resume information, navigate to `src/data/resume/`.

- **Experience**: Edit `positions.js`.
- **Education**: Edit `degrees.js`.
- **Skills**: Edit `skills.js`.
- **Certifications**: Edit `courses.js`.

### Sports/Races
To add a new race, open `src/data/sports.js` and add a new object to the array:

```javascript
{
  title: "New Marathon Name",
  distance: "42.2 km",
  time: "3:45:00",
  date: "2025-10-15",
  image: "/images/sports/new-race.jpg", // Add image to public/images/sports/
  link: "https://strava.com/activity/..."
}
```

### Projects
To add a new project, edit `src/data/projects.js`.

## Adding Images

Place new images in the `public/images/` directory. Organize them into subfolders (e.g., `sports`, `projects`) to keep things tidy.

## Styling Customization

### Changing Colors
Global color variables are defined in `src/static/css/base/_variables.scss` (or similar base file). Update these variables to change the color scheme.

### Dark Mode
Dark mode styles are primarily handled by CSS variables. Look for the `.dark-mode` selector in your SCSS files to adjust dark theme specific styles.
