#!/usr/bin/env node

/**
 * Simple validation script to test modular integration
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Validating Wedding Photo App Integration...\n');

// Check that all module files exist
const moduleFiles = [
    'public/js/main.js',
    'public/js/config.js', 
    'public/js/state.js',
    'public/js/utils.js',
    'public/js/logger.js',
    'public/js/api-client.js',
    'public/js/photo-manager.js',
    'public/js/face-detection.js',
    'public/js/upload-manager.js',
    'public/js/filter-manager.js',
    'public/js/modal-manager.js'
];

let allFilesExist = true;

console.log('📂 Checking module files:');
moduleFiles.forEach(file => {
    const fullPath = path.join(__dirname, file);
    const exists = fs.existsSync(fullPath);
    const status = exists ? '✅' : '❌';
    console.log(`  ${status} ${file}`);
    if (!exists) allFilesExist = false;
});

// Check that legacy file is archived
const legacyExists = fs.existsSync(path.join(__dirname, 'public/script.js'));
const legacyArchived = fs.existsSync(path.join(__dirname, 'public/script-legacy.js'));

console.log('\n🗂  Legacy code handling:');
console.log(`  ${legacyExists ? '❌' : '✅'} script.js removed`);
console.log(`  ${legacyArchived ? '✅' : '❌'} script-legacy.js archived`);

// Check HTML file uses new system
const htmlPath = path.join(__dirname, 'public/index.html');
const htmlContent = fs.readFileSync(htmlPath, 'utf8');
const usesModules = htmlContent.includes('type="module"') && htmlContent.includes('js/main.js');
const hasLegacy = htmlContent.includes('script.js') && !htmlContent.includes('js/main.js');

console.log('\n📄 HTML integration:');
console.log(`  ${usesModules ? '✅' : '❌'} Uses ES modules`);
console.log(`  ${hasLegacy ? '❌' : '✅'} Legacy script.js removed`);

// Check server configuration
const serverPath = path.join(__dirname, 'server/index.js');
const serverContent = fs.readFileSync(serverPath, 'utf8');
const servesModules = serverContent.includes("app.use('/js'");

console.log('\n🌐 Server configuration:');
console.log(`  ${servesModules ? '✅' : '❌'} Serves JS modules`);

// Final summary
const allGood = allFilesExist && !legacyExists && legacyArchived && usesModules && !hasLegacy && servesModules;

console.log('\n' + '='.repeat(50));
if (allGood) {
    console.log('🎉 INTEGRATION VALIDATION PASSED!');
    console.log('✅ All module files present');
    console.log('✅ Legacy code properly archived');
    console.log('✅ HTML updated to use modules');
    console.log('✅ Server configured correctly');
    console.log('\n🚀 Ready to test in browser!');
    console.log('📱 Visit: http://localhost:3000?token=wedding-photo-gallery-2025');
} else {
    console.log('❌ INTEGRATION VALIDATION FAILED!');
    console.log('Please fix the issues above before testing.');
    process.exit(1);
}

console.log('='.repeat(50));