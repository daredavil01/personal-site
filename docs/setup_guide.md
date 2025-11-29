# Installation & Setup Guide

## Prerequisites

Before you begin, ensure you have the following installed on your machine:

- **Node.js**: v14 or higher. You can download it from [nodejs.org](https://nodejs.org/).
- **npm** (Node Package Manager) or **yarn**.

## Getting Started

Follow these steps to get the project running locally:

### 1. Clone the Repository

```bash
git clone https://github.com/daredavil01/personal-site.git
cd personal-site
```

### 2. Install Dependencies

Install the necessary packages using npm:

```bash
npm install
```

Or if you prefer yarn:

```bash
yarn install
```

### 3. Start Development Server

Run the app in development mode:

```bash
npm start
```

Open [http://localhost:3000](http://localhost:3000) to view it in your browser. The page will reload when you make changes.

## Troubleshooting

### Common Issues

- **`npm install` fails**: Ensure you have the correct Node.js version. Try deleting `node_modules` and `package-lock.json` and running `npm install` again.
- **Port 3000 is busy**: React will ask if you want to run on a different port. Confirm with `Y`.

## Building for Production

To build the app for production to the `build` folder:

```bash
npm run build
```

It correctly bundles React in production mode and optimizes the build for the best performance.
