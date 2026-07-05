# SieshaApp

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 21.0.2.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Production Deployment (Start Here)

1. Update production backend values in `src/environments/environment.production.ts`:
- `apiBaseUrl`
- `socialAuthUrls.google`

2. Build production assets:

```bash
npm run build:prod
```

3. Deploy generated files from:
- `dist/siesha-app/browser`

Use your preferred static hosting provider (Azure Static Web Apps, Netlify, Vercel, S3 + CloudFront, etc.).

## Docker Deployment

1. Ensure production URLs are set in `src/environments/environment.production.ts`.

2. Build Docker image:

```bash
docker build -t siesha-app:prod .
```

3. Run container:

```bash
docker run -d --name siesha-app -p 8081:80 siesha-app:prod
```

4. Open app at:
- http://localhost:8081

Notes:
- The container serves static Angular files through Nginx.
- SPA routing fallback is configured in `nginx.conf`.

## Running unit tests

To execute unit tests with the [Vitest](https://vitest.dev/) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
