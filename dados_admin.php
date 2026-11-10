
<?php
session_start();

header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/conexao.php';

// Verifica se está logado como administrador
$usuarioId = $_SESSION['usuario_id'] ?? null;

if (!$usuarioId) {
    http_response_code(401);
    echo json_encode([
        'sucesso' => false,
        'mensagem' => 'Faça login.'
    ]);
    exit;
}

$consultaAdmin = $pdo->prepare(
    "SELECT tipo FROM usuarios
     WHERE id = :id AND ativo = 1
     LIMIT 1"
);

$consultaAdmin->execute([':id' => $usuarioId]);
$usuario = $consultaAdmin->fetch();

if (!$usuario || $usuario['tipo'] !== 'administrador') {
    http_response_code(403);
    echo json_encode([
        'sucesso' => false,
        'mensagem' => 'Acesso não autorizado.'
    ]);
    exit;
}

try {
    // Resumo financeiro
    $sqlFinanceiro = "
        SELECT
            COALESCE(SUM(valor), 0) AS total_arrecadado,
            COALESCE(SUM(valor * 0.05), 0) AS total_elo,
            COALESCE(SUM(valor * 0.95), 0) AS total_campanhas
        FROM doacoes
        WHERE status = 'confirmada'
    ";

    $financeiro = $pdo->query($sqlFinanceiro)->fetch();

    // Total de campanhas
  $totalProjetos = $pdo->query(
    "SELECT COUNT(*)
     FROM projetos
     WHERE COALESCE(status, '') <> 'excluido'"
)->fetchColumn();

    // Total de usuários ativos
    $totalUsuarios = $pdo->query(
        "SELECT COUNT(*) FROM usuarios WHERE ativo = 1"
    )->fetchColumn();

    // Campanhas e seus valores
    $sqlProjetos = "
    SELECT
        p.id,
        p.titulo,
        COALESCE(SUM(d.valor), 0) AS total_arrecadado,
        COALESCE(SUM(d.valor * 0.05), 0) AS total_elo,
        COALESCE(SUM(d.valor * 0.95), 0) AS total_campanha
    FROM projetos p
    LEFT JOIN doacoes d
        ON d.projeto_id = p.id
        AND d.status = 'confirmada'
   WHERE COALESCE(p.status, '') <> 'excluido'
    GROUP BY p.id, p.titulo
    ORDER BY p.id DESC
";

    $projetos = $pdo->query($sqlProjetos)->fetchAll();

    echo json_encode([
        'sucesso' => true,
        'financeiro' => $financeiro,
        'total_projetos' => $totalProjetos,
        'total_usuarios' => $totalUsuarios,
        'projetos' => $projetos
    ], JSON_UNESCAPED_UNICODE);

} catch (Throwable $erro) {
    error_log('Erro no painel administrativo: ' . $erro->getMessage());

    http_response_code(500);
    echo json_encode([
        'sucesso' => false,
        'mensagem' => 'Erro ao carregar os dados administrativos.'
    ]);
}
