const express = require('express');
const promClient = require('prom-client');
const axios = require('axios');
const https = require('https');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3001;
const nodeUrl = process.env.BICONOMY_NODE_URL || 'http://localhost:3000';
const scrapeInterval = parseInt(process.env.SCRAPE_INTERVAL || '30000', 10);

// Configure axios to handle SSL
const axiosInstance = axios.create({
    httpsAgent: new https.Agent({
        rejectUnauthorized: false // Only use this in development/trusted environments
    })
});

// Create Prometheus metrics
const registry = new promClient.Registry();

// Node health metrics
const nodeHealthGauge = new promClient.Gauge({
    name: 'biconomy_node_health',
    help: 'Health status of Biconomy node (1 = healthy, 0 = unhealthy)',
    labelNames: ['chainId', 'chainName'],
    registers: [registry]
});

const nativeBalanceGauge = new promClient.Gauge({
    name: 'biconomy_native_balance',
    help: 'Native token balance of the node',
    labelNames: ['chainId', 'chainName'],
    registers: [registry]
});

const execQueueActiveJobsGauge = new promClient.Gauge({
    name: 'biconomy_exec_queue_active_jobs',
    help: 'Number of active jobs in execution queue',
    labelNames: ['chainId', 'chainName'],
    registers: [registry]
});

const execQueuePendingJobsGauge = new promClient.Gauge({
    name: 'biconomy_exec_queue_pending_jobs',
    help: 'Number of pending jobs in execution queue',
    labelNames: ['chainId', 'chainName'],
    registers: [registry]
});

// Function to log messages based on log level
function log(level, message) {
    const logLevel = process.env.LOG_LEVEL || 'info';
    const levels = ['debug', 'info', 'warn', 'error'];
    const currentLevelIndex = levels.indexOf(logLevel);
    const messageLevelIndex = levels.indexOf(level);

    if (messageLevelIndex >= currentLevelIndex) {
        console.log(`${new Date().toISOString()} ${level.toUpperCase()} ${message}`);
    }
}

// Function to fetch node info
async function fetchNodeInfo() {
    try {
        const response = await axiosInstance.get(`${nodeUrl}/v3/info`);
        const chains = response.data.supportedChains;

        // Reset all gauges
        if (process.env.ENABLE_HEALTH_CHECK !== 'false') {
            nodeHealthGauge.reset();
        }
        if (process.env.ENABLE_NATIVE_BALANCE !== 'false') {
            nativeBalanceGauge.reset();
        }
        if (process.env.ENABLE_QUEUE_METRICS !== 'false') {
            execQueueActiveJobsGauge.reset();
            execQueuePendingJobsGauge.reset();
        }

        // Update metrics for each chain
        chains.forEach(chain => {
            const labels = {
                chainId: chain.chainId,
                chainName: chain.name
            };

            // Set health status (1 for healthy, 0 for unhealthy)
            if (process.env.ENABLE_HEALTH_CHECK !== 'false') {
                nodeHealthGauge.set(
                    labels,
                    chain.healthCheck.status === 'healthy' ? 1 : 0
                );
            }

            // Set native balance
            if (process.env.ENABLE_NATIVE_BALANCE !== 'false') {
                nativeBalanceGauge.set(
                    labels,
                    parseFloat(chain.healthCheck.nativeBalance)
                );
            }

            // Set execution queue metrics
            if (process.env.ENABLE_QUEUE_METRICS !== 'false') {
                execQueueActiveJobsGauge.set(
                    labels,
                    chain.healthCheck.execQueueActiveJobs
                );

                execQueuePendingJobsGauge.set(
                    labels,
                    chain.healthCheck.execQueuePendingJobs
                );
            }
        });

        log('debug', 'Successfully fetched and updated metrics');
        return true;
    } catch (error) {
        log('error', `Error fetching node info: ${error.message}`);
        if (error.response) {
            log('error', `Response status: ${error.response.status}`);
            log('error', `Response data: ${JSON.stringify(error.response.data)}`);
        }
        return false;
    }
}

// Expose metrics endpoint
app.get('/metrics', async (req, res) => {
    res.set('Content-Type', registry.contentType);
    res.end(await registry.metrics());
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok' });
});

// Start server and perform initial scrape
app.listen(port, async () => {
    log('info', `Prometheus scraper listening on port ${port}`);
    log('info', `Scraping Biconomy node at ${nodeUrl}`);
    log('info', `Scrape interval: ${scrapeInterval}ms`);

    // Perform initial scrape
    const success = await fetchNodeInfo();
    if (success) {
        log('info', 'Initial metrics scrape completed successfully');
    } else {
        log('warn', 'Initial metrics scrape failed, will retry on next interval');
    }

    // Start interval for subsequent scrapes
    setInterval(fetchNodeInfo, scrapeInterval);
}); 