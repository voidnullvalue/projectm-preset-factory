#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function walkFiles(rootDir) {
  const files = [];
  if (!fs.existsSync(rootDir)) return files;
  const stack = [rootDir];
  while (stack.length > 0) {
    const cur = stack.pop();
    const entries = fs.readdirSync(cur, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(cur, entry.name);
      if (entry.isDirectory()) stack.push(full);
      else if (entry.isFile()) files.push(full);
    }
  }
  return files;
}

function sha1(content) {
  return crypto.createHash('sha1').update(content).digest('hex');
}

function normalizeMilkContent(input) {
  const text = input.toString('utf8').replace(/\r\n?/g, '\n');
  const lines = text.split('\n').map((line) => line.replace(/[ \t]+$/g, ''));
  return `${lines.join('\n').trim()}\n`;
}

module.exports = {
  ensureDir,
  walkFiles,
  sha1,
  normalizeMilkContent,
};
