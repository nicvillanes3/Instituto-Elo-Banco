
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
    $usuarioId = (int) $_SESSION['usuario_id'];

    $pdo->beginTransaction();

    // Marca as notificações individuais.
    $individuais = $pdo->prepare("
        UPDATE notificacoes
        SET lida = 1
        WHERE usuario_id = ?
        AND lida = 0
    ");

    $individuais->execute([$usuarioId]);

    // Marca as notificações gerais para esta conta.
    $gerais = $pdo->prepare("
        INSERT INTO notificacoes_gerais_lidas
            (notificacao_id, usuario_id)
        SELECT
            ng.id,
            ?
        FROM notificacoes_gerais ng
        ON DUPLICATE KEY UPDATE
            lida_em = CURRENT_TIMESTAMP
    ");

    $gerais->execute([$usuarioId]);

    $pdo->commit();

    echo json_encode(['sucesso' => true]);

} catch (Throwable $e) {

    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }

    error_log('Erro ao marcar todas as notificações: ' . $e->getMessage());

    http_response_code(500);
    echo json_encode(['sucesso' => false]);
}
