# Sure Finance for Cloudron

Native Cloudron packaging for the official [Sure](https://github.com/we-promise/sure)
self-hosted personal-finance application.

The package uses Cloudron-managed PostgreSQL, Redis, and local storage. It runs
Sure's web process and Sidekiq worker in the same app container, with financial
data persisted under `/app/data` and database backups managed by Cloudron.

Build locally with:

```bash
cloudron build
cloudron install
```

AI integrations are disabled unless explicitly configured after installation.
