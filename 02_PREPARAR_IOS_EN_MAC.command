#!/bin/bash
set -e
cd "$(dirname "$0")"
echo "============================================================"
echo " INGE+ / AppCalicatas - preparar proyecto iOS con Capacitor"
echo "============================================================"
if ! command -v node >/dev/null 2>&1; then
  echo "[ERROR] Node.js no está instalado. Instala Node LTS primero."
  exit 1
fi
if ! command -v xcodebuild >/dev/null 2>&1; then
  echo "[ERROR] Xcode Command Line Tools no está disponible. Instala Xcode desde App Store."
  exit 1
fi
npm install
if [ ! -d "ios" ]; then
  npx cap add ios
fi
npx cap sync ios
if [ -d "resources/ios/AppIcon.appiconset" ] && [ -d "ios/App/App/Assets.xcassets" ]; then
  rm -rf "ios/App/App/Assets.xcassets/AppIcon.appiconset"
  cp -R "resources/ios/AppIcon.appiconset" "ios/App/App/Assets.xcassets/AppIcon.appiconset"
  echo "[OK] Iconos iOS copiados."
fi
npx cap open ios
