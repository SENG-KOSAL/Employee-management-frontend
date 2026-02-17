This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.


style 

npm install lucide-react

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