<?php
session_start();

header('Content-Type: application/json; charset=utf-8');

function responder($status, $dados)
{
    http_response_code($status);
    echo json_encode($dados, JSON_UNESCAPED_UNICODE);
    exit;
}

// Aceita somente requisições POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    responder(405, [
        'sucesso' => false,
        'mensagem' => 'Método de requisição não permitido.'
    ]);
}

// Verifica se o usuário está autenticado pela sessão PHP
if (
    !isset($_SESSION['usuario_id']) ||
    !filter_var($_SESSION['usuario_id'], FILTER_VALIDATE_INT) ||
    (int) $_SESSION['usuario_id'] <= 0
) {
    responder(401, [
        'sucesso' => false,
        'mensagem' => 'Faça login para realizar uma doação.'
    ]);
}

$usuarioId = (int) $_SESSION['usuario_id'];

// Lê os dados enviados pelo projeto.js
$conteudo = file_get_contents('php://input');
$dados = json_decode($conteudo, true);

if (!is_array($dados)) {
    responder(400, [
        'sucesso' => false,
        'mensagem' => 'Os dados enviados são inválidos.'
    ]);
}

// Valida o ID do projeto
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

// Valida o valor da doação
$valorRecebido = $dados['valor'] ?? null;

if (
    !is_string($valorRecebido) &&
    !is_int($valorRecebido) &&
    !is_float($valorRecebido)
) {
    responder(400, [
        'sucesso' => false,
        'mensagem' => 'Informe um valor válido.'
    ]);
}

$valorTexto = trim((string) $valorRecebido);

// Aceita números com ponto decimal, como 50.00
if (!preg_match('/^\d+(\.\d{1,2})?$/', $valorTexto)) {
    responder(400, [
        'sucesso' => false,
        'mensagem' => 'O formato do valor é inválido.'
    ]);
}

$valor = (float) $valorTexto;

if ($valor <= 0 || $valor > 1000000) {
    responder(400, [
        'sucesso' => false,
        'mensagem' => 'O valor deve ser maior que zero e não ultrapassar R$ 1.000.000,00.'
    ]);
}

// Valida o método de pagamento
$metodo = $dados['metodo_pagamento'] ?? '';

$metodosPermitidos = ['pix', 'cartao', 'boleto'];

if (!in_array($metodo, $metodosPermitidos, true)) {
    responder(400, [
        'sucesso' => false,
        'mensagem' => 'Selecione uma forma de pagamento válida.'
    ]);
}

try {
    require_once __DIR__ . '/conexao.php';

    // Confirma que o projeto existe
    $consultaProjeto = $pdo->prepare(
        'SELECT id FROM projetos WHERE id = :id LIMIT 1'
    );

    $consultaProjeto->execute([
        ':id' => $projetoId
    ]);

    if (!$consultaProjeto->fetch()) {
        responder(404, [
            'sucesso' => false,
            'mensagem' => 'O projeto informado não foi encontrado.'
        ]);
    }

    // Registra a doação como pendente
    $sql = "INSERT INTO doacoes
                (usuario_id, projeto_id, valor, metodo_pagamento, status, anonimato)
            VALUES
                (:usuario_id, :projeto_id, :valor, :metodo_pagamento, 'pendente', 0)";

    $inserir = $pdo->prepare($sql);

    $inserir->execute([
        ':usuario_id' => $usuarioId,
        ':projeto_id' => $projetoId,
        ':valor' => number_format($valor, 2, '.', ''),
        ':metodo_pagamento' => $metodo
    ]);

    $doacaoId = (int) $pdo->lastInsertId();

    responder(201, [
        'sucesso' => true,
        'mensagem' => 'Doação registrada. Agora você pode continuar para o pagamento.',
        'doacao_id' => $doacaoId
    ]);

} catch (PDOException $erro) {
    error_log('Erro ao registrar doação: ' . $erro->getMessage());

    responder(500, [
        'sucesso' => false,
        'mensagem' => 'Não foi possível registrar a doação. Confira a configuração do banco de dados.'
    ]);
}
