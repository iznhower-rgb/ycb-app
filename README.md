# Y.C.B Football Prediction Engine 3.1.0

Y.C.B is a Cloudflare Workers based football prediction engine.

## Architecture

The project uses a multi-provider architecture:

- ESPN
- TheSportsDB
- BSD (optional)

Data is collected by the provider runner and merged by the statistics collector.

## Files

- worker.js
- providers.js
- providerRunner.js
- statsCollector.js
- espnProvider.js
- theSportsDBProvider.js
- bsdProvider.js
- wrangler.toml

## API

### Health

GET:

/api/health

### Providers

GET:

/api/providers

### Analyze

POST:

/api/analyze

Example:

{
  "match": "Arsenal vs Coventry City"
}

## Cloudflare Workers

The project is designed for Cloudflare Workers.

Deploy with:

wrangler deploy

## Environment

ESPN leagues are configured in wrangler.toml.

TheSportsDB uses the public/default key unless THESPORTSDB_API_KEY is configured.

BSD is optional.

Configure:

BSD_API_URL

Optional:

BSD_API_KEY

## Important

The engine does not guarantee prediction accuracy.

Data quality measures the completeness and verification of available data.

A recommendation requires successful multi-provider verification.
