
<?php
session_start();

header('Content-Type: application/json; charset=utf-8');

if (!isset($_SESSION['usuario_id'])) {
    echo json_encode([
        'logado' => false,
        'ids' => []
    ]);
    exit;
}

require_once 'conexao.php';

try {
    $consulta = $pdo->prepare(
        'SELECT projeto_id
         FROM favoritos
         WHERE usuario_id = ?'
    );

    $consulta->execute([(int) $_SESSION['usuario_id']]);

    $ids = array_map(
        'intval',
        $consulta->fetchAll(PDO::FETCH_COLUMN)
    );

    echo json_encode([
        'logado' => true,
        'ids' => $ids
    ]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'logado' => true,
        'ids' => [],
        'erro' => 'Não foi possível carregar os favoritos.'
    ]);
}
