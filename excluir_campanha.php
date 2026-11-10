<?php
session_start();

header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/conexao.php';

// Verifica se existe uma sessão
$usuarioId = $_SESSION['usuario_id'] ?? null;

if (!$usuarioId) {
    http_response_code(401);

    echo json_encode([
        'sucesso' => false,
        'mensagem' => 'Faça login para continuar.'
    ]);

    exit;
}

// Confere se o usuário é administrador ativo
$consultaAdmin = $pdo->prepare(
    "SELECT tipo
     FROM usuarios
     WHERE id = :id AND ativo = 1
     LIMIT 1"
);

$consultaAdmin->execute([':id' => $usuarioId]);

$usuario = $consultaAdmin->fetch(PDO::FETCH_ASSOC);

if (!$usuario || $usuario['tipo'] !== 'administrador') {
    http_response_code(403);

    echo json_encode([
        'sucesso' => false,
        'mensagem' => 'Acesso não autorizado.'
    ]);

    exit;
}

// Aceita somente requisições POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);

    echo json_encode([
        'sucesso' => false,
        'mensagem' => 'Método não permitido.'
    ]);

    exit;
}

// Recebe o ID da campanha
$dados = json_decode(file_get_contents('php://input'), true);

$idProjeto = filter_var(
    $dados['id'] ?? null,
    FILTER_VALIDATE_INT
);

if (!$idProjeto || $idProjeto <= 0) {
    http_response_code(400);

    echo json_encode([
        'sucesso' => false,
        'mensagem' => 'Campanha inválida.'
    ]);

    exit;
}

try {

    // Verifica se a campanha existe e ainda não foi excluída
    $consulta = $pdo->prepare(
        "SELECT id
         FROM projetos
         WHERE id = :id
         AND COALESCE(status, '') <> 'excluido'
         LIMIT 1"
    );

    $consulta->execute([':id' => $idProjeto]);

    if (!$consulta->fetch()) {
        http_response_code(404);

        echo json_encode([
            'sucesso' => false,
            'mensagem' => 'Campanha não encontrada ou já excluída.'
        ]);

        exit;
    }

    // Exclusão lógica: preserva doações e demais registros relacionados
    $excluir = $pdo->prepare(
        "UPDATE projetos
         SET status = 'excluido',
             atualizado_em = NOW()
         WHERE id = :id"
    );

    $excluir->execute([':id' => $idProjeto]);

    echo json_encode([
        'sucesso' => true,
        'mensagem' => 'Campanha excluída com sucesso.'
    ], JSON_UNESCAPED_UNICODE);

} catch (Throwable $erro) {

    error_log('Erro ao excluir campanha: ' . $erro->getMessage());

    http_response_code(500);

    echo json_encode([
        'sucesso' => false,
        'mensagem' => 'Erro interno ao excluir a campanha.'
    ]);

}