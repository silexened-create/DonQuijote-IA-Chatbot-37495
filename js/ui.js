/**
 * ui.js — versión FINAL ESTABLE
 * ----------------------------------------------------------------------------
 * Maneja la interfaz visual del chat sin interferir con beforeunload.
 */

export function addMsg(who, txt, options = {}) {
  console.log("🟦 [ui.js] addMsg() llamado");
  console.log("🟦 [ui.js] Parámetros:", { who, txt, options });

  const historyEl = document.getElementById("chat-history");

  if (!historyEl) {
    console.error("❌ [ui.js] ERROR: No se encontró #chat-history en el DOM");
    return;
  }

  console.log("🟦 [ui.js] Contenedor encontrado:", historyEl);

  // Crear contenedor del mensaje
  const div = document.createElement("div");
  div.className = who === "Tú" ? "msg user" : "msg bot";

  console.log("🟦 [ui.js] Clase asignada:", div.className);

  // Nombre del emisor
  const name = document.createElement("strong");
  name.textContent = who + ": ";

  // Contenido del mensaje
  const content = document.createElement("span");
  content.textContent = txt;

  console.log("🟦 [ui.js] Texto del mensaje:", txt);

  div.appendChild(name);
  div.appendChild(content);

  // Opciones visuales
  if (options.highlight) {
    div.dataset.highlight = "true";
    console.log("🟦 [ui.js] Highlight activado");
  }

  if (options.animate) {
    div.dataset.animate = "true";
    console.log("🟦 [ui.js] Animación activada");
  }

  try {
    historyEl.appendChild(div);
    console.log("🟩 [ui.js] Mensaje insertado correctamente en el DOM");
  } catch (err) {
    console.error("❌ [ui.js] ERROR al insertar mensaje:", err);
  }

  // Scroll seguro
  try {
    const scrollOptions = {
      top: historyEl.scrollHeight,
      behavior: window.advertenciaActiva ? "auto" : "smooth"
    };

    historyEl.scrollTo(scrollOptions);
    console.log("🟦 [ui.js] Scroll aplicado");
  } catch (err) {
    console.warn("⚠️ [ui.js] Error al hacer scroll:", err);
  }
}

/**
 * Muestra el spinner
 */
export function showSpinner() {
  console.log("🟦 [ui.js] showSpinner()");
  const sp = document.getElementById("spinner");

  if (!sp) {
    console.error("❌ [ui.js] No se encontró #spinner");
    return;
  }

  sp.style.display = "block";
  console.log("🟩 [ui.js] Spinner mostrado");
}

/**
 * Oculta el spinner
 */
export function hideSpinner() {
  console.log("🟦 [ui.js] hideSpinner()");
  const sp = document.getElementById("spinner");

  if (!sp) {
    console.error("❌ [ui.js] No se encontró #spinner");
    return;
  }

  sp.style.display = "none";
  console.log("🟩 [ui.js] Spinner ocultado");
}