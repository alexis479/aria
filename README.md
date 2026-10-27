# ARIA

Aplicación educativa con HTML, CSS, JavaScript y una función de servidor en Vercel.

## Conectar la IA para todos los dispositivos

1. Abrir el proyecto vinculado a `alexis479/aria` en Vercel.
2. En Settings > Environment Variables crear `GEMINI_API_KEY` con una clave válida de Gemini. Seleccionar Production; añadir Preview solo si se necesita probar allí.
3. Crear un nuevo despliegue (Redeploy) después de guardar la variable.
4. Abrir `/api/aria`: debe mostrar `{"configured":true}`. Esto comprueba la existencia de la variable; enviar una pregunta desde la página verifica los permisos y la cuota.
5. Probar una pregunta en una ventana privada o en otro dispositivo, sin configurar ninguna clave local.

La clave solo se utiliza en `api/aria.js`, nunca se envía al navegador ni se guarda en el historial. Las conversaciones siguen guardándose por navegador y no se sincronizan entre dispositivos.

La configuración anterior que trataba todos los archivos como estáticos se retiró para permitir que Vercel ejecute la función `/api/aria`. Si Vercel solicita un preset, utilizar Other y la raíz de este repositorio; no configurar un comando de compilación ni una carpeta de salida separada.

`GEMINI_MODEL` es opcional. Sin él, el servidor descubre modelos disponibles para conversar. ARIA ofrece los modos Estudio, Investigar y Debate.

El endpoint es público para que los visitantes puedan preguntar. Configurar límites de cuota en Google y reglas de tráfico en Vercel si se necesita controlar consumo público; no se incluye un límite distribuido por usuario.

## Pruebas

Con Node.js: `node --test tests/server.test.js`. No utiliza una clave real ni consume cuota de Google.
