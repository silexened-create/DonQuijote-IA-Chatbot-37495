import { addMsg, showSpinner, hideSpinner } from './ui.js';
import { speak } from './tts.js';
import { enviarMensaje } from './chat.js';

/* --- CONFIGURACIÓN DINÁMICA --- */
const isEnglishPage = window.location.pathname.includes('english.html');

// Idioma del micrófono
const MIC_LANG = isEnglishPage ? "en-US" : "es-ES";

// Palabras clave de activación (Wake words)
const WAKE_WORDS = isEnglishPage
  ? ["hello tutor", "hey tutor", "hello teacher"]
  : ["oye quijote", "oye don quijote", "hola quijote"];

// Comandos de envío
const SEND_COMMANDS = isEnglishPage
  ? ["send message", "reply", "answer me", "send"]
  : ["responde quijote", "dime quijote", "contesta quijote", "enviar"];

// Respuestas de voz del sistema
const GREETING = isEnglishPage ? "Tell me, what words confuse you?" : "Decidme, ¿qué cuita os aflige?";
const INSTRUCTIONS = isEnglishPage
  ? "Speak, pupil. Say 'hey tutor' to start and 'reply' to finish."
  : "Hablad, caballero. Decid 'Oye Quijote' para iniciar y 'Responde Quijote' para enviar.";
const FAREWELL = isEnglishPage ? "Goodbye. Read carefully." : "Quedad con Dios. Mi lanza descansa.";

let modo = "idle";
let preguntaPendiente = "";
let escuchando = false;
let recognitionRunning = false;

const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
const recog = new SR();
recog.lang = MIC_LANG;
recog.interimResults = false;
recog.continuous = true;

export function iniciarReconocimiento() {
  console.log("🛠️ [Intento]: Iniciando micrófono...");

  if (window.quijoteHablando) {
    console.warn("⏳ [Bloqueo]: IA hablando, reintentando en 1s...");
    setTimeout(iniciarReconocimiento, 1000);
    return;
  }

  if (recognitionRunning) {
    console.log("ℹ️ [Info]: El reconocimiento ya estaba corriendo.");
    return;
  }

  try {
    recog.start();
    recognitionRunning = true;
    console.log("✅ [Sistema]: Escuchando... (Modo: " + modo + ")");
  } catch (e) {
    console.error("❌ [Error]: No se pudo iniciar el micro:", e);
    recognitionRunning = false;
  }
}

export function detenerReconocimiento() {
  if (!recognitionRunning) return;
  try {
    recog.stop();
    recognitionRunning = false;
    console.log("🛑 [Sistema]: Micrófono en pausa.");
  } catch (e) { }
}
recog.onresult = async (evt) => {
  if (window.quijoteHablando) return;

  // 1. Capturar lo que el usuario dijo
  let text = evt.results[evt.results.length - 1][0].transcript.trim().toLowerCase();
  console.log("🟩 [Audio]:", text);
  // --- Detección de Inicio ---
  if (WAKE_WORDS.some(d => text.includes(d))) {
    modo = "keyword";
    preguntaPendiente = "";
    detenerReconocimiento();
    console.log("🔔 [Modo]: Tutor atento.");
    speak(GREETING, () => iniciarReconocimiento());
    return;
  }

  if (modo !== "keyword") return;

  // --- Detección de Envío ---
  if (SEND_COMMANDS.some(f => text.includes(f))) {
    let limpia = text;
    SEND_COMMANDS.forEach(f => limpia = limpia.replace(f, ""));
    const mensajeFinal = (preguntaPendiente + " " + limpia).trim();

    if (mensajeFinal.length > 2) {
      modo = "processing";
      procesarEntrada(mensajeFinal);
    }
    return;
  }
  // 3. Acumular texto
  preguntaPendiente += " " + text;
};

recog.onend = () => {
  recognitionRunning = false;
  console.log("🔌 [Evento]: onend detectado.");
  if (escuchando && modo !== "processing" && !window.quijoteHablando) {
    iniciarReconocimiento();
  }
};

recog.onerror = (event) => {
  console.error("❌ [Error Micro]:", event.error);
};

/**
 * Procesa la entrada de voz usando el motor unificado de chat.js
 */
async function procesarEntrada(texto) {
  detenerReconocimiento();
  
  // enviarMensaje maneja UI, spinners, fetch y speak internamente
  // Le pasamos silent=false para que añada el mensaje del usuario a la pantalla
  const respuesta = await enviarMensaje(texto, false, () => {
    modo = "idle";
    if (escuchando) iniciarReconocimiento();
  });

  // Si no hay respuesta es porque hubo un error en la red y speak no se ejecutará
  if (!respuesta) {
    modo = "idle";
    if (escuchando) iniciarReconocimiento();
  }
}

// --- CAMBIOS EN LA INICIALIZACIÓN ---
window.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById("mic-btn");
  if (btn) {
    btn.addEventListener("click", () => {
      if (!escuchando) {
        escuchando = true;
        btn.classList.add("active");

        speak(INSTRUCTIONS, () => {
          iniciarReconocimiento();
        });

      } else {
        escuchando = false;
        btn.classList.remove("active");
        detenerReconocimiento();
        modo = "idle";

        // Usamos la constante dinámica FAREWELL
        speak(FAREWELL);
      }
    });
  }
});