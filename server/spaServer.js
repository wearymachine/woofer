import compression from 'compression';
import express from 'express';
import fs from 'fs';
import https from 'https';
import process from 'process';
import URI from 'urijs';

const errorStatusMessages = {
    '401': 'Unauthroized',
    '400': 'Bad Request',
    '403': 'Forbidden',
    '404': 'Not Found',
    '500': 'Internal Server Error'
};
const baseRoute = '/episode-connect';
const mainAppFile = `${__dirname}/client/index.html`;

process.on('uncaughtException', function(err) {
    const validUptimeDuration = 5;
    const restartableFailureErrorCode = 1;
    const nonRestartableFailureErrorCode = 2;

    // eslint-disable-next-line no-console
    console.error('Uncaught server error: ', err);
    process.exit(
        process.uptime >= validUptimeDuration
            ? restartableFailureErrorCode
            : nonRestartableFailureErrorCode
    );
});

const httpServerOptions = {
    ca: fs.readFileSync('keys/gd_bundle-g2-g1.crt'),
    key: fs.readFileSync('keys/remedypartners.key'),
    cert: fs.readFileSync('keys/rp.crt')
};

const app = express();

app.disable('x-powered-by');
app.use(compression());

app.use(function(req, res, next) {
    res.setHeader('strict-transport-security', 'max-age=31536000; includeSubdomains; preload');
    res.setHeader('x-content-type-options', 'nosniff');
    res.setHeader('x-frame-options', 'DENY');
    res.setHeader('x-xss-protection', '1; mode=block');
    res.setHeader('referrer-policy', 'no-referrer-when-downgrade');

    // eslint-disable-next-line max-len
    res.setHeader('content-security-policy', "default-src *; font-src 'self' data: application/*; img-src *; script-src 'self'; style-src 'self' 'unsafe-inline'; object-src 'none'");

    return next();
});

app.get('/', function(req, res) {
    res.sendFile(mainAppFile);
});

app.get(baseRoute, function(req, res) {
    res.sendFile(mainAppFile);
});

app.get(`${baseRoute}/`, function(req, res) {
    res.sendFile(mainAppFile);
});

app.get('/health', function(req, res) {
    const success = 200;

    res.status(success).send();
});

app.get('/*', function(req, res) {
    const requestedUri = URI(req.url);
    const lastSegmentContainsDot = /\./.test(requestedUri.filename());

    if (lastSegmentContainsDot) {
        res.sendFile(`${__dirname}/client/${req.url}`);
    } else {
        res.sendFile(mainAppFile);
    }
});

app.use(function(err, req, res, next) {
    // eslint-disable-next-line no-console
    console.error(err.stack);
    const errorMessage = errorStatusMessages[err.status] || `${err.status} error`;

    res.status(err.status).send(errorMessage);
});

const server = https.createServer(httpServerOptions, app);
const port = 443;

//  eslint-disable-next-line max-len
server.listen(
    port,
    function() {
        // eslint-disable-next-line no-console
        console.info(
            `Content Server (pid ${ process.pid }) is running on port: ${server.address().port}`
        );
    }
);
