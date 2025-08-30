# Personal Website

A modern, responsive personal portfolio website built with React.js featuring interactive components, dark mode support, and a comprehensive showcase of professional experience, projects, and achievements.

## 🚀 Features

- **Dark Mode Support**: Toggle between light and dark themes with system preference detection
- **Interactive Resume**: Professional resume with interactive navigation and statistics
- **Sports Dashboard**: Interactive marathon achievements with filtering and visualization
- **Responsive Design**: Optimized for all devices and screen sizes
- **Modern UI/UX**: Clean, professional design with smooth animations
- **Performance Optimized**: Fast loading with code splitting and optimization

## 🛠️ Tech Stack

- **Frontend**: React.js, JavaScript (ES6+)
- **Styling**: SCSS, CSS Variables, Responsive Design
- **Build Tool**: Create React App
- **Deployment**: Static hosting ready

## 📦 Installation & Setup

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn

### Getting Started

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

4. **Build for production**

   ```bash
   npm run build
   ```

## 📁 Project Structure

```bash
personal-site/
├── public/
│   ├── images/
│   │   ├── sports/          # Marathon and race images
│   │   ├── projects/        # Project screenshots
│   │   └── favicon/         # Website icons
│   ├── index.html
│   └── robots.txt
├── src/
│   ├── components/
│   │   ├── Resume/
│   │   │   ├── ResumeV2.js              # Interactive resume component
│   │   │   └── ResumeV2/                # Resume sub-components
│   │   │       ├── EducationV2.js
│   │   │       ├── ExperienceV2.js
│   │   │       ├── SkillsV2.js
│   │   │       └── CertificationV2.js
│   │   ├── Sports/
│   │   │   ├── Sports.js                 # Main sports page
│   │   │   ├── SportsV2.js              # Interactive sports dashboard
│   │   │   └── SportV2.js               # Individual race cards
│   │   ├── Template/
│   │   │   ├── Navigation.js            # Top navigation
│   │   │   ├── SideBar.js               # Left sidebar
│   │   │   └── DarkModeToggle.js        # Dark mode toggle
│   │   └── Instagram/
│   │       └── ImageSlider.js           # Image gallery component
│   ├── data/
│   │   ├── resume/                       # Resume data files
│   │   ├── sports.js                     # Marathon data
│   │   ├── projects.js                   # Project information
│   │   └── routes.js                     # Navigation routes
│   ├── layouts/
│   │   └── Main.js                       # Main layout wrapper
│   ├── pages/
│   │   ├── Resume.js                     # Resume page
│   │   ├── Sports.js                     # Sports page
│   │   ├── Projects.js                   # Projects page
│   │   └── ...                          # Other pages
│   ├── static/
│   │   └── css/
│   │       ├── main.scss                 # Main stylesheet
│   │       ├── base/                     # Base styles
│   │       ├── components/               # Component styles
│   │       └── layout/                   # Layout styles
│   └── index.js                          # App entry point
├── package.json
└── README.md
```

## 🎨 Key Components

### Dark Mode Toggle

- **Location**: Top-right corner of every page
- **Features**: System preference detection, localStorage persistence
- **Icons**: Sun (☀️) for light mode, Moon (🌙) for dark mode

### Interactive Resume (ResumeV2)

- **Statistics Dashboard**: Experience, Education, Certifications, Skills count
- **Navigation**: Overview, Experience, Education, Skills, Certifications
- **Welcome Animation**: Confetti effect and welcome popup
- **Responsive Design**: Optimized for mobile and desktop

### Sports Dashboard (SportsV2)

- **Interactive Filtering**: Search, distance, year, and sorting options
- **View Modes**: Cards view and Timeline view
- **Statistics**: Total races, distance, and average pace
- **Race Cards**: Expandable cards with images and performance metrics

## 🎯 Customization

### Adding New Content

1. **Resume Data**: Update files in `src/data/resume/`
2. **Sports Data**: Add race information to `src/data/sports.js`
3. **Projects**: Update `src/data/projects.js`
4. **Images**: Add to appropriate folders in `public/images/`

### Styling

- **Main Styles**: Edit `src/static/css/main.scss`
- **Dark Mode**: CSS variables in `.dark-mode` class
- **Responsive**: Media queries for different screen sizes

## 🚀 Deployment

The project builds to a static folder ready for deployment:

```bash
npm run build
```

## 📱 Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
- Mobile browsers

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

---

## Changelog:

## 30th August, 2025

### 🎨 Major Features Added

- **Dark Mode Support**: Complete dark theme implementation with toggle button
  - CSS variables for consistent theming
  - System preference detection
  - Local storage persistence
  - Toggle button in top-right corner (sun/moon icons)
  - Comprehensive dark mode styles for all components

#### 🏃‍♂️ Sports Page Enhancements

- **Sports Page Version 2**: Interactive dashboard for marathon achievements
  - Interactive filtering and sorting capabilities
  - Search functionality for races
  - Cards and Timeline view modes
  - Statistics dashboard (total races, distance, average pace)
  - Individual race cards with expandable details
  - Image galleries for each race
  - Progress bars and performance metrics
  - Responsive design for all screen sizes

### 💼 Resume Page Improvements

- **Resume Page Version 2**: Interactive professional resume
  - Interactive navigation between sections
  - Statistics overview (experience, education, certifications, skills)
  - Welcome popup with confetti animation
  - Smooth transitions and animations
  - Professional gradient designs
  - Responsive layout for mobile and desktop

### 🎉 Interactive Features

- **Confetti Animations**: Welcome effects on interactive pages
  - Page-level confetti for Resume and Sports sections
  - Colorful particle animations
  - Automatic cleanup and performance optimization
- **Welcome Popups**: Engaging user introductions
  - Professional messaging
  - Call-to-action buttons
  - Smooth fade-in/out animations

### 🎨 UI/UX Improvements

- **Layout Optimization**: Full-width design without white borders
  - Proper padding and spacing
  - Responsive design across all devices
  - Maintained sidebar and main content alignment
  - Professional spacing and typography

### 🔧 Technical Enhancements

- **Component Architecture**: Modular component structure
  - Reusable dark mode components
  - CSS class-based styling for better maintainability
  - Inline style overrides for dark mode compatibility
  - Performance optimizations

### 📱 Responsive Design

- **Mobile Optimization**: Enhanced mobile experience
  - Touch-friendly interface elements
  - Optimized layouts for small screens
  - Proper spacing and typography scaling
  - Smooth animations on mobile devices

### 🎯 Accessibility Features

- **ARIA Labels**: Proper accessibility support
  - Screen reader compatibility
  - Keyboard navigation support
  - High contrast mode support
  - Semantic HTML structure
