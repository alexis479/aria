# ARIA

Aplicación educativa con HTML, CSS, JavaScript y una función de servidor en Vercel.

## Ejecutar en local sin instalar paquetes

Requiere Node.js 22 o posterior. Desde la carpeta `aria-app`:

```powershell
node dev-server.js
```

Abrir http://localhost:3000. El servidor ejecuta la misma función `/api/aria` que se publica en Vercel.

Para conectar Gemini, crear `.env.local` con `GEMINI_API_KEY=tu_clave` (puede copiarse `.env.example`) y reiniciar el servidor con Ctrl+C y el mismo comando. Este archivo está excluido de Git. La clave guardada en Vercel no se descarga automáticamente a tu computadora. La generación sigue necesitando Internet y cuota del proveedor.

No es necesario instalar Vercel CLI ni ejecutar `npm install` para esta opción. El servidor escucha únicamente en esta computadora.

## Conectar la IA para todos los dispositivos

1. Abrir el proyecto vinculado a `alexis479/aria` en Vercel.
2. En Settings > Environment Variables crear `GEMINI_API_KEY` con una clave válida de Gemini. Seleccionar Production; añadir Preview solo si se necesita probar allí.
3. Crear un nuevo despliegue (Redeploy) después de guardar la variable.
4. Abrir `/api/aria`: debe mostrar `{"configured":true}`. Esto comprueba la existencia de la variable; enviar una pregunta desde la página verifica los permisos y la cuota.
5. Probar una pregunta en una ventana privada o en otro dispositivo, sin configurar ninguna clave local.

La clave solo se utiliza en `api/aria.js`, nunca se envía al navegador ni se guarda en el historial. Las conversaciones siguen guardándose por navegador y no se sincronizan entre dispositivos.

La configuración anterior que trataba todos los archivos como estáticos se retiró para permitir que Vercel ejecute la función `/api/aria`. Si Vercel solicita un preset, utilizar Other y la raíz de este repositorio; no configurar un comando de compilación ni una carpeta de salida separada.

`GEMINI_MODEL` es opcional. Sin él, el servidor descubre modelos disponibles para conversar. ARIA ofrece los modos Estudio, Investigar y Debate, además del modo Intérprete.

## Modo Intérprete

En la barra de modos, abrir **Intérprete**, elegir los idiomas de las dos personas y pulsar **Iniciar intérprete**. ARIA escucha una frase, la traduce, la lee en voz alta y luego escucha el turno de la otra persona. Incluye español, inglés, portugués, francés, alemán, italiano y japonés.

El navegador debe permitir el micrófono y ofrecer reconocimiento de voz y síntesis de voz para los idiomas elegidos. La traducción utiliza la conexión de Gemini configurada en el servidor y requiere Internet; el reconocimiento de voz puede depender del navegador o del sistema operativo.

El endpoint es público para que los visitantes puedan preguntar. Configurar límites de cuota en Google y reglas de tráfico en Vercel si se necesita controlar consumo público; no se incluye un límite distribuido por usuario.

## Pruebas

Con Node.js: `node --test tests/server.test.js`. No utiliza una clave real ni consume cuota de Google.
