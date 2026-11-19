<?php
session_start();

header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/conexao.php';

function responder($sucesso, $mensagem, $codigo = 200) {
    http_response_code($codigo);

    echo json_encode([
        'sucesso' => $sucesso,
        'mensagem' => $mensagem
    ], JSON_UNESCAPED_UNICODE);

    exit;
}

// Somente POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    responder(false, 'Método não permitido.', 405);
}

// Verifica se está logado
if (empty($_SESSION['usuario_id'])) {
    responder(false, 'Sessão expirada. Faça login novamente.', 401);
}

// Verifica se é administrador
$stmtAdmin = $pdo->prepare("
    SELECT tipo, ativo
    FROM usuarios
    WHERE id = ?
    LIMIT 1
");

$stmtAdmin->execute([$_SESSION['usuario_id']]);
$usuario = $stmtAdmin->fetch(PDO::FETCH_ASSOC);

if (!$usuario || $usuario['tipo'] !== 'administrador' || (int)$usuario['ativo'] !== 1) {
    responder(false, 'Acesso restrito aos administradores.', 403);
}

// Recebe os dados
$dados = json_decode(file_get_contents('php://input'), true);

$id = isset($dados['projeto_id']) ? (int)$dados['projeto_id'] : 0;
$acao = $dados['acao'] ?? '';

if ($id <= 0) {
    responder(false, 'ID da campanha inválido.', 400);
}

if (!in_array($acao, ['arquivar', 'reativar'], true)) {
    responder(false, 'Ação inválida.', 400);
}

try {

    // Busca a campanha
    $stmt = $pdo->prepare("
        SELECT id, titulo, status
        FROM projetos
        WHERE id = ?
        LIMIT 1
    ");

    $stmt->execute([$id]);
    $projeto = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$projeto) {
        responder(false, 'Campanha não encontrada.', 404);
    }

    // ARQUIVAR
    if ($acao === 'arquivar') {

        if ($projeto['status'] === 'arquivado') {
            responder(false, 'Esta campanha já está arquivada.');
        }

        if ($projeto['status'] === 'excluido') {
            responder(false, 'Esta campanha foi excluída e não pode ser arquivada.');
        }

        $stmt = $pdo->prepare("
            UPDATE projetos
            SET status = 'arquivado'
            WHERE id = ?
        ");

        $stmt->execute([$id]);

        responder(true, 'Campanha arquivada com sucesso!');
    }

    // REATIVAR
    if ($acao === 'reativar') {

        if ($projeto['status'] !== 'arquivado') {
            responder(false, 'Esta campanha não está arquivada.');
        }

        $stmt = $pdo->prepare("
            UPDATE projetos
            SET status = 'publicado'
            WHERE id = ?
        ");

        $stmt->execute([$id]);

        responder(true, 'Campanha reativada e publicada com sucesso!');
    }

} catch (PDOException $e) {

    error_log('Erro ao gerenciar campanha: ' . $e->getMessage());

    responder(false, 'Erro interno ao atualizar a campanha.', 500);
}