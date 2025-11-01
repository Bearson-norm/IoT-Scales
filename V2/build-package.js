const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('📦 Building IoT Scales V2 Package...\n');

// Step 1: Build React app
console.log('1️⃣  Building React frontend...');
try {
  execSync('npm run build', { stdio: 'inherit' });
  console.log('✅ Frontend build complete\n');
} catch (error) {
  console.error('❌ Frontend build failed');
  process.exit(1);
}

// Step 2: Install pkg if not installed
console.log('2️⃣  Checking pkg installation...');
try {
  require.resolve('pkg');
  console.log('✅ pkg already installed\n');
} catch (error) {
  console.log('📥 Installing pkg...');
  execSync('npm install -g pkg', { stdio: 'inherit' });
  console.log('✅ pkg installed\n');
}

// Step 3: Create release directory
const releaseDir = path.join(__dirname, 'release');
if (!fs.existsSync(releaseDir)) {
  fs.mkdirSync(releaseDir, { recursive: true });
}

// Step 4: Package with pkg
console.log('3️⃣  Packaging server executable...');
try {
  // Clean up old executables to avoid conflicts
  const oldFiles = [
    path.join(releaseDir, 'iot-scales-v2.exe'),
    path.join(releaseDir, 'server.exe'),
    path.join(releaseDir, 'prisma-form-pro.exe')
  ];
  oldFiles.forEach(file => {
    if (fs.existsSync(file)) {
      fs.unlinkSync(file);
    }
  });
  
  // Build executable directly with output name (using -o for output)
  const outputExe = path.join(releaseDir, 'iot-scales-v2.exe');
  execSync(`pkg server.js --targets node18-win-x64 -o "${outputExe}"`, { stdio: 'inherit' });
  
  // Verify executable was created
  if (fs.existsSync(outputExe)) {
    console.log('✅ Executable created successfully: iot-scales-v2.exe\n');
  } else {
    // Fallback: check for other names and rename
    const oldName1 = path.join(releaseDir, 'prisma-form-pro.exe');
    const oldName2 = path.join(releaseDir, 'server.exe');
    
    if (fs.existsSync(oldName2)) {
      fs.renameSync(oldName2, outputExe);
      console.log('✅ Executable created and renamed from server.exe\n');
    } else if (fs.existsSync(oldName1)) {
      fs.renameSync(oldName1, outputExe);
      console.log('✅ Executable created and renamed from prisma-form-pro.exe\n');
    } else {
      console.log('⚠️  Warning: Could not find executable in release folder\n');
      console.log('   Please check if pkg build was successful\n');
    }
  }
} catch (error) {
  console.error('❌ Packaging failed');
  process.exit(1);
}

// Step 5: Copy necessary files to release directory
console.log('4️⃣  Copying files to release directory...');
const filesToCopy = [
  { from: 'dist', to: 'dist' },
  { from: 'database', to: 'database' },
  { from: 'uploads', to: 'uploads' },
  { from: 'package.json', to: 'package.json' },
  { from: 'README.md', to: 'README.md' },
  { from: 'LICENSE', to: 'LICENSE', optional: true },
  { from: 'setup-database.bat', to: 'setup-database.bat', optional: false },
  // Serialport modules - copy complete with all dependencies
  { from: 'node_modules/serialport', to: 'node_modules/serialport', checkNative: false },
  { from: 'node_modules/@serialport', to: 'node_modules/@serialport', optional: false },
  // Serialport dependencies that may be needed
  { from: 'node_modules/debug', to: 'node_modules/debug', optional: true },
  { from: 'node_modules/node-gyp-build', to: 'node_modules/node-gyp-build', optional: true },
  { from: 'node_modules/node-addon-api', to: 'node_modules/node-addon-api', optional: true }
];

filesToCopy.forEach(({ from, to, optional, checkNative }) => {
  const sourcePath = path.join(__dirname, from);
  const destPath = path.join(releaseDir, to);
  
  if (!fs.existsSync(sourcePath)) {
    if (optional) {
      console.log(`⚠️  ${from} not found (optional, skipping)`);
      return;
    }
    console.log(`⚠️  ${from} not found, creating empty directory`);
    if (!fs.existsSync(destPath)) {
      fs.mkdirSync(destPath, { recursive: true });
    }
    return;
  }
  
  const stats = fs.statSync(sourcePath);
  if (stats.isDirectory()) {
    copyDirectory(sourcePath, destPath);
    console.log(`   ✅ Copied ${from} → ${to}`);
    
    // Check for native bindings if needed (for serialport)
    if (from.includes('serialport')) {
      // Check for serialport 12.x prebuilds structure
      if (from.includes('@serialport')) {
        const prebuildsPath = path.join(destPath, 'bindings-cpp', 'prebuilds', 'win32-x64');
        const prebuildFile = path.join(prebuildsPath, 'node.napi.node');
        if (fs.existsSync(prebuildFile)) {
          console.log(`   ✅ Found native bindings for win32-x64 (serialport 12.x)`);
        } else {
          // Check alternative paths for prebuilds
          const altPaths = [
            path.join(destPath, 'prebuilds', 'win32-x64'),
            path.join(destPath, 'build', 'Release', 'win32-x64')
          ];
          let found = false;
          for (const altPath of altPaths) {
            if (fs.existsSync(altPath)) {
              const nodeFiles = fs.readdirSync(altPath).filter(f => f.endsWith('.node'));
              if (nodeFiles.length > 0) {
                console.log(`   ✅ Found native bindings at: ${altPath}`);
                found = true;
                break;
              }
            }
          }
          if (!found) {
            console.log(`   ⚠️  Warning: Native bindings for win32-x64 not found`);
            console.log(`      Expected: ${prebuildFile}`);
          }
        }
      } else if (checkNative) {
        // Legacy check for old serialport structure
        const nativeBindingsPath = path.join(destPath, 'build', 'Release');
        if (fs.existsSync(nativeBindingsPath)) {
          const nativeFiles = fs.readdirSync(nativeBindingsPath).filter(f => f.endsWith('.node'));
          if (nativeFiles.length > 0) {
            console.log(`   ✅ Native bindings (.node files) found: ${nativeFiles.join(', ')}`);
          } else {
            console.log(`   ⚠️  Warning: No native bindings (.node files) found`);
          }
        }
      }
    }
  } else {
    fs.copyFileSync(sourcePath, destPath);
    console.log(`   ✅ Copied ${from} → ${to}`);
  }
});

// Step 6: Verify serialport installation
console.log('\n5️⃣  Verifying serialport installation...');
const verifySerialport = () => {
  const nodeModulesPath = path.join(releaseDir, 'node_modules');
  const serialportPath = path.join(nodeModulesPath, 'serialport');
  const serialportScopedPath = path.join(nodeModulesPath, '@serialport');
  
  const checks = [];
  
  // Check serialport main module
  if (fs.existsSync(serialportPath)) {
    checks.push({ name: 'serialport module', status: true, path: serialportPath });
    
    // Check serialport package.json
    const serialportPkg = path.join(serialportPath, 'package.json');
    if (fs.existsSync(serialportPkg)) {
      const pkg = JSON.parse(fs.readFileSync(serialportPkg, 'utf8'));
      checks.push({ name: `serialport version ${pkg.version}`, status: true, path: serialportPkg });
    }
    
    // Check serialport main entry
    const mainEntry = path.join(serialportPath, 'dist', 'index.js');
    if (fs.existsSync(mainEntry)) {
      checks.push({ name: 'serialport main entry', status: true, path: mainEntry });
    }
  } else {
    checks.push({ name: 'serialport module', status: false, path: serialportPath });
  }
  
  // Check @serialport scoped packages
  if (fs.existsSync(serialportScopedPath)) {
    const scopedPackages = fs.readdirSync(serialportScopedPath);
    checks.push({ name: `@serialport packages (${scopedPackages.length} found)`, status: true, path: serialportScopedPath });
    
    // Specifically check bindings-cpp (most important)
    const bindingsPath = path.join(serialportScopedPath, 'bindings-cpp');
    if (fs.existsSync(bindingsPath)) {
      const prebuildsPath = path.join(bindingsPath, 'prebuilds', 'win32-x64');
      const nodeFile = path.join(prebuildsPath, 'node.napi.node');
      if (fs.existsSync(nodeFile)) {
        checks.push({ name: 'serialport native bindings (win32-x64)', status: true, path: nodeFile });
      } else {
        checks.push({ name: 'serialport native bindings (win32-x64)', status: false, path: prebuildsPath });
      }
    }
  } else {
    checks.push({ name: '@serialport packages', status: false, path: serialportScopedPath });
  }
  
  // Check optional dependencies
  const optionalDeps = ['debug', 'node-gyp-build', 'node-addon-api'];
  optionalDeps.forEach(dep => {
    const depPath = path.join(nodeModulesPath, dep);
    if (fs.existsSync(depPath)) {
      checks.push({ name: `dependency: ${dep}`, status: true, path: depPath });
    }
  });
  
  // Print results
  console.log('\n   Verification Results:');
  checks.forEach(check => {
    if (check.status) {
      console.log(`   ✅ ${check.name}`);
    } else {
      console.log(`   ❌ ${check.name} - NOT FOUND`);
      console.log(`      Expected at: ${check.path}`);
    }
  });
  
  const allPassed = checks.every(c => c.status || c.name.includes('dependency'));
  return allPassed;
};

const serialportVerified = verifySerialport();

console.log('\n✅ Package build complete!');
console.log(`📁 Release files are in: ${releaseDir}`);
if (serialportVerified) {
  console.log('✅ Serialport module verified - ready for standalone use!');
} else {
  console.log('⚠️  Warning: Serialport verification failed. Please check the errors above.');
}
console.log('\n📋 Next steps:');
console.log('   1. Run the installer builder: npm run build:installer');
console.log('   2. Or use Inno Setup manually with installer.iss');
console.log('   3. Test the executable to ensure serialport works correctly');

function copyDirectory(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  
  const entries = fs.readdirSync(src, { withFileTypes: true });
  
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    if (entry.isDirectory()) {
      copyDirectory(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

