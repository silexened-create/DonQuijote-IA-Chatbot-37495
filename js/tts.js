import { showSpinner, hideSpinner } from './ui.js';
import { iniciarAnimacionBoca, detenerAnimacionBoca } from "./animacionQuijote.js";

window.quijoteHablando = false;

// --- BUSCADOR DE VOZ MADURA ESPAÑOLA ---
function obtenerVozQuijote() {
  const voices = speechSynthesis.getVoices();

  // Prioridad 1: Voces de España (es-ES) que suelen sonar masculinas/maduras
  const preferidas = [
    "Google español",
    "Microsoft Alvaro Online (Natural)",
    "Microsoft Castilian Online",
    "Spanish Spain",
    "Espana"
  ];

  let mejorVoz = voices.find(v => v.lang === "es-ES" && preferidas.some(p => v.name.includes(p)));

  // Si no encuentra una específica, cualquier es-ES sirve
  if (!mejorVoz) {
    mejorVoz = voices.find(v => v.lang === "es-ES");
  }

  return mejorVoz;
}

function activarAnimacion() {
  if (window.modeloListo) iniciarAnimacionBoca();
}

function detenerAnimacion() {
  if (window.modeloListo) detenerAnimacionBoca();
}

export function speak(text, onEnd = null) {
  if (!text) {
    window.quijoteHablando = false;
    if (onEnd) onEnd();
    return;
  }

  speechSynthesis.cancel();
  window.quijoteHablando = true;
  window.advertenciaActiva = false;
  showSpinner();
  const inicioCargaTTS = performance.now();
  console.log("⏳ [Métrica] Iniciando procesamiento de síntesis de voz...");
  const utter = new SpeechSynthesisUtterance(text);

  // Configuramos la voz
  const voz = obtenerVozQuijote();
  if (voz) utter.voice = voz;

  utter.lang = "es-ES"; // Cambiado a España

  // Ajustes de madurez:
  utter.pitch = 0.8;    // Un poco más bajo para sonar más maduro/profundo
  utter.rate = 0.95;    // Un pelín más lento para sonar solemne y noble

  utter.onstart = () => {
    const finCargaTTS = performance.now();
    const tiempoCarga = ((finCargaTTS - inicioCargaTTS) / 1000).toFixed(3);
    console.log(`✅ [Métrica] Tiempo de carga del audio: ${tiempoCarga}s`);
    activarAnimacion();
    console.log("🔊 [Quijote hablando]: " + text.substring(0, 30) + "...");
  };

  // ... dentro de utter.onend en tts.js ...
  utter.onend = () => {
    detenerAnimacion();
    hideSpinner();

    setTimeout(() => {
      // 1. Primero liberamos la variable
      window.quijoteHablando = false;
      console.log("🔊 [tts] Cerrojado liberado.");

      // 2. Luego ejecutamos el callback que reinicia el micro
      if (onEnd) onEnd();

      window.advertenciaActiva = true;
    }, 600); // Subimos un pelín a 600ms para asegurar limpieza de hardware
  };
  utter.onerror = (err) => {
    console.error("❌ Error en TTS:", err);
    window.quijoteHablando = false;
    detenerAnimacion();
    hideSpinner();
    if (onEnd) onEnd();
  };

  speechSynthesis.speak(utter);
}

// Esto ayuda a que las voces carguen en algunos navegadores como Chrome
speechSynthesis.onvoiceschanged = obtenerVozQuijote;