import { addMsg, showSpinner, hideSpinner } from './ui.js';
import { speak } from './tts.js';

let modo = "idle";
let preguntaPendiente = "";
let escuchando = false;
let recognitionRunning = false;

const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
const recog = new SR();
recog.lang = "es-ES";
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

  let text = evt.results[evt.results.length - 1][0].transcript.trim().toLowerCase();
  console.log("🟩 [Audio]:", text);

  const inicios = ["oye quijote", "oye don quijote", "hola quijote"];
  if (inicios.some(d => text.includes(d))) {
    modo = "keyword";
    preguntaPendiente = "";
    detenerReconocimiento();
    console.log("⚔️ [Modo]: Quijote atento.");
    speak("Decidme, ¿qué cuita os aflige?", () => {
      iniciarReconocimiento();
    });
    return;
  }

  if (modo !== "keyword") return;

  const fines = ["responde quijote", "dime quijote", "contesta quijote", "enviar"];
  if (fines.some(f => text.includes(f))) {
    let limpia = text;
    fines.forEach(f => limpia = limpia.replace(f, ""));
    const mensajeFinal = (preguntaPendiente + " " + limpia).trim();

    if (mensajeFinal.length > 2) {
      console.log("📤 [Procesando]:", mensajeFinal);
      modo = "processing";
      procesarEntrada(mensajeFinal);
    }
    return;
  }

  preguntaPendiente += " " + text;
  console.log("✍️ [Acumulando]:", preguntaPendiente);
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

async function procesarEntrada(texto) {
  detenerReconocimiento();
  showSpinner();
  addMsg('Tú', texto);

  try {
    const r = await fetch("https://don-quijote-backend.onrender.com/DonQuijoteChatbot.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: texto })
    });
    const data = await r.json();
    const respuesta = data.reply || "¡Pardiez! Mis pensamientos se han turbado.";

    addMsg('Quijote', respuesta);
    speak(respuesta, () => {
      modo = "idle";
      if (escuchando) iniciarReconocimiento();
    });
  } catch (err) {
    console.error("Error:", err);
    modo = "idle";
    if (escuchando) iniciarReconocimiento();
  } finally {
    hideSpinner();
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

        // 1. El Quijote da las instrucciones al encender
        speak("Hablad, caballero. Decid 'Oye Quijote' para iniciar y 'Responde Quijote' para enviarme vuestras nuevas.", () => {
          // 2. Cuando termine de hablar, el sistema intentará abrir el micro solo
          iniciarReconocimiento();
        });

      } else {
        escuchando = false;
        btn.classList.remove("active");
        detenerReconocimiento();
        modo = "idle"; // Reseteamos el modo

        // 3. El Quijote se despide al apagar
        speak("Quedad con Dios. Mi lanza descansa hasta vuestro regreso.");
      }
    });
  }

});
