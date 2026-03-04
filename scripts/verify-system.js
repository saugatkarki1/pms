#!/usr/bin/env node

/**
 * Workforce Management System - Verification Script
 * Checks system integrity and configuration before deployment
 */

const fs = require('fs')
const path = require('path')

const CHECKS = {
  passed: [],
  failed: [],
  warnings: [],
}

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  bold: '\x1b[1m',
}

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`)
}

function pass(message) {
  CHECKS.passed.push(message)
  log(`✓ ${message}`, colors.green)
}

function fail(message) {
  CHECKS.failed.push(message)
  log(`✗ ${message}`, colors.red)
}

function warn(message) {
  CHECKS.warnings.push(message)
  log(`⚠ ${message}`, colors.yellow)
}

function fileExists(filePath) {
  return fs.existsSync(filePath)
}

function header(title) {
  log(`\n${'='.repeat(60)}`, colors.blue)
  log(`${colors.bold}${title}${colors.reset}`, colors.blue)
  log(`${'='.repeat(60)}`, colors.blue)
}

// Start verification
console.clear()
log(`\n${colors.bold}Workforce Management System - Verification${colors.reset}\n`, colors.bold)

// Check Node.js version
header('Environment Checks')
const nodeVersion = process.version
const majorVersion = parseInt(nodeVersion.split('.')[0].substring(1))
if (majorVersion >= 18) {
  pass(`Node.js version ${nodeVersion} (required: 18+)`)
} else {
  fail(`Node.js version ${nodeVersion} (required: 18+)`)
}

// Check package.json
if (fileExists('package.json')) {
  pass('package.json exists')
} else {
  fail('package.json missing')
}

// Check environment files
header('Configuration Files')
if (fileExists('.env.example')) {
  pass('.env.example exists')
} else {
  warn('.env.example missing')
}

if (fileExists('.env.local')) {
  pass('.env.local exists (production config)')
} else {
  warn('.env.local not found (will be needed for production)')
}

// Check core directories
header('Project Structure')
const requiredDirs = [
  'app',
  'components',
  'lib',
  'hooks',
  'scripts',
  'app/auth',
  'app/protected',
  'app/api',
  'components/ui',
]

requiredDirs.forEach((dir) => {
  if (fileExists(dir)) {
    pass(`Directory: ${dir}`)
  } else {
    fail(`Directory missing: ${dir}`)
  }
})

// Check critical files
header('Critical Files')
const criticalFiles = [
  'app/layout.tsx',
  'app/page.tsx',
  'app/protected/layout.tsx',
  'app/protected/page.tsx',
  'middleware.ts',
  'lib/supabase/client.ts',
  'lib/supabase/server.ts',
  'lib/auth.ts',
  'lib/workers.ts',
  'lib/attendance.ts',
  'lib/payroll.ts',
  'hooks/useUser.ts',
  'components/sidebar.tsx',
  'components/header.tsx',
]

criticalFiles.forEach((file) => {
  if (fileExists(file)) {
    pass(`File: ${file}`)
  } else {
    fail(`File missing: ${file}`)
  }
})

// Check API endpoints
header('API Endpoints')
const apiEndpoints = [
  'app/api/health/route.ts',
  'app/api/biometric/attendance/route.ts',
]

apiEndpoints.forEach((endpoint) => {
  if (fileExists(endpoint)) {
    pass(`Endpoint: ${endpoint}`)
  } else {
    fail(`Endpoint missing: ${endpoint}`)
  }
})

// Check database migrations
header('Database Migrations')
const migrations = [
  'scripts/001_create_schema.sql',
  'scripts/002_create_user_trigger.sql',
]

migrations.forEach((migration) => {
  if (fileExists(migration)) {
    pass(`Migration: ${migration}`)
  } else {
    warn(`Migration missing: ${migration}`)
  }
})

// Check documentation
header('Documentation')
const docs = [
  'README.md',
  'QUICKSTART.md',
  'FEATURES.md',
  'TESTING.md',
  'DEPLOYMENT.md',
  'PRODUCTION_READY.md',
  'IMPLEMENTATION_SUMMARY.md',
]

docs.forEach((doc) => {
  if (fileExists(doc)) {
    pass(`Documentation: ${doc}`)
  } else {
    warn(`Documentation missing: ${doc}`)
  }
})

// Check page files
header('Application Pages')
const pages = [
  'app/auth/login/page.tsx',
  'app/auth/sign-up/page.tsx',
  'app/protected/workers/page.tsx',
  'app/protected/attendance/page.tsx',
  'app/protected/payroll/page.tsx',
  'app/protected/reports/page.tsx',
  'app/protected/inventory/page.tsx',
  'app/protected/settings/page.tsx',
]

pages.forEach((page) => {
  if (fileExists(page)) {
    pass(`Page: ${page}`)
  } else {
    fail(`Page missing: ${page}`)
  }
})

// Summary
header('Verification Summary')
log(
  `Passed: ${colors.green}${CHECKS.passed.length}${colors.reset} | Failed: ${colors.red}${CHECKS.failed.length}${colors.reset} | Warnings: ${colors.yellow}${CHECKS.warnings.length}${colors.reset}`
)

if (CHECKS.failed.length === 0) {
  log(`\n${colors.green}${colors.bold}✓ System verification passed!${colors.reset}`, colors.green)
  log('The system is ready for deployment.\n', colors.green)
  process.exit(0)
} else {
  log(`\n${colors.red}${colors.bold}✗ System verification failed!${colors.reset}`, colors.red)
  log(`Please fix ${CHECKS.failed.length} issue(s) before deploying.\n`, colors.red)
  process.exit(1)
}
