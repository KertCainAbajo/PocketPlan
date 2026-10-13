# PocketPlan

A budgeting app for students. PocketPlan turns an allowance into a clear daily budget, so you always know what you can **safely spend today** and your money lasts until the next allowance.

The project has two parts:

| Folder | What it is | Built with |
|---|---|---|
| [`backend/`](backend) | REST API and admin dashboard | Laravel 12, PHP 8.3, MySQL 8, Sanctum |
| [`mobile/`](mobile) | Android and iOS app | Expo SDK 57, React Native, TypeScript, NativeWind |

## Features

- **Daily safe-to-spend limit**, recalculated every day from your budget, what you've spent and the days left.
- **Budgets per allowance period** (daily, weekly, monthly or yearly), split into categories like Food and Transportation.
- **Income and expense tracking** with categories, accounts (cash, bank, e-wallet), payment method, date and time.
- **Savings goals** with contributions, progress and a suggested monthly amount. Unspent allowance rolls into savings when a period ends.
- **Activity** with search, filters and day-by-day totals.
- **Passwordless sign-in**: enter your email, get a 6-digit code, done. No password to remember.
- **App lock**: a 4-digit PIN plus fingerprint (Android) or Face ID (iPhone).
- **Settings**: currency, timezone, notifications, accounts, data export (CSV) and account deletion.

## Getting started

You need **PHP 8.3+**, **Composer 2**, **MySQL 8**, **Node.js 20+** and an Android emulator or a phone with **Expo Go**.

### 1. Backend

```bash
cd backend
composer setup               # install, create .env, app key, migrate and seed
```

Create two MySQL databases, `pocketplan` and `pocketplan_test`, then set `DB_USERNAME` and `DB_PASSWORD` in `backend/.env` and run:

```bash
php artisan migrate --seed
composer dev                 # API on http://0.0.0.0:8000
php artisan schedule:work    # in a second terminal: recurring allowances and cleanup
```

**Sign-in codes are emailed.** By default they are written to `backend/storage/logs/laravel.log` so you can test without email. To send real emails with Gmail, see the comments next to the `MAIL_` settings in [`backend/.env.example`](backend/.env.example).

More detail (admin account, project structure, API reference): [`backend/README.md`](backend/README.md).

### 2. Mobile app

```bash
cd mobile
npm install
cp .env.example .env         # set EXPO_PUBLIC_API_URL
npx expo start
```

- **Android emulator:** `EXPO_PUBLIC_API_URL=http://10.0.2.2:8000/api/v1`, or run `npm run emulator` to connect the emulator to your PC directly.
- **Physical phone:** use your PC's local IP, e.g. `http://192.168.1.10:8000/api/v1`, and start the API with `php artisan serve --host=0.0.0.0`.

Press `a` in the Expo terminal to open the app on Android.

## Checks

| | Command |
|---|---|
| Backend tests | `cd backend && composer test` |
| Backend style + static analysis + tests | `cd backend && composer check` |
| Mobile type check | `cd mobile && npm run typecheck` |
| Mobile lint | `cd mobile && npm run lint` |

## Documentation

- [`docs/PLAN.md`](docs/PLAN.md): endpoint plan and budget calculation rules
- [`docs/GOOGLE_SIGN_IN.md`](docs/GOOGLE_SIGN_IN.md): Google sign-in setup (currently not used by the app)
- [`backend/README.md`](backend/README.md): backend setup, structure and API conventions
