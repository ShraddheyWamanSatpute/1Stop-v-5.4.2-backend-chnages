#!/usr/bin/env node

/**
 * Update context imports from data/ to providers/supabase/
 * This script specifically targets context files that import from data/
 */

const fs = require('fs')
const path = require('path')

const CONTEXT_DIR = path.join(__dirname, '../context')

/**
 * Update import statements in a file
 */
function updateImportsInFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8')
    const originalContent = content
    
    // Replace data imports with providers/supabase imports
    content = content.replace(/from\s+['"]\.\.\/data\/([^'"]+)['"]/g, 'from "../providers/supabase/$1"')
    
    // Only write if content changed
    if (content !== originalContent) {
      fs.writeFileSync(filePath, content, 'utf8')
      console.log(`  Updated: ${path.basename(filePath)}`)
      return true
    }
    
    return false
  } catch (error) {
    console.error(`  Error processing ${filePath}: ${error.message}`)
    return false
  }
}

/**
 * Main function
 */
function main() {
  console.log('=== Update Context Imports to Supabase ===')
  
  if (!fs.existsSync(CONTEXT_DIR)) {
    console.error('Context directory not found')
    process.exit(1)
  }
  
  // Find all context files
  const contextFiles = fs.readdirSync(CONTEXT_DIR).filter(file => 
    file.endsWith('.tsx') || file.endsWith('.ts')
  )
  
  console.log(`Found ${contextFiles.length} context files`)
  
  let updatedCount = 0
  
  for (const file of contextFiles) {
    const filePath = path.join(CONTEXT_DIR, file)
    console.log(`\nProcessing ${file}...`)
    
    if (updateImportsInFile(filePath)) {
      updatedCount++
    } else {
      console.log(`  No changes needed`)
    }
  }
  
  console.log(`\n=== Summary ===`)
  console.log(`Files processed: ${contextFiles.length}`)
  console.log(`Files updated: ${updatedCount}`)
  
  if (updatedCount > 0) {
    console.log('\nNext steps:')
    console.log('1. Run TypeScript compilation: npm run typecheck')
    console.log('2. Test the application')
    console.log('3. Run data migration to Supabase')
    console.log('4. Set VITE_DATA_PROVIDER=supabase')
  } else {
    console.log('No files needed updating')
  }
}

// Run if called directly
if (require.main === module) {
  main().catch((error) => {
    console.error('Import update failed:', error)
    process.exit(1)
  })
}
