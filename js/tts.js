import { showSpinner, hideSpinner } from './ui.js';
import { iniciarAnimacionBoca, detenerAnimacionBoca } from "./animacionQuijote.js";

window.quijoteHablando = false;

// --- BUSCADOR DE VOZ DINÁMICO ---
function obtenerVozAdecuada() {
  const isEnglishPage = window.location.pathname.includes('english.html');
  const voices = speechSynthesis.getVoices();

  if (isEnglishPage) {
    // 🇬🇧 LEMONY SNICKET: Tu elección exacta
    const nombreDavid = "Microsoft David - English (United States)";
    let vozEN = voices.find(v => v.name === nombreDavid);

    // Plan B para inglés (si no está David)
    if (!vozEN) {
      vozEN = voices.find(v => v.lang.startsWith("en") && v.name.toLowerCase().includes("male"));
    }
    return vozEN || voices.find(v => v.lang.startsWith("en"));

  } else {
    // 🇪🇸 DON QUIJOTE: Restaurando tu lista de preferidas de España
    const preferidas = [
      "Google español",
      "Microsoft Alvaro Online (Natural)",
      "Microsoft Castilian Online",
      "Spanish Spain",
      "Espana"
    ];

    // Buscar la primera coincidencia de tu lista
    let mejorVozES = voices.find(v => v.lang === "es-ES" && preferidas.some(p => v.name.includes(p)));

    // Si no encuentra una específica, cualquier es-ES sirve
    if (!mejorVozES) {
      mejorVozES = voices.find(v => v.lang === "es-ES");
    }
    return mejorVozES;
  }
}

function activarAnimacion() { if (window.modeloListo) iniciarAnimacionBoca(); }
function detenerAnimacion() { if (window.modeloListo) detenerAnimacionBoca(); }

export function speak(text, onEnd = null) {
  if (!text) {
    window.quijoteHablando = false;
    if (onEnd) onEnd();
    return;
  }

  const isEnglishPage = window.location.pathname.includes('english.html');

  speechSynthesis.cancel();
  window.quijoteHablando = true;
  window.advertenciaActiva = false;
  showSpinner();

  const utter = new SpeechSynthesisUtterance(text);
  const voz = obtenerVozAdecuada();

  if (voz) {
    utter.voice = voz;
    utter.lang = voz.lang; // Sincroniza idioma con la voz elegida
    console.log(`🎙️ [TTS] Usando voz: ${voz.name}`);
  }

  // --- PERSONALIDADES DIFERENCIADAS ---
  if (isEnglishPage) {
    // LEMONY (Voz de Hombre Maduro)
    utter.pitch = 0.7;
    utter.rate = 0.85;
  } else {
    // DON QUIJOTE (Configuración Original: Maduro pero Solemne)
    utter.pitch = 0.8; // Tu ajuste original de madurez para el Quijote
    utter.rate = 0.95; // Tu ajuste original de solemnidad
  }

  utter.onstart = () => {
    activarAnimacion();
  };

  utter.onend = () => {
    detenerAnimacion();
    hideSpinner();
    setTimeout(() => {
      window.quijoteHablando = false;
      if (onEnd) onEnd();
      window.advertenciaActiva = true;
    }, 600);
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

// Inicialización para navegadores modernos
if (speechSynthesis.onvoiceschanged !== undefined) {
  speechSynthesis.onvoiceschanged = obtenerVozAdecuada;
}