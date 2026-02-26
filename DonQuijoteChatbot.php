<?php
/* ============================================================
   1. CONFIGURACIÓN DE SEGURIDAD Y CARGA DE VARIABLES
   ============================================================ */
// Usamos parse_ini_file por ser una función nativa de PHP más rápida y limpia
$envPath = __DIR__ . '/.env';

if (!file_exists($envPath)) {
    header("Content-Type: application/json");
    echo json_encode(["error" => "❌ Falta el archivo .env config"]);
    exit;
}

$env = @parse_ini_file($envPath);
$apiKey = $env["OPENROUTER_API_KEY"] ?? null;

if (!$apiKey) {
    header("Content-Type: application/json");
    echo json_encode(["error" => "❌ API Key no configurada"]);
    exit;
}
/* ============================================================
   CONFIGURACIÓN INICIAL Y CORS
   ============================================================ */
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");

// Manejo de peticiones preflight (OPTIONS)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}


/* ============================================================
   MODELOS DISPONIBLES
   ============================================================ */
$modelos = [
    "trinity"  => "arcee-ai/trinity-large-preview:free",
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
$modelo_solicitado = $input["model"] ?? "trinity";
$es_resumen = ($input["isSummary"] ?? false) === true;

// Selección de modelo
$modelo_activo = $modelos[$modelo_solicitado] ?? $modelos["glm"];

/* ============================================================
   PROMPT DEL SISTEMA Y MENSAJES
   ============================================================ */
$system_prompt = "Eres Don Quijote de la Mancha, caballero andante noble y soñador. Hablas con estilo caballeresco, antiguo, amable y claro. Reglas: - Responde en 2 o 3 oraciones máximo. - No hagas preguntas. - No des discursos largos. - No repitas ideas. - No digas que eres una IA. - Mantén el personaje, pero con lenguaje accesible. - Puedes incluir un refrán de Sancho Panza solo cuando realmente ayude. - No uses asteriscos bajo ninguna circunstancia.";

if ($es_resumen) {
    $system_prompt = "Eres el cronista de las hazañas de Don Quijote. Tu tarea es resumir la conversación actual de forma muy breve (máximo 2 oraciones) manteniendo el estilo caballeresco. Enfócate en los puntos clave de la aventura actual para que el Hidalgo no los olvide.";
}

$mensajes = [
    ["role" => "system", "content" => $system_prompt]
];

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
    "X-Title: DonQuijoteChat"
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
        $mensaje_modelo = "¡Pardiez! Mis pensamientos se han quedado en blanco.";
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
