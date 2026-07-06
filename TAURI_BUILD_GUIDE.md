# Guía para compilar una aplicación Tauri (.exe) en Windows

Para crear un ejecutable (`.exe`) de tu aplicación Tauri en Windows, necesitas asegurarte de tener los prerrequisitos instalados y luego ejecutar el comando de construcción. Aquí tienes una guía paso a paso:

## 1. Prerrequisitos del Sistema (Windows)
Antes de compilar, necesitas tener instaladas las herramientas de desarrollo para Windows. Si ya has estado desarrollando la app en esta computadora, probablemente ya las tengas, pero por las dudas verifica tener:

*   **Node.js**: Para manejar las dependencias del frontend.
*   **Rust**: El lenguaje principal de Tauri.
*   **Microsoft C++ Build Tools**: Necesario para compilar código de Rust en Windows. (Se instala normalmente a través del instalador de Visual Studio, seleccionando la carga de trabajo "Desarrollo para el escritorio con C++" y asegurándote de incluir el SDK de Windows 10/11).

## 2. Configurar el Identificador Único
Antes de poder construir la aplicación para producción (el `.exe`), Tauri exige que cambies el identificador por defecto (`com.tauri.dev`) por uno propio, de lo contrario el proceso fallará.

1. Abre el archivo `src-tauri/tauri.conf.json`.
2. Busca la propiedad `"identifier"` (dentro de `"tauri"` o `"app"`, dependiendo de tu versión de Tauri).
3. Cámbialo por algo único para tu app. Ejemplo: `"com.miapp.desktop"`.

```json
{
  "identifier": "com.miapp.desktop"
}
```

## 3. Ejecutar el Comando de Build
Abre tu terminal en la carpeta raíz de tu proyecto (donde está tu `package.json`) y ejecuta el comando de build correspondiente al gestor de paquetes que estés utilizando:

*   **Si usas npm:**
    ```bash
    npm run tauri build
    ```
*   **Si usas yarn:**
    ```bash
    yarn tauri build
    ```
*   **Si usas pnpm:**
    ```bash
    pnpm tauri build
    ```
*   **Si usas bun:**
    ```bash
    bun tauri build
    ```
*   **Si usas Cargo directamente (Rust):**
    ```bash
    cargo tauri build
    ```

> **Nota:** Este proceso tomará varios minutos la primera vez, ya que Rust tiene que descargar y compilar todas las dependencias (crates) desde cero con optimizaciones de producción.

## 4. ¿Dónde encuentro el `.exe`?
Una vez que el proceso termine exitosamente, Tauri generará el ejecutable y los instaladores. Los encontrarás dentro de la carpeta de tu proyecto en las siguientes rutas:

*   **Instalador (Recomendado para distribuir):**
    `src-tauri/target/release/bundle/nsis/` (Aquí encontrarás un archivo como `tu-app_1.0.0_x64-setup.exe` que instala la app en la PC del usuario).
*   **Ejecutable independiente (Standalone):**
    `src-tauri/target/release/tu-app.exe` (Este es el ejecutable directo de tu aplicación, aunque distribuirlo solo puede dar problemas si la PC del usuario no tiene instalado el componente `WebView2`. Por eso siempre es mejor compartir el instalador `nsis` que se encarga de instalar WebView2 automáticamente si falta).

## Tip Extra: Cambiar el icono
Si en el futuro necesitas actualizar el icono de tu `.exe`, puedes colocar tu imagen base (preferiblemente un `.png` de 1024x1024) en tu proyecto y ejecutar el siguiente comando para que Tauri genere todos los `.ico` y `.icns` automáticamente antes de hacer el build:

```bash
npm run tauri icon ruta/a/tu/icono.png
```
