
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
    $usuarioId = (int) $_SESSION['usuario_id'];

    if ($id === false || $id === null || $id === 0) {
        http_response_code(400);
        echo json_encode(['sucesso' => false]);
        exit;
    }

    if ($id > 0) {

        // Notificação individual.
        $consulta = $pdo->prepare("
            UPDATE notificacoes
            SET lida = 1
            WHERE id = :id
            AND usuario_id = :usuario_id
        ");

        $consulta->execute([
            ':id' => $id,
            ':usuario_id' => $usuarioId
        ]);

    } else {

        // Notificação geral: converte o ID negativo.
        $idGeral = abs($id);

        $verificar = $pdo->prepare("
            SELECT id
            FROM notificacoes_gerais
            WHERE id = ?
        ");

        $verificar->execute([$idGeral]);

        if (!$verificar->fetchColumn()) {
            http_response_code(404);
            echo json_encode(['sucesso' => false]);
            exit;
        }

        // Registra a leitura apenas para esta conta.
        $consulta = $pdo->prepare("
            INSERT INTO notificacoes_gerais_lidas
                (notificacao_id, usuario_id)
            VALUES (?, ?)
            ON DUPLICATE KEY UPDATE
                lida_em = CURRENT_TIMESTAMP
        ");

        $consulta->execute([
            $idGeral,
            $usuarioId
        ]);
    }

    echo json_encode(['sucesso' => true]);

} catch (Throwable $e) {
    error_log('Erro ao marcar notificação: ' . $e->getMessage());

    http_response_code(500);
    echo json_encode(['sucesso' => false]);
}
