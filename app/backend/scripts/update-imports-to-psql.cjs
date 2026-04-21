#!/usr/bin/env node

/**
 * Update all import statements from rtdatabase/ to psql/
 * This script automatically updates context components and other files
 * to use the new Supabase modules instead of Firebase RTDB modules
 */

const fs = require('fs')
const path = require('path')
const glob = require('glob')

const APP_ROOT = path.join(__dirname, '../..')
const RTDB_IMPORT_PATTERN = /from\s+['"]\.\.\/rtdatabase\/([^'"]+)['"]/
const PSQL_IMPORT_PATTERN = 'from "../psql/$1"'

// Files to update
const PATTERNS = [
  '**/*.tsx',
  '**/*.ts',
  '**/*.js',
  '**/*.jsx'
].join('|')

// Directories to scan
const SCAN_DIRECTORIES = [
  path.join(APP_ROOT, 'app'),
  path.join(APP_ROOT, 'admin'),
  path.join(APP_ROOT, 'mobile')
]

// Files to exclude
const EXCLUDE_PATTERNS = [
  '**/node_modules/**',
  '**/dist/**',
  '**/build/**',
  '**/.git/**',
  '**/rtdatabase/**',
  '**/psql/**'
]

/**
 * Update import statements in a file
 */
function updateImportsInFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8')
    const originalContent = content
    
    // Replace rtdatabase imports with psql imports
    const updatedContent = content.replace(RTDB_IMPORT_PATTERN, PSQL_IMPORT_PATTERN)
    
    // Only write if content changed
    if (updatedContent !== originalContent) {
      fs.writeFileSync(filePath, updatedContent, 'utf8')
      console.log(`  Updated imports in: ${path.relative(APP_ROOT, filePath)}`)
      return true
    }
    
    return false
  } catch (error) {
    console.error(`  Error processing ${filePath}: ${error.message}`)
    return false
  }
}

/**
 * Find all files that need import updates
 */
function findFilesToUpdate() {
  const filesToUpdate = []
  
  for (const directory of SCAN_DIRECTORIES) {
    if (!fs.existsSync(directory)) {
      console.log(`Directory not found: ${directory}`)
      continue
    }
    
    const pattern = `${directory}/**/*.{ts,tsx,js,jsx}`
    const files = glob.sync(pattern, {
      ignore: EXCLUDE_PATTERNS,
      absolute: true
    })
    
    filesToUpdate.push(...files)
  }
  
  return filesToUpdate
}

/**
 * Check if a file contains rtdatabase imports
 */
function hasRtdbImports(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8')
    return RTDB_IMPORT_PATTERN.test(content)
  } catch (error) {
    return false
  }
}

/**
 * Generate summary report
 */
function generateReport(updatedFiles, totalFiles) {
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      totalFilesScanned: totalFiles,
      filesWithRtdbImports: updatedFiles.length,
      filesUpdated: updatedFiles.length,
      updateRate: totalFiles > 0 ? ((updatedFiles.length / totalFiles) * 100).toFixed(2) + '%' : '0%'
    },
    updatedFiles: updatedFiles.map(file => path.relative(APP_ROOT, file))
  }
  
  const reportPath = path.join(__dirname, '../import-update-report.json')
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2))
  
  console.log(`\n=== Import Update Report ===`)
  console.log(`Files scanned: ${report.summary.totalFilesScanned}`)
  console.log(`Files with rtdatabase imports: ${report.summary.filesWithRtdbImports}`)
  console.log(`Files updated: ${report.summary.filesUpdated}`)
  console.log(`Update rate: ${report.summary.updateRate}`)
  console.log(`Report saved to: ${reportPath}`)
  
  return report
}

/**
 * Create backup of files before updating
 */
function createBackup(files) {
  const backupDir = path.join(__dirname, '../backups', `backup-${Date.now()}`)
  fs.mkdirSync(backupDir, { recursive: true })
  
  console.log(`Creating backup in: ${backupDir}`)
  
  for (const file of files) {
    try {
      const relativePath = path.relative(APP_ROOT, file)
      const backupPath = path.join(backupDir, relativePath)
      const backupDirPath = path.dirname(backupPath)
      
      // Create directory structure
      fs.mkdirSync(backupDirPath, { recursive: true })
      
      // Copy file
      fs.copyFileSync(file, backupPath)
    } catch (error) {
      console.error(`  Error backing up ${file}: ${error.message}`)
    }
  }
  
  console.log(`  Backed up ${files.length} files`)
  return backupDir
}

/**
 * Verify that psql modules exist for all rtdb imports
 */
function verifyPsqlModules() {
  const psqlDir = path.join(__dirname, '../psql')
  const rtdbDir = path.join(__dirname, '../rtdatabase')
  
  if (!fs.existsSync(psqlDir)) {
    console.error('ERROR: psql directory not found. Please run generate-psql-modules.cjs first.')
    return false
  }
  
  if (!fs.existsSync(rtdbDir)) {
    console.error('ERROR: rtdatabase directory not found.')
    return false
  }
  
  const rtdbFiles = fs.readdirSync(rtdbDir).filter(file => file.endsWith('.tsx'))
  const psqlFiles = fs.readdirSync(psqlDir).filter(file => file.endsWith('.tsx'))
  
  console.log(`Found ${rtdbFiles.length} RTDB modules and ${psqlFiles.length} PSQL modules`)
  
  const missingFiles = rtdbFiles.filter(file => !psqlFiles.includes(file))
  if (missingFiles.length > 0) {
    console.error('ERROR: Missing PSQL modules for:')
    missingFiles.forEach(file => console.error(`  - ${file}`))
    return false
  }
  
  console.log('All PSQL modules are available')
  return true
}

/**
 * Main function
 */
async function main() {
  console.log('=== Update Imports: rtdatabase/ to psql/ ===')
  
  // Verify psql modules exist
  if (!verifyPsqlModules()) {
    process.exit(1)
  }
  
  // Find files to update
  console.log('\nScanning for files with rtdatabase imports...')
  const allFiles = findFilesToUpdate()
  const filesWithImports = allFiles.filter(hasRtdbImports)
  
  console.log(`Found ${filesWithImports.length} files with rtdatabase imports out of ${allFiles.length} total files`)
  
  if (filesWithImports.length === 0) {
    console.log('No files need updating. Done!')
    return
  }
  
  // Create backup
  console.log('\nCreating backup...')
  const backupDir = createBackup(filesWithImports)
  
  // Update imports
  console.log('\nUpdating imports...')
  const updatedFiles = []
  
  for (const file of filesWithImports) {
    if (updateImportsInFile(file)) {
      updatedFiles.push(file)
    }
  }
  
  // Generate report
  const report = generateReport(updatedFiles, allFiles.length)
  
  console.log('\n=== Import Update Complete ===')
  console.log(`Backup created at: ${backupDir}`)
  console.log(`Report saved to: ${path.join(__dirname, '../import-update-report.json')}`)
  
  if (updatedFiles.length > 0) {
    console.log('\nNext steps:')
    console.log('1. Review the updated files')
    console.log('2. Run TypeScript compilation to check for errors')
    console.log('3. Test the application functionality')
    console.log('4. Commit the changes')
  } else {
    console.log('No files were updated.')
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('Import update failed:', error)
    process.exit(1)
  })
}

module.exports = { updateImportsInFile, findFilesToUpdate }
