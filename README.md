# Coffee Tools - Development Guide

The project has been unified into a monorepo structure. This guide explains how to develop locally.

## Development Server

To start all applications simultaneously, run the following from the root:

```bash
npm run dev
```

This will start:
- **Landing Page**: http://localhost:5173/coffee-tools/
- **Coffee Assistant**: http://localhost:5174/coffee-tools/coffee_assistant/
- **Stagg Controller**: http://localhost:5175/coffee-tools/stagg/

### Unified Experience
The **Landing Page** (port 5173) is configured to proxy the other applications. You can access everything through a single entry point:
👉 **[http://localhost:5173/coffee-tools/](http://localhost:5173/coffee-tools/)**

## Project Structure

- `apps/landing`: Unified splash page.
- `apps/assistant`: Gemini-powered coffee assistant.
- `apps/stagg`: Kettle controller.

## Deployment

Deployments are handled automatically via GitHub Actions whenever changes are pushed to `main`.