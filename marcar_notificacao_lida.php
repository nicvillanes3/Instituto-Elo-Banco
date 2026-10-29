
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
    $id = filter_input(INPUT_POST, 'id', FILTER_VALIDATE_INT);

    if (!$id || $id < 1) {
        http_response_code(400);
        echo json_encode(['sucesso' => false]);
        exit;
    }

    $sql = "
        UPDATE notificacoes
        SET lida = 1
        WHERE id = :id AND usuario_id = :usuario_id
    ";

    $consulta = $pdo->prepare($sql);
    $consulta->execute([
        'id' => $id,
        'usuario_id' => (int) $_SESSION['usuario_id']
    ]);

    echo json_encode(['sucesso' => true]);

} catch (PDOException $e) {
    error_log('Erro ao marcar notificação: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['sucesso' => false]);
}
