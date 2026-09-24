# My Family's Budget

App Description & Objectives: I am building a mobile-first web app to track my family's daily food and supermarket expenses to stop budget leaks.

Target Users: A family of 4. Admin (me) logs the expenses. Viewers (family members) can only view the dashboard.

What to Build (Phase 1):

Pages: Login Page, Main Dashboard, Log Expense Form.

Data Mapping:

Dashboard: KPI cards (Current week/month spent), a Budget Cap progress bar (e.g., 4000 EGP limit), and a simple bar chart (spending by day).

Log Form: Amount (Number), Restaurant/Store Name (Text), Category (Dropdown: غداء, سوبر ماركت, أخرى), Date (Picker), optional Image Upload.

Backend Logic: Integrate with Supabase. Set up Auth (Email/Password), an expenses table, and basic RLS policies restricting write access to the Admin role. Standard fetch on page load.

What NOT to Build (Out of Scope): Do not build the food recommendation engine or mood tags yet. No real-time Supabase subscriptions (polling on load is fine). No OCR or complex image processing.

Design Direction: Strict RTL (Right-to-Left) layout using friendly Egyptian Arabic text. Mobile-first responsive design using Tailwind CSS. Use clean, soft neutral colors with clear visual hierarchy.

Core Features (By Priority):

Supabase Auth with Admin/Viewer roles.

CRUD operations for the expense form.

Live Dashboard with KPI cards and a budget progress bar.

Sample Data & States:

Loading: Use modern skeleton loaders.

Empty State: Display "لسه مصممين نوفر.. مفيش مصاريف اتسجلت" with a clean illustration.

Sample Data: Amount: 350, Store: Hadhramout, Category: غداء, Date: Today.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/341c5ec4-363d-4ff4-a036-ca03a5bb06c6).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
