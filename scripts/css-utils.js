#!/usr/bin/env node

/**
 * CSS Utilities Script
 * Helper script for managing the modular CSS architecture
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Types for JSDoc annotations
// FileStats: { size: number, isDirectory(): boolean }
// CSSAnalysisResult: { totalSize: number, fileCount: number, issues: string[] }
// CommandType: 'component' | 'utility' | 'list' | 'analyze' | 'help'

const CSS_DIR = path.join(__dirname, '../public/css');
const COMPONENTS_DIR = path.join(CSS_DIR, 'components');
const UTILITIES_DIR = path.join(CSS_DIR, 'utilities');

/**
 * Create a new CSS component file
 */
function createComponent(name) {
  if (!name) {
    console.error('❌ Component name is required');
    process.exit(1);
  }

  const componentPath = path.join(COMPONENTS_DIR, `${name}.css`);
  
  if (fs.existsSync(componentPath)) {
    console.error(`❌ Component ${name}.css already exists`);
    process.exit(1);
  }

  const template = `/**
 * ${name.charAt(0).toUpperCase() + name.slice(1)} Component
 * Component description goes here
 */

.${name} {
  /* Base component styles */
}

.${name}__element {
  /* Element styles */
}

.${name}--modifier {
  /* Modifier styles */
}

.${name}:hover,
.${name}.hover {
  /* Interactive states */
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .${name} {
    /* Mobile styles */
  }
}
`;

  fs.writeFileSync(componentPath, template);
  console.log(`✅ Created component: css/components/${name}.css`);
  console.log(`📝 Don't forget to import it in css/main.css`);
}

/**
 * Create a new utility CSS file
 */
function createUtility(name) {
  if (!name) {
    console.error('❌ Utility name is required');
    process.exit(1);
  }

  const utilityPath = path.join(UTILITIES_DIR, `${name}.css`);
  
  if (fs.existsSync(utilityPath)) {
    console.error(`❌ Utility ${name}.css already exists`);
    process.exit(1);
  }

  const template = `/**
 * ${name.charAt(0).toUpperCase() + name.slice(1)} Utilities
 * Utility classes for ${name}
 */

/* Base utility classes */
.${name}-class {
  /* Utility styles */
}

/* Responsive utilities */
@media (min-width: 768px) {
  .md\\:${name}-class {
    /* Medium screen utilities */
  }
}

@media (min-width: 1024px) {
  .lg\\:${name}-class {
    /* Large screen utilities */
  }
}
`;

  fs.writeFileSync(utilityPath, template);
  console.log(`✅ Created utility: css/utilities/${name}.css`);
  console.log(`📝 Don't forget to import it in css/main.css`);
}

/**
 * List all CSS files in the project
 */
function listFiles() {
  console.log('📁 CSS Architecture Overview:\n');
  
  const walkDir = (dir, prefix = '') => {
    const files = fs.readdirSync(dir).sort();
    
    files.forEach((file, index) => {
      const filePath = path.join(dir, file);
      const stats = fs.statSync(filePath);
      const isLast = index === files.length - 1;
      const connector = isLast ? '└── ' : '├── ';
      
      if (stats.isDirectory()) {
        console.log(`${prefix}${connector}${file}/`);
        walkDir(filePath, prefix + (isLast ? '    ' : '│   '));
      } else {
        const size = (stats.size / 1024).toFixed(1);
        console.log(`${prefix}${connector}${file} (${size}KB)`);
      }
    });
  };
  
  walkDir(CSS_DIR);
}

/**
 * Analyze CSS files for potential issues
 */
function analyze() {
  console.log('🔍 Analyzing CSS files...\n');
  
  let totalSize = 0;
  let fileCount = 0;
  const issues = [];
  
  const analyzeFile = (filePath) => {
    const content = fs.readFileSync(filePath, 'utf8');
    const stats = fs.statSync(filePath);
    const relativePath = path.relative(CSS_DIR, filePath);
    
    totalSize += stats.size;
    fileCount++;
    
    // Check for common issues
    if (content.includes('!important')) {
      issues.push(`⚠️  ${relativePath}: Contains !important declarations`);
    }
    
    if (content.length > 5000) {
      issues.push(`⚠️  ${relativePath}: Large file (${(stats.size / 1024).toFixed(1)}KB)`);
    }
    
    // Check for unused custom properties
    const customProps = content.match(/--[\w-]+/g) || [];
    const uniqueProps = [...new Set(customProps)];
    if (uniqueProps.length > 50) {
      issues.push(`💡 ${relativePath}: Many custom properties (${uniqueProps.length})`);
    }
  };
  
  const walkAndAnalyze = (dir) => {
    const files = fs.readdirSync(dir);
    files.forEach(file => {
      const filePath = path.join(dir, file);
      const stats = fs.statSync(filePath);
      
      if (stats.isDirectory()) {
        walkAndAnalyze(filePath);
      } else if (path.extname(file) === '.css') {
        analyzeFile(filePath);
      }
    });
  };
  
  walkAndAnalyze(CSS_DIR);
  
  console.log(`📊 Analysis Results:`);
  console.log(`   Files: ${fileCount}`);
  console.log(`   Total size: ${(totalSize / 1024).toFixed(1)}KB`);
  console.log(`   Average size: ${(totalSize / fileCount / 1024).toFixed(1)}KB per file\n`);
  
  if (issues.length > 0) {
    console.log('🚨 Issues found:');
    issues.forEach(issue => console.log(`   ${issue}`));
  } else {
    console.log('✅ No issues found!');
  }
}

/**
 * Show help information
 */
function showHelp() {
  console.log(`
CSS Utilities Script
===================

Usage: node scripts/css-utils.js <command> [arguments]

Commands:
  component <name>    Create a new CSS component file
  utility <name>      Create a new CSS utility file
  list               List all CSS files in the project
  analyze            Analyze CSS files for potential issues
  help               Show this help message

Examples:
  node scripts/css-utils.js component button
  node scripts/css-utils.js utility animations
  node scripts/css-utils.js list
  node scripts/css-utils.js analyze
`);
}

// Command line interface
const command = process.argv[2];
const argument = process.argv[3];

switch (command) {
  case 'component':
    createComponent(argument);
    break;
  case 'utility':
    createUtility(argument);
    break;
  case 'list':
    listFiles();
    break;
  case 'analyze':
    analyze();
    break;
  case 'help':
  case undefined:
    showHelp();
    break;
  default:
    console.error(`❌ Unknown command: ${command}`);
    showHelp();
    process.exit(1);
}