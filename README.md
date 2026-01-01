# Coffee Tools

A collection of tools for controlling and monitoring coffee equipment, specifically the Fellow Stagg EKG Pro kettle and Acaia scales.

## Project Structure

- **Coffee Assistant App:** A modern React/Vite/Tailwind web application located in `coffee-assistant-app/`.
- **Stagg App:** A standalone PWA-ready web application for kettle control in `stagg-app/`.

## Getting Started

### Prerequisites

- Python 3.10+
- Node.js & npm (for the modern web app)
- Bluetooth-enabled hardware (MacBook, etc.)

### Modern Web App Setup (Coffee Assistant)

1. Navigate to the app directory:
   ```bash
   cd coffee-assistant-app
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```
   The app will be available at `http://localhost:5173`.

## Features

- **Kettle Control:** Scan, connect, and control temperature, schedules, and hold times for Fellow Stagg EKG Pro.
- **Voice Transcription:** Built-in tool for transcribing brewing notes.

## Development

- `stagg_ekg_pro.py`: Core logic for interacting with the Fellow Stagg EKG Pro via BLE.