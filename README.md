# Pétanque Manager

Pétanque Manager is a small web application used to manage a pétanque tournament. It is built with [React](https://reactjs.org/), [TypeScript](https://www.typescriptlang.org/) and [Vite](https://vitejs.dev/).

## Prerequisites

- [Node.js](https://nodejs.org/) (version 18 or later)
- [npm](https://www.npmjs.com/) which comes bundled with Node.js

## Installation

Install the project dependencies:

```bash
npm install
```

This command installs all dependencies, including linting packages such as
`@eslint/js`. Alternatively, you can run `./setup.sh` to perform the same
setup automatically. Run either of these commands **before** executing
`npm run lint` so that the linter and its plugins are available.

## Development

Start a development server with hot reloading:

```bash
npm run dev
```

Open `http://localhost:5173` in your browser to view the application.

## Building

Create an optimized production build:

```bash
npm run build
```

You can preview the build locally with:

```bash
npm run preview
```

## Linting

Run the linter to check for code style issues:

```bash
npm run lint
```

## Project structure

The main source code lives in the `src` directory:

```
src/
├── App.tsx            # Application root component
├── main.tsx           # Entry point
├── index.css          # Global styles
├── components/        # Reusable React components
├── hooks/             # Custom React hooks
├── types/             # TypeScript type definitions
└── utils/             # Utility functions
```

To start the application in development mode run `npm run dev` as shown above.

## Theme toggle

The header provides a moon/sun button that switches between light and dark
themes. This preference is saved in the browser so it persists across reloads.

An additional palette icon lets you enable the **Cyber Blue** look. When
activated it swaps the `theme-style` link in `index.html` to load
`public/theme-cyber-blue.css` and stores the choice in local storage so your
browser remembers the style. The default stylesheet is
`public/theme-default.css`.

