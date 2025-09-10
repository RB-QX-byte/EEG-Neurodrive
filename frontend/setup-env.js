const fs = require('fs');
const path = require('path');

const envExamplePath = path.join(__dirname, '.env.example');
const envLocalPath = path.join(__dirname, '.env.local');

// Check if .env.local exists
if (!fs.existsSync(envLocalPath)) {
  console.log('🔧 Creating .env.local from .env.example...');
  
  if (fs.existsSync(envExamplePath)) {
    fs.copyFileSync(envExamplePath, envLocalPath);
    console.log('✅ .env.local created successfully!');
    console.log('📝 Please check and update the values in .env.local if needed.');
  } else {
    // Create default .env.local if .env.example doesn't exist
    const defaultConfig = `# Frontend Environment Configuration
NEXT_PUBLIC_API_URL=http://localhost:8080/api
`;
    fs.writeFileSync(envLocalPath, defaultConfig);
    console.log('✅ .env.local created with default configuration!');
  }
} else {
  console.log('✅ .env.local already exists.');
}