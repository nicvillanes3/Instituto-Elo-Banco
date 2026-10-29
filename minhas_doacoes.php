
<?php
session_start();

header('Content-Type: application/json; charset=utf-8');

require_once 'conexao.php';

if (!isset($_SESSION['usuario_id'])) {
    http_response_code(401);
    echo json_encode([
        'sucesso' => false,
        'mensagem' => 'Faça login para visualizar suas doações.'
    ]);
    exit;
}

try {
    $usuarioId = (int) $_SESSION['usuario_id'];

    $sql = "
        SELECT
            d.id AS doacao_id,
            d.projeto_id,
            d.valor,
            d.status AS status_doacao,
            d.criado_em,
            p.titulo,
            p.descricao,
            p.imagem,
            p.status AS status_projeto,
            p.meta_valor,
            p.valor_arrecadado
        FROM doacoes d
        INNER JOIN projetos p ON p.id = d.projeto_id
        WHERE d.usuario_id = :usuario_id
          AND d.status IN ('confirmada', 'reembolsada', 'reembolsado')
        ORDER BY d.criado_em DESC, d.id DESC
    ";

    $stmt = $pdo->prepare($sql);
    $stmt->execute(['usuario_id' => $usuarioId]);

    $doacoes = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode([
        'sucesso' => true,
        'doacoes' => $doacoes
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

} catch (PDOException $e) {
    http_response_code(500);

    echo json_encode([
        'sucesso' => false,
        'mensagem' => 'Não foi possível carregar suas doações.'
    ], JSON_UNESCAPED_UNICODE);
}
