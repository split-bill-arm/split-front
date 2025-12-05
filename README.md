# split-front

Local dev instructions to connect to the Django backend:

- Set the backend API base URL in an environment variable (optional). By default the front-end will call `http://localhost:8000/api`.

Create a `.env.local` in the `split-front` folder and add:

```
NEXT_PUBLIC_API_URL=http://localhost:8000/api
```

Then run the front-end:

```powershell
pnpm install
pnpm dev
```