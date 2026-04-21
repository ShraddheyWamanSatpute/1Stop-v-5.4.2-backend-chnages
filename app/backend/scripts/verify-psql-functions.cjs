#!/usr/bin/env node

/**
 * Verify that all psql modules have complete function implementations
 * Compare RTDB exports with psql exports and identify missing functions
 */

const fs = require('fs')
const path = require('path')

const RTDB_DIR = path.join(__dirname, '../rtdatabase')
const PSQL_DIR = path.join(__dirname, '../psql')

// Extract function signatures from a file
function extractFunctions(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8')
    const functions = []
    
    // Match export function patterns
    const patterns = [
      /export\s+function\s+(\w+)\s*\([^)]*\)\s*:\s*([^)]+)/g,
      /export\s+async\s+function\s+(\w+)\s*\([^)]*\)\s*:\s*([^)]+)/g,
      /export\s+(?:const|let)\s+(\w+)\s*=\s*(?:async\s+)?\([^)]*\)\s*=>/g,
      /export\s+(?:const|let)\s+(\w+)\s*=\s*(?:async\s+)?function\s*\([^)]*\)/g
    ]
    
    patterns.forEach(pattern => {
      let match
      while ((match = pattern.exec(content)) !== null) {
        const functionName = match[1]
        const signature = match[0]
        
        // Skip if it's a TODO placeholder
        if (signature.includes('TODO')) {
          continue
        }
        
        functions.push({
          name: functionName,
          signature: signature.trim(),
          isAsync: signature.includes('async'),
          isTodo: signature.includes('TODO')
        })
      }
    })
    
    return functions
  } catch (error) {
    console.error(`Error reading ${filePath}: ${error.message}`)
    return []
  }
}

// Check if a module has TODO placeholders
function hasTodoPlaceholders(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8')
    return content.includes('TODO: Implement export')
  } catch (error) {
    return false
  }
}

// Main verification
function main() {
  console.log('=== Verifying PSQL Module Completeness ===\n')
  
  const rtdbFiles = fs.readdirSync(RTDB_DIR).filter(file => file.endsWith('.tsx'))
  const psqlFiles = fs.readdirSync(PSQL_DIR).filter(file => file.endsWith('.tsx'))
  
  const results = {
    totalModules: rtdbFiles.length,
    completeModules: 0,
    incompleteModules: 0,
    missingModules: [],
    moduleDetails: []
  }
  
  console.log(`Found ${rtdbFiles.length} RTDB modules`)
  console.log(`Found ${psqlFiles.length} PSQL modules\n`)
  
  for (const rtdbFile of rtdbFiles) {
    const moduleName = path.basename(rtdbFile, '.tsx')
    const psqlFile = path.join(PSQL_DIR, rtdbFile)
    
    console.log(`=== ${moduleName} ===`)
    
    if (!fs.existsSync(psqlFile)) {
      console.log(`  MISSING: PSQL module not found`)
      results.missingModules.push(moduleName)
      results.incompleteModules++
      continue
    }
    
    const rtdbFunctions = extractFunctions(path.join(RTDB_DIR, rtdbFile))
    const psqlFunctions = extractFunctions(psqlFile)
    const hasTodos = hasTodoPlaceholders(psqlFile)
    
    const rtdbFunctionNames = new Set(rtdbFunctions.map(f => f.name))
    const psqlFunctionNames = new Set(psqlFunctions.map(f => f.name))
    
    const missingFunctions = [...rtdbFunctionNames].filter(name => !psqlFunctionNames.has(name))
    const todoFunctions = psqlFunctions.filter(f => f.isTodo)
    
    console.log(`  RTDB functions: ${rtdbFunctions.length}`)
    console.log(`  PSQL functions: ${psqlFunctions.length}`)
    console.log(`  Missing functions: ${missingFunctions.length}`)
    console.log(`  TODO functions: ${todoFunctions.length}`)
    console.log(`  Has TODO placeholders: ${hasTodos}`)
    
    if (missingFunctions.length > 0) {
      console.log(`  Missing: ${missingFunctions.join(', ')}`)
    }
    
    if (todoFunctions.length > 0) {
      console.log(`  TODO: ${todoFunctions.map(f => f.name).join(', ')}`)
    }
    
    const isComplete = missingFunctions.length === 0 && todoFunctions.length === 0 && !hasTodos
    
    if (isComplete) {
      results.completeModules++
      console.log(`  Status: COMPLETE`)
    } else {
      results.incompleteModules++
      console.log(`  Status: INCOMPLETE`)
    }
    
    results.moduleDetails.push({
      name: moduleName,
      rtdbCount: rtdbFunctions.length,
      psqlCount: psqlFunctions.length,
      missingCount: missingFunctions.length,
      todoCount: todoFunctions.length,
      hasTodos,
      isComplete,
      missingFunctions,
      todoFunctions
    })
    
    console.log('')
  }
  
  // Summary
  console.log('=== SUMMARY ===')
  console.log(`Total modules: ${results.totalModules}`)
  console.log(`Complete modules: ${results.completeModules}`)
  console.log(`Incomplete modules: ${results.incompleteModules}`)
  console.log(`Missing modules: ${results.missingModules.length}`)
  
  const completionRate = results.totalModules > 0 ? 
    ((results.completeModules / results.totalModules) * 100).toFixed(1) : 0
  
  console.log(`Completion rate: ${completionRate}%`)
  
  if (results.incompleteModules > 0) {
    console.log('\n=== INCOMPLETE MODULES ===')
    results.moduleDetails
      .filter(m => !m.isComplete)
      .forEach(module => {
        console.log(`${module.name}:`)
        if (module.missingCount > 0) {
          console.log(`  Missing ${module.missingCount} functions`)
        }
        if (module.todoCount > 0) {
          console.log(`  ${module.todoCount} TODO functions`)
        }
        if (module.hasTodos) {
          console.log(`  Has TODO placeholders`)
        }
      })
  }
  
  // Generate report
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      totalModules: results.totalModules,
      completeModules: results.completeModules,
      incompleteModules: results.incompleteModules,
      completionRate: completionRate + '%'
    },
    modules: results.moduleDetails
  }
  
  const reportPath = path.join(__dirname, '../psql-verification-report.json')
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2))
  console.log(`\nReport saved to: ${reportPath}`)
  
  return results
}

// Run verification
if (require.main === module) {
  const results = main()
  
  if (results.incompleteModules > 0) {
    console.log('\n=== ACTION REQUIRED ===')
    console.log('Some PSQL modules are incomplete. Please implement missing functions before migration.')
    process.exit(1)
  } else {
    console.log('\n=== ALL MODULES COMPLETE ===')
    console.log('All PSQL modules are ready for migration.')
    process.exit(0)
  }
}

module.exports = { extractFunctions, hasTodoPlaceholders }
