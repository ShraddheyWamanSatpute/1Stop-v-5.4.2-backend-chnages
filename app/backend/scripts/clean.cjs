#!/usr/bin/env node

/**
 * Cross-platform clean script
 * Removes directories and files safely
 * Uses .cjs extension for CommonJS compatibility
 */

const fs = require('fs');
const path = require('path');

function removeDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    return;
  }

  try {
    fs.rmSync(dirPath, { recursive: true, force: true });
    console.log(`✓ Removed: ${dirPath}`);
  } catch (error) {
    console.error(`✗ Failed to remove ${dirPath}:`, error.message);
  }
}

// Get directories from command line arguments
const dirsToRemove = process.argv.slice(2);

if (dirsToRemove.length === 0) {
  console.log('No directories specified to clean');
  process.exit(0);
}

console.log('Cleaning build artifacts...\n');
dirsToRemove.forEach(removeDir);
console.log('\nClean complete!');
