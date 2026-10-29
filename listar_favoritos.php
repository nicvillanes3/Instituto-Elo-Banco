
<?php
session_start();
require_once 'conexao.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate');

if (!isset($_SESSION['usuario_id'])) {
    http_response_code(401);
    echo json_encode([
        'logado' => false,
        'projetos' => []
    ]);
    exit;
}

try {
    $sql = "
        SELECT
            p.id,
            p.titulo,
            p.descricao,
            p.categoria,
            p.imagem,
            p.meta_valor,
            p.valor_arrecadado,
            p.status,
            p.criado_em,
            u.nome AS autor
        FROM favoritos f
        INNER JOIN projetos p ON p.id = f.projeto_id
        INNER JOIN usuarios u ON u.id = p.usuario_id
        WHERE f.usuario_id = :usuario_id
        ORDER BY f.criado_em DESC
    ";

    $consulta = $pdo->prepare($sql);
    $consulta->execute([
        'usuario_id' => (int) $_SESSION['usuario_id']
    ]);

    echo json_encode([
        'logado' => true,
        'projetos' => $consulta->fetchAll(PDO::FETCH_ASSOC)
    ], JSON_UNESCAPED_UNICODE);

} catch (PDOException $e) {
    error_log('Erro ao listar favoritos: ' . $e->getMessage());

    http_response_code(500);
    echo json_encode([
        'logado' => true,
        'projetos' => [],
        'erro' => 'Não foi possível carregar os favoritos.'
    ]);
}
