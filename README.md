# DiscGolfy

A mobile application for disc golf players to track rounds, courses, and player performance.

## Prerequisites

Before you begin, ensure you have the following installed on your machine:
- Node.js (LTS version recommended)
- npm or yarn
- Supabase CLI (`npm install -g supabase`)
- Android Studio (with an Android Emulator configured)

## Local Development Setup

### 1. Database Setup (Supabase)

This project uses Supabase for the backend. We use the local Supabase CLI for development.

1. Start the local Supabase instance:
   ```bash
   supabase start
   ```
2. The local API URL and anon key will be printed in your terminal. You will need these for the `.env` file.
3. The database schema and initial data (including mock courses and layouts) are automatically applied from the `supabase/migrations` and `supabase/seed.sql` files during startup.

### 2. Environment Variables

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```
2. Open `.env` and fill in the values provided by the `supabase start` command:
   ```env
   EXPO_PUBLIC_SUPABASE_URL="http://127.0.0.1:54321"
   EXPO_PUBLIC_SUPABASE_ANON_KEY="your-anon-key-here"
   ```

### 3. Application Setup

1. Install the dependencies:
   ```bash
   npm install
   ```

### 4. Running the App

To test the application properly, you should run it on an Android Emulator.

1. Open Android Studio and start your configured Android Virtual Device (AVD).
2. Start the Expo development server, clearing the cache and forcing it to connect to the Android emulator over your local network:
   ```bash
   npx expo start -c --android --host lan
   ```

### 5. Creating a Test User

To log in to the application, you need to create a test user in your local Supabase instance.

1. Open the local Supabase Studio dashboard in your browser (usually `http://127.0.0.1:54323`).
2. Navigate to the **Authentication** section -> **Users**.
3. Click **Add User** -> **Create New User**.
4. Enter an email address and a password (e.g., `test@example.com` / `password123`).
5. Ensure "Auto Confirm User?" is checked.
6. Click **Create User**.
7. You can now use these credentials to log in on the app's Login screen.

## Project Structure

- `src/` - Main application source code
  - `components/` - Reusable UI components
  - `screens/` - Main application screens
  - `store/` - Zustand global state management
  - `lib/` - Integrations and utilities (e.g., Supabase client)
  - `theme/` - Global styling constants (colors, typography)
- `supabase/` - Local backend configuration, migrations, and seed data.
- `stitch_course_selection_overlay/` - Reference UI designs and mockups.
