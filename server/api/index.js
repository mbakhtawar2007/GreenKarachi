"use strict";

// Vercel serverless entry point: @vercel/node invokes the exported
// Express app for every request routed here by `vercel.json`.
// Importing `../src/index.js` does not start a listener (see the
// direct-run guard there), so this module only re-exports the app.
const app = require('../src/index.js').default;

module.exports = app;
