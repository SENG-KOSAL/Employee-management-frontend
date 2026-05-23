# Employee Management — Frontend

A multi-tenant HRMS (Human Resource Management System) frontend built with **Next.js 16**, **React 19**, **TypeScript**, and **Tailwind CSS v4**.

---

## Prerequisites

- **Node.js** v18 or later
- **npm** (comes with Node.js)
- A running backend API (Laravel) — the frontend proxies API requests to this backend

---

## Tech Stack

| Library | Purpose |
|---------|---------|
| Next.js 16 (App Router) | React framework with file-based routing |
| React 19 | UI library |
| TypeScript 5 | Type safety |
| Tailwind CSS v4 | Utility-first CSS |
| Axios | HTTP client for API calls |
| Recharts | Charting library |
| Lucide React | Icon library |

---

## Environment Variables

Create a `.env.local` file (or copy from `.env`) in the project root:

```env
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
```

| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | Backend Laravel API base URL | `http://localhost:8000` |
| `NEXT_PUBLIC_DEBUG_API` | Set to `1` to log API requests in the console | (unset) |

---

## Setup

```bash
# 1. Clone the repository
git clone <repo-url>
cd Employee-management-frontend

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env .env.local
# Edit .env.local if your backend runs on a different URL

# 4. Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server (default: port 3000) |
| `npm run build` | Build for production |
| `npm start` | Start production server |
| `npm run lint` | Run ESLint across the codebase |

---

## Project Structure

```
├── app/                          # Next.js App Router (pages & API routes)
│   ├── (admin)/                  #   Route group: Admin / HR pages
│   │   ├── attendance/           #     Attendance dashboards & reports
│   │   ├── dashboard/            #     Main admin dashboard
│   │   ├── employees/            #     Employee CRUD, details, 360-degree
│   │   ├── leave-requests/       #     Leave management (admin, manager, employee views)
│   │   ├── payroll/              #     Payroll periods, payslips, dashboard
│   │   ├── reports/              #     Reports (attendance, departments, employees, leave, payroll)
│   │   └── settings/             #     Settings (benefits, departments, leave-types, work-schedules)
│   ├── (auth)/                   #   Route group: Authentication pages
│   │   └── auth/login/           #     Login page
│   ├── (employee)/               #   Route group: Employee self-service
│   │   └── employee/             #     Employee dashboard, attendance, leave, profile
│   ├── (super-admin)/            #   Route group: Super admin console
│   │   └── super-admin/          #     Multi-company management, dashboard
│   ├── api/                      #   Next.js API route handlers
│   │   ├── admin/companies/      #     Admin: list/create/enter/exit companies
│   │   ├── auth/login/           #     Auth: login endpoint
│   │   └── proxy/[...path]/      #     Proxy: forwards API requests to the backend
│   ├── login/                    #   Standalone login page
│   ├── payslips/                 #   Employee payslip listing
│   ├── salaries/                 #   Salary overview
│   ├── users-permissions/        #   User & permission management
│   ├── request/OverTime/         #   Overtime request form
│   ├── layout.tsx                #   Root layout (wraps AppProviders)
│   └── globals.css               #   Global Tailwind CSS styles
│
├── components/                   # Reusable UI components
│   ├── admin/                    #   Admin-specific (banners, tenant switcher, buttons)
│   ├── auth/                     #   Auth-related (RoleGate)
│   ├── employees/                #   Employee-specific (photo uploader, export)
│   ├── forms/                    #   Form components (BenefitForm, DepartmentForm, LeaveTypeForm)
│   ├── layout/                   #   Layout components (Sidebar, HRMSSidebar, EmployeeSidebar)
│   ├── payroll/                  #   Payroll-specific (PayslipDocument, StatCard, styles)
│   ├── providers/                #   React context providers (AppProviders)
│   ├── ui/                       #   Primitive UI components (Card, Sidebar, Collapsible)
│   ├── DataTable.tsx             #   Generic data table component
│   └── PageHeadder.tsx           #   Page header component
│
├── services/                     # API service layer
│   ├── api.js                    #   Axios instance (auth token, proxy, super admin headers)
│   ├── adminApi.js               #   Admin API helpers
│   ├── adminCompanies.ts         #   Company CRUD for super admin
│   ├── benefits.ts               #   Benefits API
│   ├── departments.ts            #   Departments API
│   ├── employees.ts              #   Employees API
│   ├── leaveAllocations.ts       #   Leave allocations API
│   ├── leaveRequests.ts          #   Leave requests API
│   ├── leaveTypes.ts             #   Leave types API
│   ├── overtimes.ts              #   Overtime API
│   ├── payrollPeriods.ts         #   Payroll periods API
│   ├── permissions.ts            #   Permissions API
│   └── workSchedules.ts          #   Work schedules API
│
├── hooks/                        # Custom React hooks
│   ├── useAuth.ts                #   Authentication state & login/logout
│   ├── useDashboardStats.ts      #   Dashboard statistics
│   ├── useImpersonation.ts       #   Super admin impersonation
│   ├── useRecentActivity.ts      #   Recent activity feed
│   └── useSupportMode.ts         #   Support mode (isReadOnly, isSupportMode)
│
├── context/                      # React context providers
│   └── ActiveCompanyContext.tsx   #   Global active company state for super admin
│
├── lib/                          # Utility modules
│   ├── roles.ts                  #   Role/permission definitions
│   └── meCache.ts                #   Cached current-user data
│
├── types/                        # TypeScript type definitions
│   └── hr.ts                     #   HR domain types (Employee, Leave, Payroll, etc.)
│
├── utils/                        # Helper functions
│   ├── auth.ts                   #   Auth helpers
│   └── format.ts                 #   Formatting helpers (dates, currency, etc.)
│
├── public/                       # Static assets
├── .env                          # Environment variable template
├── .env.local                    # Local environment variables (gitignored)
├── next.config.ts                # Next.js configuration
├── tsconfig.json                 # TypeScript configuration
├── tailwind.config.ts            # Tailwind CSS configuration
├── postcss.config.mjs            # PostCSS configuration
└── eslint.config.mjs             # ESLint configuration
```

---

## Route Groups

The app uses Next.js [Route Groups](https://nextjs.org/docs/app/building-your-application/routing/route-groups) (parentheses in folder names) to organize layouts without affecting URL paths:

| Route Group | URL Prefix | Purpose |
|-------------|------------|---------|
| `(admin)` | `/dashboard`, `/employees`, etc. | Admin/HR pages with sidebar layout |
| `(employee)` | `/employee/*` | Employee self-service pages |
| `(super-admin)` | `/super-admin/*` | Super admin multi-company console |
| `(auth)` | `/auth/*` | Login/authentication pages |

---

## API Integration

The API layer is defined in `services/api.js`:

- **Browser requests** are proxied through Next.js `/api/proxy/[...path]` to avoid CORS issues
- **Server-side requests** go directly to `NEXT_PUBLIC_API_URL`
- **Auth token** is automatically read from `localStorage` and attached as `Authorization: Bearer <token>`
- **Super Admin impersonation** injects the `X-Active-Company` header when an admin is browsing in a company context
- **401 / 419 responses** automatically clear the stored token and redirect to `/auth/login`

Domain-specific API modules (`services/employees.ts`, `services/payrollPeriods.ts`, etc.) import the shared axios instance for type-safe endpoint calls.

---

## Authentication Flow

1. User logs in via `POST /api/auth/login` (proxied to the backend)
2. Backend returns a Bearer token, stored in `localStorage`
3. The `hooks/useAuth.ts` hook manages authentication state
4. Protected pages use the `RoleGate` component (`components/auth/RoleGate.tsx`) for role-based access
5. On 401 responses, the token is automatically removed and the user is redirected to login

---

## Super Admin / Developer Console

Super Admin console UI lives at `/super-admin` and supports:

- List companies (via Next API route `GET /api/admin/companies`)
- Create company (via `POST /api/admin/companies`)
- Enter company context / Support Mode (via `POST /api/admin/companies/:id/enter`)
- Exit Support Mode (via `POST /api/admin/companies/exit`)
- Restore active company after reload (via `GET /api/admin/companies/active`)

### How Support Mode reuses existing company UI

When you click **Login As** on `/super-admin`:

1. The frontend calls the Next.js API route `POST /api/admin/companies/:id/enter`.
2. The app stores the active company in React Context and mirrors it to `localStorage` keys:
	- `active_company_id`
	- `active_company_name`
3. Existing company-side API calls automatically include the tenant header because `services/api.js` injects:
	- `X-Active-Company: <active_company_id>`
4. A global banner renders across the app: “Viewing Company: [Company Name] (Support Mode)”.

### Support Mode behavior

Support Mode grants Super Admin full access in the selected company context.
Backend should still enforce authorization server-side for safety.

For existing pages, you can disable write buttons using:

- `hooks/useSupportMode.ts` (`isReadOnly` / `isSupportMode`)

### Key files

- `context/ActiveCompanyContext.tsx` (global activeCompany state)
- `components/providers/AppProviders.tsx` (mounts providers + banner)
- `components/admin/SuperAdminBanner.tsx` (Support Mode banner)
- `app/api/admin/companies/*` (Next.js API routes for admin companies contract)