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
  // Si la IA está hablando, ignoramos cualquier ruido del micro
  if (window.quijoteHablando) return;

  let text = evt.results[evt.results.length - 1][0].transcript.trim().toLowerCase();
  console.log("🟩 [Audio]:", text);

  // --- 1. DETECCIÓN DE INICIO (Wake Word) ---
  if (WAKE_WORDS.some(word => text.includes(word))) {
    modo = "keyword";
    preguntaPendiente = "";
    detenerReconocimiento();
    console.log("🔔 [Modo]: Tutor atento.");
    // El callback reinicia el micro tras saludar
    speak(GREETING, () => {
        modo = "keyword"; // Aseguramos que siga en modo keyword
        iniciarReconocimiento();
    });
    return;
  }

  // Si no hemos dicho la palabra clave, no acumulamos nada
  if (modo !== "keyword") return;

  // --- 2. DETECCIÓN DE ENVÍO ---
  if (SEND_COMMANDS.some(cmd => text.includes(cmd))) {
    // Limpiamos el comando de envío del texto acumulado
    let mensajeFinal = (preguntaPendiente + " " + text).trim();
    SEND_COMMANDS.forEach(cmd => {
        mensajeFinal = mensajeFinal.replace(cmd, "");
    });

    if (mensajeFinal.length > 2) {
      modo = "processing";
      console.log("📤 [Enviando]:", mensajeFinal);
      procesarEntrada(mensajeFinal);
    }
    return;
  }

  // --- 3. ACUMULAR TEXTO ---
  // Evitamos duplicar si el usuario repite la palabra clave
  if (!WAKE_WORDS.some(word => text.includes(word))) {
      preguntaPendiente += " " + text;
  }
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
