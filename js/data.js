/**
 * data.js — Base de conocimientos de ARIA
 * Todas las respuestas, debates y temas de la feria
 */

'use strict';

// ── Temas para botones rápidos en sidebar ──
const TOPICS = [
  'Fotosíntesis', 'Mitosis', 'HTML', 'CSS',
  'JavaScript', 'Variable', 'ADN', 'Bolivia 9 deptos',
  '2+2', 'Gravedad', 'Átomo', 'Agua',
];

// ── Respuestas a afirmaciones INCORRECTAS (modo debate) ──
const DEBATES = [
  {
    k: ['tierra es plana', 'tierra plana', 'la tierra es plana', 'terraplanista'],
    r: `¡Ahí tengo que debatirte! 🌍 La Tierra NO es plana. La evidencia es masiva:
• Las fotos satelitales desde los años 60 lo confirman.
• Los eclipses lunares muestran la sombra circular de la Tierra.
• Los barcos desaparecen por el horizonte de abajo hacia arriba.
• Puedes volar en avión y dar la vuelta completa.
¿Algún argumento de tu lado para que lo debatamos en la feria?`,
    tag: 'debate',
  },
  {
    k: ['2+2=5', 'dos mas dos es cinco', 'dos más dos es cinco', '2+2 es 5'],
    r: `Jajaja, clásico. ❌ 2+2 = 4, siempre. No cambia si estás en La Paz o en la Luna.
En matemáticas, 2 unidades + 2 unidades = 4 unidades. Eso es la base de toda aritmética.
Si 2+2 fuera 5, el internet, los bancos y los satélites no funcionarían. ¿Quieres que te explique por qué esto es importante para programar?`,
    tag: 'debate',
  },
  {
    k: ['fotosintesis de noche', 'fotosíntesis de noche', 'las plantas hacen fotosintesis de noche'],
    r: `¡Momento de debate! 🌙 La fotosíntesis NO ocurre de noche.
¿Por qué? Porque necesita luz solar para funcionar:
  Luz + CO₂ + Agua → Glucosa + Oxígeno
De noche, las plantas hacen respiración celular (consumen oxígeno), pero no fotosíntesis.
Es como decir que cargas tu celular sin enchufe. De día sí, de noche no. ¿Quieres la diferencia completa entre fotosíntesis y respiración?`,
    tag: 'debate',
  },
  {
    k: ['bolivia no tiene departamentos', 'bolivia sin departamentos'],
    r: `¡A debatir! 🇧🇴 Bolivia SÍ tiene 9 departamentos, está en la Constitución Política del Estado.
Los 9 son: La Paz, Santa Cruz, Cochabamba, Oruro, Potosí, Chuquisaca, Tarija, Beni y Pando.
Decir que no tiene es borrar medio mapa. ¿Te los nombro con sus capitales para tu feria?`,
    tag: 'debate',
  },
  {
    k: ['historia no sirve', 'la historia no sirve', 'no necesito estudiar', 'estudiar no sirve', 'para que estudiar', 'para qué estudiar'],
    r: `Te entiendo, a veces da flojera 😅, pero te debato eso:
Sin historia no sabrías por qué Bolivia es plurinacional, por qué hablamos español y quechua, o por qué hay litio en Uyuni.
Estudiar no es memorizar fechas, es tener argumentos para no dejarte engañar.
¿Qué materia te aburre más? La hacemos interesante.`,
    tag: 'debate',
  },
  {
    k: ['sol gira alrededor', 'el sol gira alrededor de la tierra'],
    r: `¡Clásico! ☀️ Parece que el sol gira, pero es la Tierra la que gira sobre sí misma (rotación) y alrededor del sol (traslación).
Lo demostró Galileo y lo vemos con las estaciones y el efecto Coriolis.
Si el sol girara alrededor nuestro, las órbitas de Marte y Júpiter no cuadrarían matemáticamente.
¿Te explico con una linterna y una pelota cómo funciona?`,
    tag: 'debate',
  },
  {
    k: ['agua no moja', 'el agua no moja'],
    r: `Jajaja buena para debatir 💧 El agua SÍ moja — "mojar" significa dejar líquido en una superficie.
Lo que pasa es que el agua pura tiene tensión superficial alta (las moléculas se atraen entre sí), por eso a veces parece que no penetra.
Pero si te metes al Titicaca, salís mojado seguro. 😄 ¿Quieres aprender sobre tensión superficial?`,
    tag: 'debate',
  },
  {
    k: ['vacunas son malas', 'vacunas hacen daño', 'las vacunas son malas'],
    r: `Acá me pongo serio 💉 La evidencia científica masiva (miles de estudios) muestra que las vacunas salvan millones de vidas al año.
Bolivia bajó la mortalidad infantil gracias a la vacunación. Pueden tener efectos secundarios leves (dolor, fiebre), pero el beneficio es enorme.
¿Quieres que te explique cómo funciona una vacuna? Es fascinante a nivel biológico.`,
    tag: 'debate',
  },
  {
    k: ['la luna no existe', 'la luna es falsa', 'no fuimos a la luna'],
    r: `🌙 ¡Debate interesante! La Luna SÍ existe — está a 384,400 km de la Tierra y la puedes ver con binoculares.
El alunizaje del Apollo 11 (1969) está documentado con: muestras de roca lunar, retroreflectores que usamos HOY para medir distancias, y transmisiones vistas por 600 millones de personas.
¿Quieres que te explique cómo funciona la gravedad lunar?`,
    tag: 'debate',
  },
];

// ── Respuestas cuando el usuario dice algo CORRECTO ──
const CORRECTOS = [
  {
    k: ['tierra es redonda', 'tierra es esferica', 'tierra es esférica', 'la tierra es redonda'],
    r: `¡Exacto! 🎯 La Tierra es casi esférica (achatada en los polos). Eso es la base para entender gravedad, husos horarios y satélites.
En la feria eso te da puntos extras si lo explains con evidencia. ¿Siguiente nivel?`,
  },
  {
    k: ['2+2 es 4', '2+2=4', 'dos mas dos es cuatro', 'dos más dos es cuatro'],
    r: `¡Perfecto! ✅ 4, cerrado. Esa lógica es la base de toda programación.
Si dominas eso, ya puedes hacer un \`if\` en JavaScript. ¿Quieres verlo en código?`,
  },
  {
    k: ['fotosintesis de dia', 'fotosíntesis de día', 'fotosintesis es de dia', 'fotosíntesis es de día'],
    r: `¡Capo! 💪 Sí, de día con luz solar. Clavaste el concepto clave.
Mucha gente se confunde con la respiración celular nocturna. Si lo explicas así en la feria, te ponen 100.`,
  },
  {
    k: ['bolivia tiene 9 departamentos', 'bolivia tiene nueve departamentos'],
    r: `¡Sí! 🇧🇴 9 departamentos. Eso es cultura general que te salva en la feria.
¿Te sabes sus capitales también? Te las recito si quieres.`,
  },
  {
    k: ['el agua moja', 'el agua si moja', 'el agua sí moja'],
    r: `¡Correcto! 💧 El agua moja. Simple y verificable.
La tensión superficial a veces hace parecer que no, pero en contacto real, moja. Bien ahí.`,
  },
];

// ── Respuestas a preguntas temáticas ──
const TEMAS = [
  // ── BIOLOGÍA ──
  {
    k: ['que es fotosintesis', 'qué es fotosíntesis', 'fotosintesis', 'fotosíntesis', 'como funciona la fotosintesis'],
    r: `🌿 **Fotosíntesis** — proceso que hacen las plantas para crear su propio alimento.

La fórmula es:
  6CO₂ + 6H₂O + Luz ☀️ → C₆H₁₂O₆ (glucosa) + 6O₂

En palabras simples:
• Las plantas toman dióxido de carbono del aire
• Absorben agua por las raíces
• Usan la luz solar como energía
• Producen glucosa (su comida) y liberan oxígeno (el que respiramos)

Ocurre en los **cloroplastos**, que tienen clorofila (el pigmento verde). ¿Quieres más detalle sobre alguna parte?`,
    tag: 'biologia',
  },
  {
    k: ['que es la mitosis', 'qué es la mitosis', 'mitosis', 'division celular', 'división celular'],
    r: `🔬 **Mitosis** — división celular que produce dos células idénticas.

Las 4 fases son:
1. **Profase** → el ADN se condensa en cromosomas
2. **Metafase** → cromosomas se alinean en el centro
3. **Anafase** → cromosomas se separan hacia los polos
4. **Telofase** → se forman dos núcleos, la célula se divide

¿Para qué sirve? Para crecer, reparar tejidos y reemplazar células viejas.
NO sirve para reproducción sexual (eso es meiosis). ¿Quieres la diferencia mitosis vs meiosis?`,
    tag: 'biologia',
  },
  {
    k: ['que es el adn', 'qué es el adn', 'que es adn', 'adn', 'dna', 'acido desoxirribonucleico'],
    r: `🧬 **ADN** (Ácido Desoxirribonucleico) — el manual de instrucciones de todo ser vivo.

• Tiene forma de **doble hélice** (como una escalera enrollada)
• Está hecho de 4 bases: Adenina (A), Timina (T), Guanina (G), Citosina (C)
• Cada célula humana tiene ~3 metros de ADN enrollado en el núcleo
• Si desenrollaras todo tu ADN, llegarías al Sol y vuelta 300 veces

Los **genes** son secciones del ADN que codifican proteínas. ¿Quieres saber cómo funciona la replicación del ADN?`,
    tag: 'biologia',
  },
  {
    k: ['que es la gravedad', 'qué es la gravedad', 'gravedad', 'como funciona la gravedad'],
    r: `🍎 **Gravedad** — la fuerza de atracción entre masas.

Newton dijo: F = G × (m₁ × m₂) / d²
• F = fuerza de gravedad
• G = constante gravitacional
• m₁, m₂ = masas de los objetos
• d = distancia entre ellos

En Bolivia, la gravedad es ~9.8 m/s² (varía según altitud — en El Alto es ligeramente menor que en Santa Cruz).

Einstein lo explicó diferente: la masa curva el espacio-tiempo. ¿Quieres la versión relativista?`,
    tag: 'ciencias',
  },
  {
    k: ['que es un atomo', 'qué es un átomo', 'atomo', 'átomo', 'estructura del atomo'],
    r: `⚛️ **Átomo** — la unidad básica de la materia.

Partes:
• **Núcleo** → protones (+) y neutrones (sin carga)
• **Corteza** → electrones (-) en órbitas

Si el átomo fuera un estadio, el núcleo sería una moneda en el centro y los electrones serían moscas en las gradas.

El número de protones define el **elemento** (el número atómico en la tabla periódica). ¿Qué elemento quieres entender?`,
    tag: 'ciencias',
  },

  // ── CÓDIGO / TECH ──
  {
    k: ['que es html', 'qué es html', 'html', 'como funciona html'],
    r: `💻 **HTML** (HyperText Markup Language) — el esqueleto de toda página web.

Ejemplo básico:
\`\`\`html
<!DOCTYPE html>
<html>
  <head><title>Mi página</title></head>
  <body>
    <h1>Hola Bolivia 🇧🇴</h1>
    <p>Esto es un párrafo.</p>
  </body>
</html>
\`\`\`

Las etiquetas \`<h1>\` a \`<h6>\` son títulos, \`<p>\` son párrafos, \`<a>\` son links.
Sin HTML no hay web. ¿Quieres aprender CSS para darle estilo?`,
    tag: 'codigo',
  },
  {
    k: ['que es css', 'qué es css', 'css', 'como funciona css', 'para que sirve css'],
    r: `🎨 **CSS** (Cascading Style Sheets) — el diseño y estilo de la web.

Ejemplo:
\`\`\`css
body {
  background: #7c3aed; /* morado */
  font-family: sans-serif;
  color: white;
}
h1 {
  font-size: 2rem;
  text-align: center;
}
\`\`\`

CSS maneja: colores, tipografías, márgenes, animaciones y diseño responsive.
¿Quieres aprender Flexbox para hacer layouts? Es lo más útil del CSS moderno.`,
    tag: 'codigo',
  },
  {
    k: ['que es javascript', 'qué es javascript', 'javascript', 'js', 'para que sirve javascript', 'como funciona javascript'],
    r: `⚡ **JavaScript** — el lenguaje que hace que las páginas web sean interactivas.

Ejemplo básico:
\`\`\`javascript
// Variable
const nombre = "ARIA";

// Función
function saludar(persona) {
  return "Hola, " + persona + "!";
}

// Condicional
if (2 + 2 === 4) {
  console.log("Matemáticas correctas ✅");
}
\`\`\`

JS puede: cambiar el HTML, hacer peticiones a servidores, crear apps, animaciones y mucho más.
¿Qué parte quieres aprender primero?`,
    tag: 'codigo',
  },
  {
    k: ['que es una variable', 'qué es una variable', 'variable en programacion', 'variable en programación', 'variables', 'que es variable'],
    r: `📦 **Variable** — un contenedor con nombre que guarda un valor.

En JavaScript:
\`\`\`javascript
let edad = 17;          // número
const nombre = "ARIA";  // texto (no cambia)
var activo = true;      // booleano

edad = 18;              // puedes cambiar 'let'
// nombre = "otro";     // ❌ 'const' no cambia
\`\`\`

Tipos principales:
• \`number\` → 42, 3.14
• \`string\` → "hola"
• \`boolean\` → true / false
• \`array\` → [1, 2, 3]
• \`object\` → {nombre: "ARIA", version: 2}

¿Quieres ver cómo funciona un bucle \`for\` con variables?`,
    tag: 'codigo',
  },
  {
    k: ['que es react', 'qué es react', 'reactjs', 'react js', 'para que sirve react'],
    r: `⚛️ **React** — librería de JavaScript para construir interfaces de usuario.

Creada por Facebook/Meta. La usan: Instagram, WhatsApp Web, Airbnb y miles de apps.

Concepto clave: todo es un **componente**
\`\`\`jsx
function Saludo({ nombre }) {
  return <h1>Hola, {nombre}! 👋</h1>;
}
// Uso: <Saludo nombre="Bolivia" />
\`\`\`

React usa el **Virtual DOM** para actualizar solo lo que cambió, haciendo las apps súper rápidas.
¿Quieres saber qué es useState o useEffect?`,
    tag: 'codigo',
  },

  // ── BOLIVIA ──
  {
    k: ['departamentos de bolivia', 'cuales son los departamentos', 'cuántos departamentos tiene bolivia', 'cuantos departamentos tiene bolivia'],
    r: `🇧🇴 **Bolivia tiene 9 departamentos** y sus capitales:

| Departamento | Capital        |
|-------------|----------------|
| La Paz      | La Paz         |
| Santa Cruz  | Santa Cruz     |
| Cochabamba  | Cochabamba     |
| Oruro       | Oruro          |
| Potosí      | Potosí         |
| Chuquisaca  | Sucre (sede judicial y constitucional) |
| Tarija      | Tarija         |
| Beni        | Trinidad       |
| Pando       | Cobija         |

Dato extra: **Sucre** es la capital constitucional y **La Paz** es la sede de gobierno. ¿Más datos de Bolivia?`,
    tag: 'bolivia',
  },
  {
    k: ['que es el litio', 'qué es el litio', 'litio bolivia', 'litio en bolivia', 'por que es importante el litio'],
    r: `⚡ **Litio** — el "petróleo blanco" del siglo XXI.

Bolivia tiene el **Salar de Uyuni** en Potosí, que alberga una de las mayores reservas de litio del mundo.

¿Para qué sirve?
• Baterías de celulares 📱
• Baterías de autos eléctricos 🚗
• Computadoras portátiles 💻
• Almacenamiento de energía solar

Es estratégico porque el mundo está cambiando a energías limpias.
Bolivia podría ser el "Arabia Saudita del litio" si lo industrializa bien. ¿Quieres más datos sobre el salar?`,
    tag: 'bolivia',
  },
  {
    k: ['capital de bolivia', 'cual es la capital de bolivia', 'cuál es la capital de bolivia'],
    r: `🏛️ Bolivia tiene dos capitales — dato que sorprende a muchos:

• **Sucre** → Capital constitucional (sede del Tribunal Supremo de Justicia)
• **La Paz** → Sede de Gobierno (Ejecutivo y Legislativo)

Esta división histórica viene de la Guerra Federal de 1898-1899. Si en un examen te preguntan "capital de Bolivia", lo correcto es mencionar ambas. ¿Más historia boliviana?`,
    tag: 'bolivia',
  },

  // ── CIENCIAS GENERALES ──
  {
    k: ['que es el agua', 'qué es el agua', 'formula del agua', 'h2o', 'propiedades del agua'],
    r: `💧 **El agua** — la molécula más importante para la vida.

Fórmula: **H₂O** (2 átomos de hidrógeno + 1 de oxígeno)

Propiedades únicas:
• **Tensión superficial** → permite que algunos insectos caminen sobre ella
• **Cohesión** → sube por las plantas (capilaridad)
• **Alta capacidad calorífica** → regula el clima
• **Expande al congelarse** → el hielo flota (¡eso salva la vida acuática!)

Bolivia tiene el Lago Titicaca, el lago navegable más alto del mundo a 3,812 metros. ¿Más propiedades?`,
    tag: 'ciencias',
  },
  {
    k: ['que es la celula', 'qué es la célula', 'celula', 'célula', 'partes de la celula', 'partes de la célula'],
    r: `🔬 **Célula** — la unidad básica de la vida.

Tipos principales:
• **Procariota** → sin núcleo definido (bacterias)
• **Eucariota** → con núcleo (animales, plantas, hongos)

Partes de una célula eucariota:
• **Núcleo** → contiene el ADN (el "cerebro")
• **Mitocondria** → produce energía (ATP)
• **Ribosomas** → fabrican proteínas
• **Membrana celular** → controla qué entra y sale
• **Cloroplastos** → solo en plantas, hacen fotosíntesis

¿Quieres ver las diferencias entre célula animal y vegetal?`,
    tag: 'biologia',
  },

  // ── MATEMÁTICAS ──
  {
    k: ['que es el teorema de pitagoras', 'qué es el teorema de pitágoras', 'pitagoras', 'pitágoras', 'a2 + b2', 'a² + b²'],
    r: `📐 **Teorema de Pitágoras** — en todo triángulo rectángulo:

**a² + b² = c²**

Donde:
• a y b = catetos (los lados del ángulo recto)
• c = hipotenusa (el lado más largo)

Ejemplo: si a=3 y b=4, entonces c = √(9+16) = √25 = **5**

Se usa para: navegación GPS, construcción, videojuegos y hasta para calcular la distancia entre dos puntos en un mapa.
¿Quieres un problema para practicar?`,
    tag: 'matematica',
  },
];

// ── Respuestas de fallback (cuando no entiende la consulta) ──
const FALLBACKS = [
  `No tengo info suficiente sobre eso todavía. 🤔 Soy versión feria, no Google entero.
Si me dices el tema exacto (ej: mitosis, HTML, capital de Bolivia) te armo una explicación corta y juvenil al toque. ¿Qué materia es?`,

  `Mmm, eso no está en mi base de datos aún. Pero si me das más contexto, investiguemos juntos. 🔍
Prueba con: "¿qué es...?" o "explícame..." y el tema que necesitas.`,

  `No tengo respuesta específica para eso. 🙈 Pero si es de: bio, código, geografía boliviana o ciencias, ¡dispara que tengo la respuesta!`,
];

// ── Respuestas a mensajes muy cortos ──
const SHORT_PROMPT = `Dame un poco más de contexto. ¿Qué tema es? 
Ej: "qué es fotosíntesis", "tierra plana", "qué es una variable en JS". Así te respondo mejor. 💬`;

// ── Mensaje de bienvenida ──
const WELCOME_MSG = `¡Hola! Soy ARIA 🚀 ¿En qué te puedo ayudar hoy?`;
