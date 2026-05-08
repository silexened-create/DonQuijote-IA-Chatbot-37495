<?php
/* ============================================================
   0. CONFIGURACIÓN INICIAL Y CORS
   ============================================================ */
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Content-Type: application/json");

// Manejo de peticiones preflight (OPTIONS) al principio del archivo
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

/* ============================================================
   1. CONFIGURACIÓN DE SEGURIDAD Y CARGA DE VARIABLES
   ============================================================ */
// 1. Intentar leer desde el sistema (Render/Docker)
$apiKey = getenv("OPENROUTER_API_KEY");

// 2. Si no existe en el sistema, buscar archivo .env (Localhost)
if (!$apiKey) {
    $envPath = __DIR__ . '/.env';
    if (file_exists($envPath)) {
        $env = @parse_ini_file($envPath);
        $apiKey = $env["OPENROUTER_API_KEY"] ?? null;
    }
}

// 3. Si después de ambos intentos no hay nada, dar error
if (!$apiKey) {
    echo json_encode(["error" => "❌ API Key no configurada en el sistema ni en .env"]);
    exit;
}

/* ============================================================
   MODELOS DISPONIBLES
   ============================================================ */
$modelos = [
    "owlalpha"  => "openrouter/owl-alpha",
    "stepfun"  => "stepfun/step-3.5-flash:free",
    "deepseek" => "deepseek/deepseek-r1-0528:free",
    "glm"      => "z-ai/glm-4.5-air:free"
];

/* ============================================================
   PROCESAR ENTRADA DEL USUARIO
   ============================================================ */
$input = json_decode(file_get_contents("php://input"), true);

if (json_last_error() !== JSON_ERROR_NONE) {
    echo json_encode(["error" => "JSON inválido"]);
    exit;
}

$mensaje_usuario = $input["message"] ?? "";
$historial = $input["history"] ?? [];
$modelo_solicitado = $input["model"] ?? "owlalpha";
$es_resumen = ($input["isSummary"] ?? false) === true;

// Selección de modelo
$modelo_activo = $modelos[$modelo_solicitado] ?? $modelos["owlalpha"];

/* ============================================================
   PROMPT DEL SISTEMA Y MENSAJES
   ============================================================ */
$system_prompt = "You are Lemony Snicket, the gloomy narrator and English tutor. 
Your lessons are based on the tragic history of the Baudelaire orphans from 'The Bad Beginning'.

RULES:
- Primarily speak in English.
- Constantly use the phrase 'a word which here means...' to explain vocabulary.
- Examples must reference the first book: mention Count Olaf's eye tattoo, Violet's hair ribbon, Klaus's library, or Sunny's sharp teeth.
- Tone: Mysterious, analytical, and profoundly melancholic.
- Length: 2-3 sentences maximum.
- Do not use asterisks (*) or emojis.
- Be a helpful teacher, though you are certain the student's future is as bleak as a burnt mansion.";

if ($es_resumen) {
    $system_prompt = "You are the record keeper of unfortunate events. Summarize this English lesson in 2 gloomy sentences.";
}

$mensajes = [["role" => "system", "content" => $system_prompt]];


// Añadir historial previo (limitar a 20 mensajes por seguridad si no es resumen)
$limite_mensajes = 20;
if (!$es_resumen) {
    $historial = array_slice($historial, -$limite_mensajes);
}

foreach ($historial as $turno) {
    if (isset($turno["role"], $turno["content"])) {
        $mensajes[] = [
            "role" => $turno["role"],
            "content" => (string)$turno["content"]
        ];
    }
}

// Añadir mensaje actual si no es un resumen puro (en resumen el mensaje va en el historial usualmente)
if (!$es_resumen && $mensaje_usuario !== "") {
    $mensajes[] = ["role" => "user", "content" => $mensaje_usuario];
}

/* ============================================================
   LLAMADA A OPENROUTER
   ============================================================ */
$json_payload = json_encode([
    "model" => $modelo_activo,
    "messages" => $mensajes,
    "temperature" => $es_resumen ? 0.3 : 0.8,
    "max_tokens" => $es_resumen ? 150 : 500
]);

$payload_size = strlen($json_payload);

$ch = curl_init("https://openrouter.ai/api/v1/chat/completions");
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    "Authorization: Bearer " . trim($apiKey),
    "Content-Type: application/json",
    "HTTP-Referer: http://localhost",
    "X-Title: LemonyTutorEnglish"
]);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, $json_payload);
curl_setopt($ch, CURLOPT_TIMEOUT, 30);

$response = curl_exec($ch);

if ($response === false) {
    echo json_encode(["reply" => "Error de conexión: " . curl_error($ch)]);
    exit;
}
curl_close($ch);

/* ============================================================
   PROCESAR RESPUESTA DE LA IA
   ============================================================ */
$data = json_decode($response, true);

if (!isset($data["choices"][0]["message"]["content"])) {
    $api_error = $data["error"]["message"] ?? "Error desconocido";
    // Log error for debugging
    error_log("OpenRouter Error: " . ($response ?: "No response"));
    echo json_encode(["reply" => "¡Pardiez! Un encantador maligno ha interferido. ($api_error)"]);
    exit;
}

$mensaje_modelo = $data["choices"][0]["message"]["content"] ?? "";
$razonamiento = $data["choices"][0]["message"]["reasoning"] ?? "";

// Fallback si el contenido está vacío pero hay razonamiento
if (trim($mensaje_modelo) === "") {
    if ($razonamiento !== "") {
        $lineas = explode("\n", trim($razonamiento));
        $mensaje_modelo = trim(end($lineas));
    } else {
        $mensaje_modelo = "Error.";
    }
}

/* ============================================================
   RESPUESTA FINAL
   ============================================================ */
echo json_encode([
    "reply" => $mensaje_modelo,
    "model" => $modelo_activo,
    "metrics" => [
        "payload_bytes" => $payload_size,
        "message_count" => count($mensajes),
        "estimated_tokens" => ceil($payload_size / 4) // Estimación ruda
    ]
]);
