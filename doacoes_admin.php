
<?php
session_start();

header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/conexao.php';

$usuarioId = filter_var(
    $_SESSION['usuario_id'] ?? null,
    FILTER_VALIDATE_INT
);

if (!$usuarioId || $usuarioId <= 0) {
    http_response_code(401);

    echo json_encode([
        'sucesso' => false,
        'mensagem' => 'Faça login novamente.'
    ]);

    exit;
}

$consultaAdmin = $pdo->prepare(
    "SELECT tipo
     FROM usuarios
     WHERE id = :id AND ativo = 1
     LIMIT 1"
);

$consultaAdmin->execute([':id' => $usuarioId]);
$admin = $consultaAdmin->fetch(PDO::FETCH_ASSOC);

if (!$admin || $admin['tipo'] !== 'administrador') {
    http_response_code(403);

    echo json_encode([
        'sucesso' => false,
        'mensagem' => 'Acesso não autorizado.'
    ]);

    exit;
}

try {

    $sql = "
        SELECT
            d.id,
            d.usuario_id,
            d.projeto_id,
            d.valor,
            d.metodo_pagamento,
            d.status,
            d.anonimato,
            d.data_doacao,
            u.nome AS nome_doador,
            p.titulo AS titulo_projeto
        FROM doacoes d
        INNER JOIN usuarios u
            ON u.id = d.usuario_id
        INNER JOIN projetos p
            ON p.id = d.projeto_id
        ORDER BY
            CASE
                WHEN d.status = 'pendente' THEN 0
                ELSE 1
            END,
            d.data_doacao DESC
    ";

    $doacoes = $pdo->query($sql)->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode([
        'sucesso' => true,
        'doacoes' => $doacoes
    ], JSON_UNESCAPED_UNICODE);

} catch (Throwable $erro) {

    error_log('Erro ao listar doações administrativas: ' . $erro->getMessage());

    http_response_code(500);

    echo json_encode([
        'sucesso' => false,
        'mensagem' => 'Erro ao carregar as doações.'
    ], JSON_UNESCAPED_UNICODE);
}
