#!/usr/bin/env node
"use strict";

/**
 * Standalone validator: reads a clip-suggestions JSON file and validates it
 * against the schema. Useful for checking hand-edited or externally produced
 * JSON before feeding it to the Premiere scripts.
 */

const fs = require("fs");
const path = require("path");
const Ajv = require("ajv");

const args = process.argv.slice(2);
if (args.length < 1) {
  console.error("Usage: node validate-clips.js <clips.json>");
  process.exit(1);
}

const filePath = path.resolve(args[0]);
if (!fs.existsSync(filePath)) {
  console.error(`File not found: ${filePath}`);
  process.exit(1);
}

const schema = JSON.parse(
  fs.readFileSync(path.join(__dirname, "clip-schema.json"), "utf-8")
);
const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));

const ajv = new Ajv({ allErrors: true });
const validate = ajv.compile(schema);
const valid = validate(data);

if (valid) {
  console.log(`Valid: ${data.length} clip(s) in ${path.basename(filePath)}`);
  process.exit(0);
} else {
  console.error("Validation errors:");
  for (const err of validate.errors) {
    console.error(`  ${err.instancePath || "/"}: ${err.message}`);
  }
  process.exit(1);
}
