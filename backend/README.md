# PocketPlan Backend

Laravel 12 REST API for the PocketPlan mobile app, and (from Phase 3) the admin web dashboard. The data lives in MySQL 8.

## Requirements

- PHP 8.3+ with `pdo_mysql`, `bcmath`, `mbstring`
- Composer 2
- MySQL 8 (two databases: `pocketplan` and `pocketplan_test`)

## First-time setup

```powershell
# 1. Create the databases (or run the same SQL in MySQL Workbench)
& "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u root -p -e "CREATE DATABASE pocketplan CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci; CREATE DATABASE pocketplan_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# 2. Install, create .env, generate the app key, migrate and seed
composer setup
```

Then set `DB_USERNAME` and `DB_PASSWORD` in `.env` and run `php artisan migrate --seed`.

### Create the admin account

Public registration only ever creates students. Admins are created from the command line:

```powershell
php artisan pocketplan:create-admin --email=admin@example.com
```

The command prompts for the password, which must be at least 12 characters with upper case, lower case and a number. You can also set `ADMIN_EMAIL` and `ADMIN_PASSWORD` in `.env` and run the seeder instead. Either way, the admin must change the password at first login, and `ADMIN_PASSWORD` should be removed from `.env` afterwards.

## Daily use

| Command | What it does |
|---|---|
| `composer dev` | Starts the API on `http://0.0.0.0:8000`, reachable from the Android emulator as `http://10.0.2.2:8000` |
| `composer test` | Runs the test suite against `pocketplan_test` |
| `composer lint` | Fixes code style (Laravel Pint) |
| `composer analyse` | Static analysis (Larastan, level 6) |
| `composer check` | Style check, analysis and tests, as in CI |

## Project structure

```
app/
├── Actions/               One class per business operation (handle(): result)
│   ├── Admin/             CreateAdminAccount
│   └── Auth/              RegisterStudent, AuthenticateStudent, IssueMobileToken,
│                          SendPasswordResetLink, ResetStudentPassword
├── Console/Commands/      pocketplan:create-admin
├── Enums/                 UserRole, UserStatus, BudgetStatus, AllowanceFrequency, ...
├── Exceptions/Auth/       Domain exceptions that render their own 403 JSON
├── Http/
│   ├── Controllers/Api/V1/   Thin controllers: validate, call an action, return a resource
│   ├── Middleware/           active, student, admin, password.changed
│   ├── Requests/Api/V1/      Form requests (validation rules)
│   └── Resources/V1/         JSON shapes returned by the API
├── Models/                Eloquent models (typed @property docs, no business logic)
└── Providers/             Rate limiters, password policy, production hardening
database/
├── factories/  migrations/ (one table per file)  seeders/
routes/
├── api.php                Mounts each API version
└── api/v1.php             All /api/v1 routes
tests/
├── Feature/Api/V1/        HTTP tests per feature (Auth/, AccessControlTest)
├── Feature/Console/       Artisan command tests
├── Feature/Database/      Schema constraint tests (MySQL CHECKs, exact money)
└── Unit/                  Model-level tests
```

A request flows through these layers:

```
route → middleware (auth:sanctum, active, student) → FormRequest → Controller → Action → Model
                                                                     ↓
                                                              API Resource → JSON
```

## API conventions

- Base URL: `/api/v1`. Send `Accept: application/json`; the API always answers with JSON.
- Auth: `Authorization: Bearer <token>`. Tokens come from `/register` or `/login` and expire after `MOBILE_TOKEN_TTL_DAYS` days (default 30).
- Success: `{ "data": ... }`. Errors: `{ "message": "...", "errors": { "field": ["..."] } }`.
- Status codes: `401` not signed in, `403` wrong role or deactivated, `404` not found or not yours, `422` validation, `429` rate limited.
- Money is sent as strings with two decimals (`"1350.00"`) and computed with exact decimals on the server.

| Method | Path | Auth |
|---|---|---|
| POST | `/register` | public |
| POST | `/login` | public |
| POST | `/forgot-password` | public |
| POST | `/reset-password` | public |
| POST | `/logout` | student |
| GET | `/me` | student |

See `docs/PLAN.md` in the repository root for the full endpoint plan and the budget calculation rules.

## Security notes

- `role` and `status` are not mass-assignable. Only server code sets them, using `forceFill`.
- Deactivating an account revokes every token on its next request. A password reset signs out all devices.
- Login, registration and password reset are rate limited to 5 per minute per email and IP, and 20 per minute per IP.
- In production, URLs are forced to HTTPS and destructive database commands (`migrate:fresh`, `db:wipe`) are refused.
