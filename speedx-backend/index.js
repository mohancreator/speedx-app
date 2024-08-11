const express = require("express");
const axios = require("axios");
const cors = require("cors");
const { performance } = require('perf_hooks');
const http = require('http');
const https = require('https');

const app = express();

app.use(
    cors({
        origin: ['https://speedxapp.netlify.app', 'http://localhost:3000'],
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
    })
);

app.use(express.json());

app.listen(5000, () => {
    console.log("Server Running on http://localhost:5000");
});

app.post("/api/analyze", async (request, response) => {
    const { url } = request.body;

    try {
        const startTime = performance.now();

        const protocol = url.startsWith('https') ? https : http;

        let dnsLookupStart, connectionStart;
        const request = protocol.get(url, (res) => {
            const dnsLookupEnd = performance.now();
            const connectionTime = connectionStart ? dnsLookupEnd - connectionStart : 'Not Available';
            const ttfb = res.headers['x-response-time'] || res.headers['x-ttfb'] || "Not Available";
            const totalRequestSize = res.headers["content-length"] || "Not Available";

            res.on('data', () => { }); // Consume the data to keep the request open
            res.on('end', () => {
                const pageLoadTime = performance.now() - startTime;
                response.json({
                    pageLoadTime,
                    totalRequestSize,
                    numRequests: 1,
                    dnsLookupTime: dnsLookupEnd - startTime,
                    connectionTime,
                    ttfb,
                });
            });
        });

        request.on('socket', (socket) => {
            socket.on('lookup', () => {
                dnsLookupStart = performance.now();
            });
            socket.on('connect', () => {
                connectionStart = performance.now();
            });
        });

        request.on('error', (err) => {
            console.error(err.message);
            response.status(500).json({ error: "Error analyzing website performance" });
        });

    } catch (error) {
        console.error(error.message);
        response.status(500).json({ error: "Error analyzing website performance" });
    }
});
