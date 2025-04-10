# Remove build and cache directories
Remove-Item -Path ".next" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path "dist" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path "node_modules" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path ".vercel" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path ".swc" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path ".turbo" -Recurse -Force -ErrorAction SilentlyContinue

# Remove SQL files
Remove-Item -Path "*.sql" -Force -ErrorAction SilentlyContinue

# Remove Vite config files
Remove-Item -Path "vite.config.ts*" -Force -ErrorAction SilentlyContinue

# Remove environment files except .env
Remove-Item -Path ".env.*" -Force -ErrorAction SilentlyContinue
Remove-Item -Path ".env.local" -Force -ErrorAction SilentlyContinue
Remove-Item -Path ".env.production" -Force -ErrorAction SilentlyContinue
Remove-Item -Path ".env.example" -Force -ErrorAction SilentlyContinue

# Remove other unnecessary files
Remove-Item -Path "bun.lockb" -Force -ErrorAction SilentlyContinue
Remove-Item -Path "index.html" -Force -ErrorAction SilentlyContinue
Remove-Item -Path "vercel.json" -Force -ErrorAction SilentlyContinue

Write-Host "Cleanup completed successfully!" 