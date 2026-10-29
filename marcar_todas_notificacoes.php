
<?php
session_start();
header('Content-Type: application/json; charset=utf-8');

if (!isset($_SESSION['usuario_id'])) {
    http_response_code(401);
    echo json_encode(['sucesso' => false]);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['sucesso' => false]);
    exit;
}

require_once 'conexao.php';

try {
    $consulta = $pdo->prepare("
        UPDATE notificacoes
        SET lida = 1
        WHERE usuario_id = ? AND lida = 0
    ");

    $consulta->execute([(int) $_SESSION['usuario_id']]);

    echo json_encode(['sucesso' => true]);

} catch (PDOException $e) {
    error_log('Erro ao marcar todas as notificações: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['sucesso' => false]);
}
