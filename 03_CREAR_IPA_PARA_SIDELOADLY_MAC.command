#!/bin/bash
set -e
cd "$(dirname "$0")"
echo "============================================================"
echo " Crear IPA para Sideloadly - requiere Xcode y proyecto iOS generado"
echo "============================================================"
if [ ! -d "ios/App" ]; then
  echo "[ERROR] Primero ejecuta 02_PREPARAR_IOS_EN_MAC.command"
  exit 1
fi
npx cap sync ios
rm -rf build
mkdir -p build
# Intenta generar .app sin firma para que Sideloadly lo pueda firmar.
# Si falla, abre Xcode y configura Signing & Capabilities manualmente.
xcodebuild \
  -workspace ios/App/App.xcworkspace \
  -scheme App \
  -configuration Release \
  -sdk iphoneos \
  -derivedDataPath build/DerivedData \
  CODE_SIGNING_ALLOWED=NO \
  build
APP_PATH=$(find build/DerivedData -path "*/Build/Products/Release-iphoneos/App.app" -type d | head -n 1)
if [ -z "$APP_PATH" ]; then
  echo "[ERROR] No se encontró App.app. Revisa errores de xcodebuild."
  exit 1
fi
mkdir -p build/Payload
cp -R "$APP_PATH" "build/Payload/InGePlus.app"
(cd build && zip -qry InGePlus_Sideloadly_unsigned.ipa Payload)
echo "[OK] IPA creado: build/InGePlus_Sideloadly_unsigned.ipa"
echo "Ahora abre Sideloadly y selecciona ese IPA."
