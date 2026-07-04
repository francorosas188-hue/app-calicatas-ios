# Reporte de migración Qt → iOS Capacitor

## Archivo revisado

Se revisó el comprimido `PROYECTOS QT.rar`. Dentro del RAR se encontró un ZIP extraíble llamado `AppCalicatasDemo.zip` con el proyecto Qt Creator completo.

## Proyecto detectado

- Nombre Qt: `AppCalicatasDemo`
- Target móvil: `AppCalicatasMobile`
- Versión detectada en CMake: `1.0.8`
- Framework original: Qt 6 / C++ / QML
- Paquete Android detectado: `com.ingema.ingeplus`
- Servidor configurado: Supabase
- Bucket configurado: `IngePlus`

## Archivos Qt importantes detectados

- `CMakeLists.txt`
- `main_mobile.cpp`
- `qml/Mobile/Main.qml`
- `qml/Mobile/AppShell.qml`
- `qml/Mobile/BottomNav.qml`
- `qml/Mobile/pages/HomePageContent.qml`
- `qml/Mobile/pages/LoginPageForm.qml`
- `qml/Mobile/pages/RegisterPageForm.qml`
- `qml/Mobile/pages/CalicataFormPage.qml`
- `qml/Mobile/pages/MapPageContent.qml`
- `qml/Mobile/pages/DocsPageContent.qml`
- `authsession.cpp`
- `supabaseclient.cpp`
- `appcontext.cpp`
- `androidcalicataexporter.cpp`

## Recursos migrados

Se copiaron iconos e imágenes reales desde `images/` y `SUCS/` hacia:

```text
www/assets/images/
www/assets/sucs/
www/assets/templates/
```

También se generó un set de iconos iOS en:

```text
resources/ios/AppIcon.appiconset/
```

## Equivalencias aplicadas

| Qt original | Migración Capacitor/web |
|---|---|
| QML Pages | HTML sections + CSS responsive |
| Qt Quick Controls | Botones, formularios, navegación CSS/JS |
| QtPositioning | `navigator.geolocation` |
| QNetworkAccessManager | `fetch()` |
| QSettings | `localStorage` |
| QXlsx | Exportación `.xls` compatible con Excel |
| qrc resources | `www/assets/` |
| Android Manifest | `capacitor.config.json` + Xcode/iOS |

## Limitaciones actuales

Esta entrega no es una conversión automática del binario Android ni recompila Qt para iOS. Es una migración funcional base al flujo Capacitor. Para compilar e instalar en iPhone se necesita Mac con Xcode o un servicio de compilación iOS.

El entorno donde se preparó este paquete no tiene Xcode, por lo que no se puede entregar un `.ipa` ya compilado desde aquí. Se entrega el proyecto listo para generar el iOS project con Capacitor.

## Validación básica realizada

- Se verificó que `index.html`, `styles.css`, `app.js`, `config.js`, `package.json` y `capacitor.config.json` existen.
- Se revisó sintaxis de `app.js` con Node.
- Se verificó que las referencias principales de assets existen.
- Se generaron iconos iOS desde el recurso real del proyecto.
