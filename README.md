# Biconomy Prometheus Scraper

This is a Prometheus scraper for Biconomy nodes that collects various metrics about node health and performance.

## Features

- Monitors node health status for each supported chain
- Tracks native token balances
- Monitors execution queue metrics (active and pending jobs)
- Exposes metrics in Prometheus format
- Configurable through environment variables
- Configurable logging levels

## Installation

1. Install dependencies:
```bash
npm install
```

2. Copy the example environment file and customize it:
```bash
cp .env.example .env
```

## Configuration

The following environment variables can be configured:

### Server Configuration
- `PORT`: Port for the metrics server (default: 3001)
- `NODE_ENV`: Environment (development/production)

### Biconomy Node Configuration
- `BICONOMY_NODE_URL`: URL of the Biconomy node (default: http://localhost:3000)
- `SCRAPE_INTERVAL`: Interval between metric scrapes in milliseconds (default: 30000)

### Metrics Configuration
- `ENABLE_NATIVE_BALANCE`: Enable/disable native balance metrics (default: true)
- `ENABLE_QUEUE_METRICS`: Enable/disable queue metrics (default: true)
- `ENABLE_HEALTH_CHECK`: Enable/disable health check metrics (default: true)

### Logging Configuration
- `LOG_LEVEL`: Logging level (debug, info, warn, error) (default: info)

## Usage

### Standalone

1. Start the scraper:
```bash
npm start
```

2. Access metrics:
```
http://localhost:3001/metrics
```

3. Health check endpoint:
```
http://localhost:3001/health
```

### Docker Compose

The project includes a `docker-compose.yml` file with two profiles:

1. `scraper` - Runs only the Prometheus scraper
2. `full` - Runs both the scraper and Prometheus

To run the stack:

1. Create a `.env` file with your configuration:
```bash
cp .env.example .env
# Edit .env with your settings
```

2. Start the services:

```bash
# Start just the scraper
docker-compose --profile scraper up

# Or start with Prometheus
docker-compose --profile full up
```

3. Access the services:
- Prometheus Scraper: http://localhost:3001/metrics
- Prometheus UI: http://localhost:9090 (only available in full profile)

4. Stop the services:
```bash
docker-compose down
```

## Metrics

The scraper exposes the following metrics (configurable):

- `biconomy_node_health`: Health status of Biconomy node (1 = healthy, 0 = unhealthy)
- `biconomy_native_balance`: Native token balance of the node
- `biconomy_exec_queue_active_jobs`: Number of active jobs in execution queue
- `biconomy_exec_queue_pending_jobs`: Number of pending jobs in execution queue

All metrics include labels for `chainId` and `chainName`.

## Docker Support

### Standalone Docker

To run just the scraper in Docker:

```bash
docker build -t biconomy-prometheus-scraper .
docker run -p 3001:3001 --env-file .env biconomy-prometheus-scraper
```

### Docker Compose

See the Docker Compose section above for running the stack with different profiles.

Note: Make sure to create a `.env` file with your configuration before running the Docker containers. 