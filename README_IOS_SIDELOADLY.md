# InGe+ / AppCalicatas — Migración iOS con Capacitor

Este paquete es una **migración híbrida iOS** del proyecto Android/Qt Creator `AppCalicatasMobile / InGe+` hacia el flujo usado para iOS con **HTML + CSS + JavaScript + Capacitor**.

## Estado real de la migración

Se migró la interfaz principal y los iconos reales del proyecto Qt:

- Pantalla de inicio de sesión.
- Registro de cuenta.
- Modo local/offline.
- Home con tarjetas: Ficha de Calicata, Ficha de Talud, Perfiles Estratigráficos y Estaciones Geomecánicas.
- Navegación inferior: Inicio, GPS, Documentos y Perfil.
- Formulario editable de ficha de calicata con cortes/estratos.
- Guardado local en el dispositivo.
- Exportación tipo Excel mediante archivo `.xls` compatible con Excel.
- GPS del dispositivo y conversión Lat/Lon a UTM.
- Prueba de internet y prueba de servidor Supabase.
- Iconos iOS generados desde el icono real InGe+.

## Lo que NO se puede migrar 1 a 1 automáticamente

El proyecto original está hecho con Qt/C++/QML. Capacitor no compila directamente código C++ de Qt. Por eso estas partes se tuvieron que reemplazar por equivalentes web:

- `QXlsx` → exportación `.xls` desde HTML/JS.
- `QSettings` → `localStorage`.
- `QtPositioning` → `navigator.geolocation`.
- `QNetworkAccessManager` → `fetch()`.
- `Qt Widgets / .ui` → interfaz HTML/CSS responsive.
- Recursos `qrc:/` → carpeta `www/assets/`.

Si necesitas que la exportación sea exactamente igual al Excel original de Qt, se debe hacer una segunda fase conectando una plantilla `.xlsx` o usando un backend que genere el Excel.

## Prueba rápida en Windows

1. Descomprime este ZIP.
2. Ejecuta:

```bat
01_PROBAR_APP_EN_WINDOWS.bat
```

3. Abre en tu PC:

```text
http://localhost:9000
```

Para verlo desde un iPhone en la misma red WiFi, abre en Safari:

```text
http://IP-DE-TU-PC:9000
```

Ejemplo:

```text
http://192.168.1.25:9000
```

## Preparar iOS en Mac

En Mac necesitas:

- Xcode instalado.
- Node.js LTS instalado.
- Un Apple ID para firmar.
- iPhone con modo desarrollador activado.

Luego ejecuta:

```bash
./02_PREPARAR_IOS_EN_MAC.command
```

Eso hará:

1. `npm install`
2. `npx cap add ios`
3. `npx cap sync ios`
4. Copia de iconos reales a Xcode.
5. Apertura del proyecto en Xcode.

## Compilar e instalar

### Opción A: instalar directo desde Xcode

1. Conecta el iPhone por cable.
2. En Xcode selecciona el dispositivo.
3. En `Signing & Capabilities`, elige tu Team.
4. Cambia el Bundle Identifier si Xcode lo pide, por ejemplo:

```text
com.ingema.ingeplus.fabrizio
```

5. Presiona **Run**.

### Opción B: generar IPA para Sideloadly

Después de preparar iOS, ejecuta:

```bash
./03_CREAR_IPA_PARA_SIDELOADLY_MAC.command
```

Si todo sale bien, se genera:

```text
build/InGePlus_Sideloadly_unsigned.ipa
```

Luego abre Sideloadly, selecciona ese `.ipa`, conecta tu iPhone y firma con tu Apple ID.

## Configuración del servidor

El archivo que debes editar si cambia el servidor es:

```text
www/config.js
```

Actualmente contiene:

```js
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_BUCKET
```

Después de cambiar datos del servidor, ejecuta otra vez:

```bash
npx cap sync ios
```

## Solución de errores comunes

### No abre en iPhone desde Safari

- PC y iPhone deben estar en la misma WiFi.
- Permite el puerto 9000 en Firewall de Windows.
- Usa la IP local de tu PC, no `localhost`.

### Sideloadly no instala

- Activa modo desarrollador en iPhone.
- Confía en el perfil del Apple ID en Ajustes del iPhone.
- Revisa que el IPA se haya generado correctamente.
- Si usas Apple ID con doble factor, Sideloadly puede pedir autenticación adicional.

### Xcode falla en Signing

- Cambia el Bundle Identifier para que sea único.
- Selecciona tu Team.
- Limpia build: `Product > Clean Build Folder`.

## Próxima fase recomendada

Para dejarlo como app final de producción se recomienda:

1. Reproducir el formato Excel exacto de la plantilla Qt.
2. Conectar Documentos a Supabase Storage.
3. Agregar carga real de fotos por ficha.
4. Crear flujo de sincronización online/offline.
5. Probar en iPhone físico y corregir errores uno por uno.
