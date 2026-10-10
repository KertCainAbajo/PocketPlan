# PocketPlan — Phase 1 Plan

Status: approved baseline for Phases 2–8. Update this file when a decision changes.

## 0. Environment found (2026-10-10)

| Tool | Version | Notes |
|---|---|---|
| PHP | 8.5.1 (`C:\php84\php.ini`) | pdo_mysql, bcmath, mbstring, openssl, sqlite present |
| Composer | 2.8.12 | |
| Node / npm | 25.2.1 / 11.6.2 | |
| MySQL | 8.0.46, Windows service `MySQL80` (running) | `mysql.exe` not on PATH: `C:\Program Files\MySQL\MySQL Server 8.0\bin` |
| Git | 2.53 | repo contained only `README.md` |

---

## 1. System architecture

```
┌──────────────────────────┐        HTTPS / JSON         ┌───────────────────────────────────────┐
│  mobile/ (Expo, RN, TS)  │ ──────────────────────────▶ │  backend/ (Laravel 12)                 │
│  Expo Router screens     │   Authorization: Bearer     │                                       │
│  TanStack Query + Axios  │   <Sanctum token>           │  routes/api.php  → /api/v1/*           │
│  SecureStore (token)     │                             │    auth:sanctum + active + student     │
└──────────────────────────┘                             │    Api\V1 controllers → Services       │
                                                         │                                       │
┌──────────────────────────┐   Session cookie + CSRF     │  routes/web.php  → /admin/*            │
│  Browser (Admin)         │ ──────────────────────────▶ │    auth:web + active + admin           │
│  Blade + CSS vars + JS   │                             │    Admin controllers → Blade views     │
└──────────────────────────┘                             │                                       │
                                                         │  Services: BudgetCalculator,           │
                                                         │  BudgetService, InsightService,        │
                                                         │  ReportService, AuditLogger            │
                                                         │  Scheduler: budget expiry, reminders   │
                                                         └──────────────────┬────────────────────┘
                                                                            │ Eloquent / PDO
                                                                   ┌────────▼────────┐
                                                                   │   MySQL 8       │
                                                                   └─────────────────┘
```

Key principles

- **The backend calculates everything.** The mobile app only sends raw inputs (amount, date, category). It never sends totals, balances or the `budget_id` an expense belongs to.
- **There is one Laravel app with two entry surfaces.** The stateless token API serves Students, and the session web UI serves Admins. Both use the same `users` table and are separated by `role`.
- **Money is exact.** Columns are `DECIMAL(12,2)`, and arithmetic uses `brick/math` `BigDecimal`. Nothing is computed with floats on the server. The API returns money as **strings** (`"1350.00"`) so that JS never re-rounds it.
- **Dates use the student's timezone.** Each user has `timezone` (default `Asia/Manila`). "Today" is always resolved in that zone. Expense dates are `DATE` (calendar day), not timestamps, which avoids UTC day-boundary bugs.

---

## 2. Folder structure

```
PocketPlan/
├── docs/PLAN.md
├── backend/                               Laravel 12
│   ├── app/                               (see backend/README.md for the current layout)
│   │   ├── Actions/{Auth,Admin,...}/      one class per business operation; controllers stay thin
│   │   ├── Enums/                         UserRole, UserStatus, BudgetStatus, AllowanceFrequency, PaymentMethod
│   │   ├── Exceptions/                    domain exceptions that render their own JSON
│   │   ├── Http/
│   │   │   ├── Controllers/
│   │   │   │   ├── Api/V1/                Auth/{Register,Login,Logout,ForgotPassword,ResetPassword}Controller,
│   │   │   │   │                          ProfileController, then Onboarding, Budget, Expense, Category,
│   │   │   │   │                          Dashboard, Report, Insight, SavingsGoal, Notification controllers
│   │   │   │   └── Admin/                 Auth, Dashboard, User, Category, AuditLog, Profile controllers
│   │   │   ├── Middleware/                EnsureAccountActive, EnsureStudent, EnsureAdmin, EnsurePasswordChanged
│   │   │   ├── Requests/{Api/V1,Admin}/   FormRequest validation per action
│   │   │   └── Resources/V1/              JSON API resources (UserResource, AuthTokenResource, BudgetResource, ...)
│   │   ├── Models/                        typed @property docs; no business logic
│   │   ├── Policies/                      BudgetPolicy, ExpensePolicy, SavingsGoalPolicy, ...
│   │   ├── Services/                      BudgetCalculator (pure math), ReportService, InsightService, AuditLogger
│   │   ├── Notifications/                 DailySpendingWarning, BudgetThresholdReached, ...
│   │   └── Console/Commands/              CreateAdminCommand (pocketplan:create-admin), CompleteExpiredBudgets, ...
│   ├── database/{migrations (one table per file),factories,seeders}/
│   ├── resources/views/admin/             layouts/, auth/, dashboard, users/, categories/, audit-logs/, profile/
│   ├── public/admin/{admin.css,admin.js}  CSS variables = official palette; no build step
│   ├── routes/{api.php → api/v1.php, web.php, console.php}
│   └── tests/{Unit,Feature/Api/V1,Feature/Admin,Feature/Database,Feature/Console}/
└── mobile/                                Expo (TypeScript, Expo Router)
    ├── app/                               file-based routes (see §13 mapping below)
    │   ├── _layout.tsx                    providers: QueryClient, Paper, auth bootstrap
    │   ├── index.tsx                      splash/redirect
    │   ├── (auth)/                        welcome, login, register, forgot-password, reset-password
    │   ├── (onboarding)/                  multi-step onboarding
    │   └── (app)/                         protected group
    │       ├── (tabs)/                    home, expenses, reports, budgets, profile
    │       ├── expenses/[id].tsx, expenses/new.tsx, expenses/[id]/edit.tsx
    │       ├── budgets/new.tsx, budgets/[id].tsx, budgets/[id]/edit.tsx
    │       ├── insights.tsx, savings/…, notifications.tsx, settings.tsx
    ├── components/ui/                     Button, Card, MoneyText, StatusBadge, EmptyState, ErrorState, …
    ├── features/<domain>/                 api.ts (query/mutation hooks), schemas.ts (zod), components/
    ├── lib/                               api-client.ts (axios), query-client.ts, secure-store.ts, money.ts
    ├── store/auth-store.ts                Zustand: token + current user
    ├── theme/colors.ts                    official palette (single source)
    ├── types/api.ts                       response types
    └── tests/
```

The Admin dashboard lives **inside `backend/`**, as Blade views and controllers. It is not a third project.

---

## 3. Database tables and relationships

```
users 1───* budgets 1───* expenses *───1 expense_categories
  │                         ▲                 (user_id NULL = default category,
  │ 1───* expenses ─────────┘                  user_id set  = student's personal category)
  │ 1───* savings_goals 1───* savings_contributions
  │ 1───1 notification_preferences
  │ 1───* notifications (Laravel database notifications, morph notifiable)
  │ 1───* personal_access_tokens (Sanctum)
  └ 1───* admin_audit_logs (as admin_id)
```

| Table | Columns (main) | Keys / indexes / rules |
|---|---|---|
| `users` | id, name, email, password, `role` ENUM('student','admin') default 'student', `status` ENUM('active','deactivated') default 'active', currency CHAR(3) default 'PHP', timezone default 'Asia/Manila', onboarded_at, must_change_password BOOL, last_login_at, deactivated_at, timestamps | unique(email), index(role,status). `role`/`status` are **not** mass-assignable |
| `budgets` | id, user_id FK, name, total_allowance DEC(12,2), savings_target DEC(12,2) default 0, start_date DATE, end_date DATE, frequency ENUM('daily','weekly','monthly','custom'), status ENUM('active','completed'), completed_at, timestamps | FK cascade on user delete. index(user_id,status), index(user_id,start_date,end_date). CHECK end_date ≥ start_date, total_allowance ≥ 0, savings_target ≤ total_allowance. **No overlapping date ranges per user** (service-level, in a locked transaction) |
| `expense_categories` | id, user_id FK NULL, name, description, icon, color, is_active, timestamps | Default categories have user_id NULL. Unique name per scope is enforced in validation, because MySQL unique indexes treat NULLs as distinct. Deactivating hides a category from pickers but keeps history |
| `expenses` | id, user_id FK, budget_id FK NULL, category_id FK, amount DEC(12,2), description, notes TEXT NULL, payment_method ENUM NULL ('cash','gcash','maya','card','bank_transfer','other'), spent_on DATE, timestamps | CHECK amount > 0. FK category **restrict** (categories are never hard-deleted). index(user_id,spent_on), index(budget_id,spent_on), index(user_id,category_id) |
| `savings_goals` | id, user_id FK, name, target_amount DEC(12,2), target_date DATE NULL, status ENUM('active','achieved','archived'), timestamps | CHECK target_amount > 0 |
| `savings_contributions` | id, savings_goal_id FK, user_id FK, amount DEC(12,2) (negative = withdrawal), contributed_on DATE, note, timestamps | saved amount = SUM(amount), never below 0 |
| `notification_preferences` | id, user_id FK unique, daily_warning, threshold_alert, budget_ending, budget_completed, daily_reminder (BOOLs), reminder_time TIME, warning_threshold_percent TINYINT default 80 | Created with defaults on registration |
| `notifications` | Laravel standard (uuid, type, notifiable_*, data JSON, read_at) | Serves as `personal_notifications`. Data never contains secrets |
| `admin_audit_logs` | id, admin_id FK, action, subject_type, subject_id, metadata JSON, ip_address, user_agent, created_at | index(admin_id,created_at), index(subject_type,subject_id). Append-only, with no update/delete routes |
| Framework | `personal_access_tokens`, `password_reset_tokens`, `sessions`, `cache`, `jobs`, `failed_jobs` | Laravel defaults |
| Phase 6 (only if push is done) | `device_push_tokens` (user_id, expo_token, platform, last_used_at) | |

**How an expense finds its budget.** The client never sends `budget_id`. The server assigns the user's budget whose `[start_date, end_date]` contains `spent_on`, or NULL if there is none. Because one user's ranges never overlap, the match is unique. `budget_id` is re-resolved when an expense date changes, when a budget is created (orphans in range are adopted), and when a budget's dates change or it is completed early.

**Deletes.** Students cannot delete accounts or budgets in v1. Budgets are completed, not deleted, to preserve history. Expenses and savings goals are hard-deleted by their owner. Admins never hard-delete users; they deactivate them, and financial records are preserved.

---

## 4. Permissions matrix

| Capability | Student | Admin | Guest |
|---|---|---|---|
| Register via `/api/v1/register` (always role=student) | — | — | ✅ |
| Log in to the mobile API | ✅ (active only) | ❌ 403 "Use the admin dashboard" | — |
| Log in to `/admin` | ❌ (rejected with the same generic error) | ✅ (active only) | — |
| Own budgets / expenses / goals / notifications: CRUD | ✅ own only (others → 404) | ❌ (no routes exist) | ❌ |
| Personal categories | ✅ own | ❌ | ❌ |
| Default categories: read active | ✅ | ✅ (all, including inactive) | ❌ |
| Default categories: create/edit/(de)activate | ❌ | ✅ (audited) | ❌ |
| Platform aggregate stats (counts/sums) | ❌ | ✅ | ❌ |
| List/search users, see account metadata | ❌ | ✅ (name, email, status, dates, counts only) | ❌ |
| Deactivate/reactivate users | ❌ | ✅ (audited, revokes tokens, cannot target self or another admin) | ❌ |
| View a student's expenses/balances/goals | ❌ others' | ❌ **by default, with no route** | ❌ |
| Audit logs | ❌ | ✅ read-only | ❌ |
| Create an Admin | ❌ | ❌ (only `php artisan pocketplan:create-admin` / seeder using env vars) | ❌ |

Enforcement layers: route middleware (`auth:sanctum`, `active`, `student` / `auth`, `active`, `admin`) → Policies (ownership) → scoped queries (`$request->user()->expenses()`), so a foreign ID returns 404 and never leaks that the record exists.

---

## 5. API endpoint plan (`/api/v1`, JSON)

Response envelope: success `{ "data": ..., "meta": {...}? }`, error `{ "message": "...", "errors": {field: [..]}? }`. Status codes: 200/201/204, 401 unauthenticated, 403 forbidden or deactivated, 404 not found or not yours, 409 conflict (overlapping budget), 422 validation, 429 rate limited.

| Method | Path | Notes |
|---|---|---|
| POST | /register | throttle 5/min. Returns `{token, user}` |
| POST | /login | throttle 5/min per email+IP. Rejects admin and deactivated accounts |
| POST | /logout | Deletes the current token |
| GET | /me | User + onboarding state |
| POST | /forgot-password | Always 200 (no user enumeration) |
| POST | /reset-password | email + token + password. Revokes all tokens |
| POST | /onboarding | currency, allowance, frequency, start date, duration, optional savings goal. Creates the first budget in a transaction |
| PUT | /profile, PUT /profile/password | Extra endpoints needed by the Profile and Settings screens |
| GET/PUT | /notification-preferences | Extra |
| GET | /categories | Active defaults + own personal categories |
| POST/PUT | /categories, /categories/{id} | Personal categories (own only) |
| GET | /budgets | `?status=active\|completed`, paginated, includes computed summary |
| POST | /budgets | 409 on overlap |
| GET | /budgets/{id} | Summary + calculation breakdown |
| PUT | /budgets/{id} | Active budgets only. Re-resolves expenses |
| POST | /budgets/{id}/complete | Optional `end_date` (≥ start, ≤ today) to close early |
| GET | /expenses | `?search=&category_id=&from=&to=&budget_id=&sort=newest\|oldest&page=` |
| POST | /expenses | Returns the expense plus the refreshed budget summary |
| GET/PUT/DELETE | /expenses/{id} | |
| GET | /dashboard | greeting name, active budget summary, today, status, recent 5, category breakdown, top insight |
| GET | /reports/summary | `?period=day\|week\|month&date=`: totals, allocated, remaining, savings progress, period comparison |
| GET | /reports/categories | `?from=&to=` |
| GET | /reports/trends | `?from=&to=` daily series (zero-filled) |
| GET | /insights | Rule-based list `{type, severity, message, data}` |
| GET/POST | /savings-goals | |
| GET/PUT/DELETE | /savings-goals/{id} | GET is extra, needed by the detail screen |
| POST | /savings-goals/{id}/contributions | Extra: deposit or withdrawal. Not an expense |
| GET | /notifications | Paginated, `unread_count` in meta |
| POST | /notifications/{id}/read | Also `POST /notifications/read-all` (extra) |

---

## 6. Admin web route plan (`routes/web.php`, prefix `/admin`, name `admin.`)

| Method | Path | Middleware | Purpose |
|---|---|---|---|
| GET/POST | /admin/login | guest, throttle 5/min | Session login (role=admin & active only). Audited |
| POST | /admin/logout | auth | Invalidate session + regenerate CSRF token |
| GET | /admin | auth, active, admin, pw-changed | Dashboard stats + registration chart |
| GET | /admin/users | 〃 | search `q`, filter `status`, paginated |
| GET | /admin/users/{user} | 〃 | Account metadata and record *counts*, with no amounts |
| POST | /admin/users/{user}/deactivate | 〃 | Confirm dialog, audited, revokes tokens + sessions |
| POST | /admin/users/{user}/reactivate | 〃 | Audited |
| GET | /admin/categories | 〃 | List with status filter |
| GET/POST | /admin/categories/create, /admin/categories | 〃 | Unique name |
| GET/PUT | /admin/categories/{c}/edit, /admin/categories/{c} | 〃 | Audited |
| POST | /admin/categories/{c}/toggle | 〃 | Activate/deactivate. Audited |
| GET | /admin/audit-logs | 〃 | Filter by action/date, paginated |
| GET | /admin/profile | 〃 | Profile + my recent actions |
| GET/PUT | /admin/settings, /admin/settings/password | auth, active, admin | Password change. Also the forced first-login change |

`pw-changed` middleware: if `must_change_password` is true, every admin page redirects to `/admin/settings` until the password is changed.

---

## 7. Budget calculation rules

All values are computed by `App\Services\BudgetCalculator` (pure, unit-tested) for a given budget and `today` (in the user's timezone).

```
spendable           = total_allowance − savings_target           (money reserved for savings is not spendable)
spent_total         = Σ expenses.amount where budget_id = B
spent_before_today  = Σ expenses where spent_on < today
spent_today         = Σ expenses where spent_on = today
remaining_balance   = spendable − spent_total                     (can be negative = overspent)
total_days          = end_date − start_date + 1                   (inclusive)
days_remaining      = today < start → total_days
                      start ≤ today ≤ end → end_date − today + 1  (INCLUDES today)
                      today > end → 0
daily_target        = max(0, spendable − spent_before_today) ÷ days_remaining   (if days_remaining > 0)
today_remaining     = daily_target − spent_today                  (negative = today's overage)
initial_daily       = spendable ÷ total_days
```

**Why `daily_target` excludes today's spending.** If today's purchases reduced the target, it would fall every time the student spends, and "today's remaining" would be meaningless. The target is fixed at the start of each day and recalculated tomorrow.

The spec example fits these rules. A ₱2,000 budget over 7 days gives an initial daily of 285.71. Suppose ₱650 was spent before today and 5 days remain, including today. The daily target is 1,350 ÷ 5 = **270.00**. If the student spends ₱300 today, that is an overage of ₱30 against today's target. `remaining_balance` becomes ₱1,050, and the status is Over Budget for *today* only. It does not mean the allowance is exhausted.

**Daily status** (`threshold` = user's `warning_threshold_percent`, default 80):
- `safe`: spent_today < threshold% × daily_target
- `watch`: threshold% × daily_target ≤ spent_today ≤ daily_target
- `over`: spent_today > daily_target

**Budget state flags**, reported separately from the daily status:
- `upcoming`: today < start. No expenses can belong to it yet. Status is `safe`, and the target shown is `initial_daily`.
- `active`
- `ended`: today > end_date while the status is still active. The dashboard prompts to complete it, and the nightly `budgets:complete-expired` command completes it automatically.
- `completed`
- `overspent`: remaining_balance < 0
- `exhausted`: spendable − spent_before_today ≤ 0. The daily target is 0. Any spending today is `over`, and with no spending today the status is `watch`.

**Edge cases**

| Case | Behaviour |
|---|---|
| total_allowance = 0 | Allowed. Target 0. Any spend → over |
| days_remaining = 0 (ended) | daily_target = null, status `ended`, no division |
| Expense outside any budget | Saved with budget_id NULL. Shown in history and reports as "Unbudgeted" |
| Expense dated in the future | Rejected (422): `spent_on` must be ≤ today in the user's timezone |
| Overlapping budget | 409 with the conflicting budget's dates |
| Edit allowance below spent | Allowed. Result is overspent (negative remaining) |
| Shrinking dates excludes existing expenses | Those expenses become unbudgeted (re-resolved in a transaction) |
| Complete early | `end_date` defaults to today, or a client-chosen date in [start, today]. Expenses after it are re-resolved |
| Rounding | Internal scale 4, ROUND_HALF_UP to 2 decimals at the output boundary |
| Timezone | `today = now($user->timezone)->toDateString()` |
| Concurrency | Budget create/update/complete run in a DB transaction with `lockForUpdate()` on the user row to serialise the overlap check |

**Pace insight.** `avg_daily = spent_total ÷ elapsed_days` (elapsed = days from start through today). If avg_daily × total_days > spendable, then the projected run-out date is start + floor(spendable ÷ avg_daily) days, and the warning reads "may run out early".

**Savings rule.** A budget's `savings_target` reserves money: it lowers `spendable`, and it is never an expense. Contributions to a savings goal are recorded only in `savings_contributions` and **never** affect budget math. So money is either reserved through savings_target or spent through expenses, never both. Goal progress = Σ contributions ÷ target_amount.

**Reports, allocated vs received.** Reports label `total_allowance` as **"Allocated"**. The app does not track receipt of money in v1, and no report claims "income".

---

## 8. Color theme implementation

One palette, defined twice with identical values. A test asserts that the two stay in sync.

`mobile/theme/colors.ts`
```ts
export const colors = {
  primary: '#243B6B', accent: '#6C7CF7', accentLight: '#EEF0FF',
  background: '#F7F8FC', card: '#FFFFFF',
  text: '#202534', textSecondary: '#687086',
  positive: '#DDF7E8', positiveText: '#166534',   // readable green on the positive bg
  warning: '#F59E0B', warningText: '#92400E', warningBg: '#FEF3C7',
  error: '#DC2626', errorBg: '#FEE2E2',
  border: '#E5E7EB',
} as const;
```
This file is consumed by `tailwind.config.js` (NativeWind `theme.extend.colors`), by the React Native Paper `MD3LightTheme` override (primary/secondary/error/background/surface/outline), and by the chart props.

`backend/public/admin/admin.css`
```css
:root {
  --pp-primary:#243B6B; --pp-accent:#6C7CF7; --pp-accent-light:#EEF0FF;
  --pp-bg:#F7F8FC; --pp-card:#FFFFFF; --pp-text:#202534; --pp-text-secondary:#687086;
  --pp-positive:#DDF7E8; --pp-positive-text:#166534;
  --pp-warning:#F59E0B; --pp-warning-text:#92400E; --pp-error:#DC2626; --pp-border:#E5E7EB;
}
```

Status chips always combine an icon, a text label and a color: Safe (check icon, green-on-#DDF7E8), Watch Your Spending (alert icon, amber), Over Budget (x-circle icon, red). The derived text colors (`#166534`, `#92400E`) exist to meet WCAG AA on the pale backgrounds. All other UI colors come from the 11 official tokens.

---

## 9. Testing strategy

| Layer | Tooling | Coverage |
|---|---|---|
| Calculation unit tests | PHPUnit (`tests/Unit/BudgetCalculatorTest`) | spec example (2000/650/5 → 270.00), initial 285.71, zero allowance, ended, upcoming, exhausted, overspent, savings reservation, threshold boundaries 79.99%/80%/100%/100.01%, rounding |
| API feature tests | PHPUnit + `RefreshDatabase` on a dedicated `pocketplan_test` MySQL DB | auth flows, register-forces-student (even if `role=admin` is posted), admin cannot use the API, token revoked on logout, deactivated user gets 403 and tokens are deleted, cross-user access → 404 for every resource, expense CRUD updates the summary, budget overlap 409, reports and category totals, savings, timezone boundary (23:30 Manila vs UTC) |
| Admin feature tests | PHPUnit HTTP tests against web routes | login/logout, student → redirect/403, guest → login, search/filter, deactivate/reactivate + audit row + tokens gone, cannot deactivate self, category create/duplicate/edit/toggle + audit, forced password change, CSRF enforced |
| Mobile | jest-expo + React Native Testing Library + MSW-style axios mocks | login/register validation, auth gate redirects, expense form zod errors, dashboard loading/error/empty/data, status badge labels, API error → message, no balance change on failed mutation |
| Manual E2E (Phase 7) | Android emulator / device via Expo Go or a dev build, desktop + mobile browser for admin | full flow checklist |

The rule from §22 applies: no test is reported as passing unless it was run, and the command output is shown.

---

## 10. Initialization commands

```powershell
# Backend (from repo root)
composer create-project laravel/laravel:^12.0 backend
cd backend
php artisan install:api                 # Sanctum + routes/api.php
composer require brick/math
# configure .env DB_* (MySQL), then:
& "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u root -p -e "CREATE DATABASE pocketplan CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci; CREATE DATABASE pocketplan_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
php artisan migrate --seed
php artisan pocketplan:create-admin     # reads ADMIN_NAME / ADMIN_EMAIL / ADMIN_PASSWORD from .env
php artisan test
php artisan serve --host=0.0.0.0 --port=8000

# Mobile (Phase 4, from repo root)
npx create-expo-app@latest mobile --template default
cd mobile
npx expo install expo-secure-store expo-router react-native-svg
npm i axios @tanstack/react-query zustand react-hook-form zod @hookform/resolvers lucide-react-native
npx expo install nativewind react-native-reanimated react-native-safe-area-context react-native-paper react-native-gifted-charts
# .env: EXPO_PUBLIC_API_URL=http://10.0.2.2:8000/api/v1   (Android emulator) or http://<LAN-IP>:8000/api/v1 (device)
npx expo start
```

Exact mobile package versions are resolved by `npx expo install` against the installed SDK when Phase 4 starts.

---

## Assumptions (change any before they are built)

1. **Future-dated expenses are rejected.** An expense's `spent_on` must be ≤ today, in the user's timezone.
2. **Budgets never overlap per user**, regardless of status, so every expense maps to one budget deterministically.
3. **The daily target is fixed at the start of the day.** It excludes today's spending, and it is recalculated tomorrow.
4. **Admins cannot use the mobile API**, and students cannot log in to `/admin`.
5. **Password reset on mobile** uses Laravel's password broker. The emailed link opens `pocketplan://reset-password?token=…&email=…`. In development the mailer is `log`.
6. **The admin chart is an inline SVG drawn by Blade.** This avoids a JS chart dependency. Mobile charts use `react-native-gifted-charts`, which needs only `react-native-svg` and works in Expo Go.
7. **Personal categories:** students may add their own. Admins manage only the default ones.
8. **Laravel 12 on PHP 8.5.** If Composer reports an incompatibility, Laravel 12's latest patch release will be used. The spec requires 12, so Laravel 13 is not used.

---

## Revision 2 (2026-10-10): student feature list

This revision adds the student features from the updated list. **It replaces the earlier rules wherever the two conflict.**

### Money model

The plan now separates **money you have** from **money you plan to spend**.

| Concept | Meaning | Source |
|---|---|---|
| **Income** | Money actually received (allowance, salary, freelance, business, other) | `incomes` rows, entered manually or generated from a recurring schedule |
| **Available balance** | Money on hand right now | Σ income − Σ expenses − Σ net savings contributions (all time). It can be negative |
| **Budget** | A *spending limit* for a period, with optional per-category limits | `budgets.spending_limit` (renamed from `total_allowance`) |
| **Savings** | Money moved into a goal | `savings_contributions`. It lowers the available balance, but it is **never** an expense, so it is never counted twice |

`budgets.savings_target` is **removed**, because savings now live only in goals. The budget calculation stays as in §7, with `spendable = spending_limit`. One extra rule applies:

```
balance_start_of_day = Σ income (all, including today) − Σ expenses before today − Σ net savings
balance_cap          = max(0, balance_start_of_day) ÷ days_remaining
recommended_daily    = min(budget daily_target, balance_cap)   → `limited_by`: "budget" | "balance"
```

So the app never recommends spending money the student doesn't have. The cap applies only to the budget running today, and only after the student has recorded at least one income. A student who never records income has no known balance, so they see the plain budget target instead of ₱0.

### Schema changes

| Change | Detail |
|---|---|
| `expense_categories` → **`categories`** + `type` ENUM('expense','income') | One table, one admin screen. Default income categories: Allowance, Salary, Freelance, Business, Scholarship, Gift, Other Income |
| **`incomes`** | user_id, category_id (type income), recurring_income_id NULL, amount, description, received_on DATE (≤ today), notes. UNIQUE(recurring_income_id, received_on) prevents a schedule from generating the same payment twice |
| **`recurring_incomes`** | user_id, category_id, amount, description, frequency ('daily','weekly','biweekly','monthly'), start_date, end_date NULL, next_due_on, occurrences_generated, is_active |
| **`budget_category_limits`** | budget_id, category_id (type expense), limit_amount. UNIQUE(budget_id, category_id) |
| `users.deactivated_by` ENUM('admin','self') NULL | A self-deactivated student can reactivate by signing in. An admin-deactivated student cannot |

### Recurring income

`next_due_on` is calculated from `start_date + n × interval`, not from the previous date. Monthly schedules on the 31st therefore land on Feb 28 and then return to Mar 31. Due payments are generated by `pocketplan:generate-recurring-incomes`, which is scheduled hourly. They are also generated when the student opens the dashboard or the income list, so balances are correct even when the scheduler isn't running locally. Missed periods are caught up, with a safety cap.

### Account deletion

`DELETE /account` requires the password, then hard-deletes the user, and every record cascades with it. `POST /account/deactivate` sets `status=deactivated, deactivated_by=self` and revokes all tokens.

### Build order

1. **Phase 5a (backend):** categories, incomes, recurring incomes, budgets with category limits, expenses, dashboard, onboarding
2. **Phase 5b (backend):** savings goals and contributions, reports and insights, notifications and reminders, profile, password, currency and account settings
3. **Phase 5c (mobile):** all student screens on top of 5a and 5b
4. **Phase 3:** the admin dashboard, which also manages income categories
