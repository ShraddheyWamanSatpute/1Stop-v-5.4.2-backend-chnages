#!/usr/bin/env node

/**
 * Switch all imports from rtdatabase/ to providers/supabase/
 * This script updates context components to use the existing working Supabase providers
 */

const fs = require('fs')
const path = require('path')

const APP_ROOT = path.join(__dirname, '../..')

// Import patterns to replace
const IMPORT_PATTERNS = [
  // Replace data/ imports with providers/supabase/
  {
    from: /from\s+['"]\.\.\/\.\.\/data\/([^'"]+)['"]/g,
    to: 'from "../providers/supabase/$1"'
  },
  // Replace rtdatabase/ imports with providers/supabase/
  {
    from: /from\s+['"]\.\.\/\.\.\/rtdatabase\/([^'"]+)['"]/g,
    to: 'from "../providers/supabase/$1"'
  },
  // Replace direct rtdatabase imports
  {
    from: /from\s+['"]\.\.\/rtdatabase\/([^'"]+)['"]/g,
    to: 'from "../providers/supabase/$1"'
  }
]

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
  '**/psql/**',
  '**/providers/**',
  '**/data/**'
]

/**
 * Update import statements in a file
 */
function updateImportsInFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8')
    const originalContent = content
    
    // Apply all import pattern replacements
    IMPORT_PATTERNS.forEach(pattern => {
      content = content.replace(pattern.from, pattern.to)
    })
    
    // Only write if content changed
    if (content !== originalContent) {
      fs.writeFileSync(filePath, content, 'utf8')
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
    
    // Find all TypeScript/JavaScript files
    const files = findFiles(directory, ['.ts', '.tsx', '.js', '.jsx'])
    filesToUpdate.push(...files)
  }
  
  return filesToUpdate
}

/**
 * Recursively find files with specific extensions
 */
function findFiles(dir, extensions) {
  const files = []
  
  try {
    const items = fs.readdirSync(dir, { withFileTypes: true })
    
    for (const item of items) {
      const fullPath = path.join(dir, item.name)
      
      if (item.isDirectory()) {
        // Skip excluded directories
        if (EXCLUDE_PATTERNS.some(pattern => fullPath.includes(pattern.replace('**/', '').replace('/**', '')))) {
          continue
        }
        files.push(...findFiles(fullPath, extensions))
      } else if (item.isFile()) {
        // Check if file has matching extension
        const ext = path.extname(item.name)
        if (extensions.includes(ext)) {
          files.push(fullPath)
        }
      }
    }
  } catch (error) {
    console.error(`Error reading directory ${dir}: ${error.message}`)
  }
  
  return files
}

/**
 * Check if a file contains rtdatabase or data imports
 */
function hasTargetImports(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8')
    return IMPORT_PATTERNS.some(pattern => pattern.from.test(content))
  } catch (error) {
    return false
  }
}

/**
 * Verify that all Supabase providers exist
 */
function verifySupabaseProviders() {
  const providersDir = path.join(__dirname, '../providers/supabase')
  
  if (!fs.existsSync(providersDir)) {
    console.error('ERROR: providers/supabase directory not found.')
    return false
  }
  
  const providerFiles = fs.readdirSync(providersDir).filter(file => file.endsWith('.ts'))
  console.log(`Found ${providerFiles.length} Supabase provider modules:`)
  providerFiles.forEach(file => console.log(`  - ${file}`))
  
  return true
}

/**
 * Generate summary report
 */
function generateReport(updatedFiles, totalFiles) {
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      totalFilesScanned: totalFiles,
      filesWithTargetImports: updatedFiles.length,
      filesUpdated: updatedFiles.length,
      updateRate: totalFiles > 0 ? ((updatedFiles.length / totalFiles) * 100).toFixed(2) + '%' : '0%'
    },
    updatedFiles: updatedFiles.map(file => path.relative(APP_ROOT, file))
  }
  
  const reportPath = path.join(__dirname, '../supabase-switch-report.json')
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2))
  
  console.log(`\n=== Import Switch Report ===`)
  console.log(`Files scanned: ${report.summary.totalFilesScanned}`)
  console.log(`Files with target imports: ${report.summary.filesWithTargetImports}`)
  console.log(`Files updated: ${report.summary.filesUpdated}`)
  console.log(`Update rate: ${report.summary.updateRate}`)
  console.log(`Report saved to: ${reportPath}`)
  
  return report
}

/**
 * Create backup of files before updating
 */
function createBackup(files) {
  const backupDir = path.join(__dirname, '../backups', `supabase-switch-backup-${Date.now()}`)
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
 * Main function
 */
async function main() {
  console.log('=== Switch to Supabase Providers ===')
  console.log('This script switches imports from rtdatabase/data to providers/supabase')
  
  // Verify Supabase providers exist
  if (!verifySupabaseProviders()) {
    process.exit(1)
  }
  
  // Find files to update
  console.log('\nScanning for files with target imports...')
  const allFiles = findFilesToUpdate()
  const filesWithImports = allFiles.filter(hasTargetImports)
  
  console.log(`Found ${filesWithImports.length} files with target imports out of ${allFiles.length} total files`)
  
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
  
  console.log('\n=== Import Switch Complete ===')
  console.log(`Backup created at: ${backupDir}`)
  console.log(`Report saved to: ${path.join(__dirname, '../supabase-switch-report.json')}`)
  
  if (updatedFiles.length > 0) {
    console.log('\nNext steps:')
    console.log('1. Run TypeScript compilation to check for errors')
    console.log('2. Test the application functionality')
    console.log('3. Run data migration to Supabase')
    console.log('4. Switch VITE_DATA_PROVIDER=supabase')
    console.log('5. Test thoroughly before going live')
  } else {
    console.log('No files were updated.')
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('Import switch failed:', error)
    process.exit(1)
  })
}

module.exports = { updateImportsInFile, findFilesToUpdate }
