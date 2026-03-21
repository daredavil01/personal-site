# Customization Guide

This guide explains how to update content and customize the look of the website.

## Updating Content

### Resume
To update your resume information, navigate to `src/data/resume/`.

- **Experience**: Edit `positions.js`.
- **Education**: Edit `degrees.js`.
- **Skills**: Edit `skills.js`.
- **Certifications**: Edit `certifications.js`.

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
Global design tokens and brand colors are defined using Tailwind CSS and SCSS variables in `src/static/css/base/_variables.scss`. The project uses a sophisticated **Stone & Slate** palette for a premium editorial feel.

### Typography
The project uses **Inter** (Body) and **Headline** fonts. You can update the typography settings in the SCSS base files.
