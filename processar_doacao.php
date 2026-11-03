
<?php
session_start();

header('Content-Type: application/json; charset=utf-8');

function responder($status, $dados)
{
    http_response_code($status);
    echo json_encode($dados, JSON_UNESCAPED_UNICODE);
    exit;
}

// Somente POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    responder(405, [
        'sucesso' => false,
        'mensagem' => 'Método não permitido.'
    ]);
}

// Verifica sessão
$usuarioId = filter_var(
    $_SESSION['usuario_id'] ?? null,
    FILTER_VALIDATE_INT
);

if (!$usuarioId || $usuarioId <= 0) {
    responder(401, [
        'sucesso' => false,
        'mensagem' => 'Faça login para realizar uma doação.'
    ]);
}

// Recebe JSON
$dados = json_decode(file_get_contents('php://input'), true);

if (!is_array($dados)) {
    responder(400, [
        'sucesso' => false,
        'mensagem' => 'Dados enviados inválidos.'
    ]);
}

// Valida projeto
$projetoId = filter_var(
    $dados['projeto_id'] ?? null,
    FILTER_VALIDATE_INT
);

if (!$projetoId || $projetoId <= 0) {
    responder(400, [
        'sucesso' => false,
        'mensagem' => 'Projeto inválido.'
    ]);
}

// Valida valor
$valorRecebido = $dados['valor'] ?? null;

if (
    !is_string($valorRecebido) &&
    !is_int($valorRecebido) &&
    !is_float($valorRecebido)
) {
    responder(400, [
        'sucesso' => false,
        'mensagem' => 'Valor inválido.'
    ]);
}

$valorTexto = trim((string) $valorRecebido);

if (!preg_match('/^\d+(\.\d{1,2})?$/', $valorTexto)) {
    responder(400, [
        'sucesso' => false,
        'mensagem' => 'Formato de valor inválido.'
    ]);
}

$valor = (float) $valorTexto;

if ($valor <= 0 || $valor > 1000000) {
    responder(400, [
        'sucesso' => false,
        'mensagem' => 'Valor fora do limite permitido.'
    ]);
}

// Valida método
$metodo = $dados['metodo_pagamento'] ?? '';

$metodosPermitidos = ['pix', 'cartao', 'boleto'];

if (!in_array($metodo, $metodosPermitidos, true)) {
    responder(400, [
        'sucesso' => false,
        'mensagem' => 'Método de pagamento inválido.'
    ]);
}

try {
    require_once __DIR__ . '/conexao.php';

    // Confirma usuário ativo
    $consultaUsuario = $pdo->prepare(
        "SELECT id FROM usuarios
         WHERE id = :id AND ativo = 1
         LIMIT 1"
    );

    $consultaUsuario->execute([
        ':id' => $usuarioId
    ]);

    if (!$consultaUsuario->fetch()) {
        responder(401, [
            'sucesso' => false,
            'mensagem' => 'Usuário não encontrado ou inativo.'
        ]);
    }

    // Confirma projeto
    $consultaProjeto = $pdo->prepare(
        "SELECT id FROM projetos
         WHERE id = :id
         LIMIT 1"
    );

    $consultaProjeto->execute([
        ':id' => $projetoId
    ]);

    if (!$consultaProjeto->fetch()) {
        responder(404, [
            'sucesso' => false,
            'mensagem' => 'Projeto não encontrado.'
        ]);
    }

    // Registra doação como pendente
    $pdo->beginTransaction();

    $sql = "INSERT INTO doacoes
        (usuario_id, projeto_id, valor, metodo_pagamento, status, anonimato)
        VALUES
        (:usuario_id, :projeto_id, :valor, :metodo, 'pendente', 0)";

    $inserir = $pdo->prepare($sql);

    $inserir->execute([
        ':usuario_id' => $usuarioId,
        ':projeto_id' => $projetoId,
        ':valor' => number_format($valor, 2, '.', ''),
        ':metodo' => $metodo
    ]);

    $doacaoId = (int) $pdo->lastInsertId();

    $pdo->commit();

    responder(201, [
        'sucesso' => true,
        'mensagem' => 'Doação registrada com sucesso.',
        'doacao_id' => $doacaoId
    ]);

} catch (Throwable $erro) {

    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }

    error_log('Erro ao registrar doação: ' . $erro->getMessage());

    responder(500, [
        'sucesso' => false,
        'mensagem' => 'Erro ao registrar a doação.'
    ]);
}
