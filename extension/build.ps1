# Build script for MeterX extension

Write-Host "Building MeterX extension..." -ForegroundColor Cyan

# Run Vite build
npx vite build

# Fix paths in popup.html
$popupHtml = Get-Content -Path "dist/popup.html" -Raw
$popupHtml = $popupHtml -replace 'src="/([^"]+)"', 'src="$1"' -replace 'href="/([^"]+)"', 'href="$1"'
Set-Content -Path "dist/popup.html" -Value $popupHtml

# Copy images to dist folder
if (!(Test-Path -Path "dist/images")) {
    Copy-Item -Path "images" -Destination "dist/images" -Recurse -Force
}

Write-Host "Build completed successfully!" -ForegroundColor Green
Write-Host "To load the extension in Chrome/Brave:" -ForegroundColor Yellow
Write-Host "1. Go to chrome://extensions or brave://extensions" -ForegroundColor Yellow
Write-Host "2. Enable Developer mode" -ForegroundColor Yellow
Write-Host "3. Click 'Load unpacked'" -ForegroundColor Yellow
Write-Host "4. Select the extension folder (not the dist folder)" -ForegroundColor Yellow