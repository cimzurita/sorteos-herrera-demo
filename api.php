<?php
/**
 * SORTEOS HERRERA - BACKEND COMPLEMENTARIO LIGERO PARA HOSTGATOR (APACHE + PHP)
 * Diseñado para ser montado directamente en cPanel / public_html sin sobrecargar MySQL.
 */

header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$DATA_DIR = __DIR__ . '/data';
if (!is_dir($DATA_DIR)) {
    @mkdir($DATA_DIR, 0755, true);
}

$ORDERS_FILE = $DATA_DIR . '/orders.json';
if (!file_exists($ORDERS_FILE)) {
    @file_put_contents($ORDERS_FILE, json_encode([]));
}

$action = $_REQUEST['action'] ?? '';

switch ($action) {
    case 'create_order':
        handleCreateOrder();
        break;

    case 'verify_order':
        handleVerifyOrder();
        break;

    case 'health':
        echo json_encode(['status' => 'ok', 'server' => 'HostGator-Apache-PHP', 'timestamp' => time()]);
        break;

    default:
        http_response_code(400);
        echo json_encode(['error' => 'Acción no válida']);
        break;
}

function handleCreateOrder() {
    global $ORDERS_FILE, $DATA_DIR;

    $name = trim($_POST['name'] ?? '');
    $phone = trim($_POST['phone'] ?? '');
    $city = trim($_POST['city'] ?? '');
    $email = trim($_POST['email'] ?? '');
    $foliosRaw = $_POST['folios'] ?? '[]';
    $folios = json_decode($foliosRaw, true);

    if (empty($name) || empty($phone) || empty($city) || empty($email) || empty($folios) || !is_array($folios)) {
        http_response_code(422);
        echo json_encode(['error' => 'Datos incompletos para procesar el pedido.']);
        return;
    }

    $ref = 'SH-' . rand(100000, 999999);
    $total = count($folios) * 5.0;

    // Asignación de 4 oportunidades complementarias por boleto
    $bonusFolios = [];
    foreach ($folios as $f) {
        for ($i = 0; $i < 4; $i++) {
            $bonusFolios[] = rand(200001, 1000000);
        }
    }

    // Manejo seguro de comprobante
    $proofFilename = null;
    if (isset($_FILES['proof']) && $_FILES['proof']['error'] === UPLOAD_ERR_OK) {
        $allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
        if (in_array($_FILES['proof']['type'], $allowed)) {
            $ext = pathinfo($_FILES['proof']['name'], PATHINFO_EXTENSION);
            $proofFilename = $ref . '_' . time() . '.' . $ext;
            @move_uploaded_file($_FILES['proof']['tmp_name'], $DATA_DIR . '/' . $proofFilename);
        }
    }

    $newOrder = [
        'ref' => $ref,
        'date' => date('Y-m-d H:i:s'),
        'name' => htmlspecialchars($name, ENT_QUOTES, 'UTF-8'),
        'phone' => htmlspecialchars($phone, ENT_QUOTES, 'UTF-8'),
        'city' => htmlspecialchars($city, ENT_QUOTES, 'UTF-8'),
        'email' => htmlspecialchars($email, ENT_QUOTES, 'UTF-8'),
        'folios' => $folios,
        'bonusFolios' => $bonusFolios,
        'total' => $total,
        'proof' => $proofFilename,
        'status' => 'Pendiente de Validación SPEI'
    ];

    $orders = json_decode(file_get_contents($ORDERS_FILE), true) ?: [];
    array_unshift($orders, $newOrder);
    file_put_contents($ORDERS_FILE, json_encode($orders, JSON_PRETTY_PRINT));

    echo json_encode([
        'success' => true,
        'order' => $newOrder,
        'message' => 'Pedido registrado correctamente en HostGator.'
    ]);
}

function handleVerifyOrder() {
    global $ORDERS_FILE;
    $query = trim($_GET['query'] ?? '');
    if (empty($query)) {
        echo json_encode(['orders' => []]);
        return;
    }

    $orders = json_decode(file_get_contents($ORDERS_FILE), true) ?: [];
    $matches = array_filter($orders, function ($o) use ($query) {
        return stripos($o['phone'], $query) !== false || 
               stripos($o['ref'], $query) !== false;
    });

    echo json_encode([
        'success' => true,
        'orders' => array_values($matches)
    ]);
}
