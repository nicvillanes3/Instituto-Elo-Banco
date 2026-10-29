
<?php
session_start();
header('Content-Type: application/json; charset=utf-8');

function responder($status, $dados)
{
    http_response_code($status);
    echo json_encode($dados, JSON_UNESCAPED_UNICODE);
    exit;
}

if (empty($_SESSION['usuario_id'])) {
    responder(401, [
        'sucesso' => false,
        'mensagem' => 'Faça login para consultar esta doação.'
    ]);
}

$doacaoId = filter_input(INPUT_GET, 'doacao_id', FILTER_VALIDATE_INT);

if (!$doacaoId || $doacaoId <= 0) {
    responder(400, [
        'sucesso' => false,
        'mensagem' => 'Identificador da doação inválido.'
    ]);
}

require_once __DIR__ . '/conexao.php';

try {
    $sql = "SELECT
                d.id AS doacao_id,
                d.valor,
                d.metodo_pagamento,
                d.status,
                p.id AS projeto_id,
                p.titulo AS projeto_titulo
            FROM doacoes d
            INNER JOIN projetos p ON p.id = d.projeto_id
            WHERE d.id = :doacao_id
              AND d.usuario_id = :usuario_id
            LIMIT 1";

    $consulta = $pdo->prepare($sql);
    $consulta->execute([
        ':doacao_id' => $doacaoId,
        ':usuario_id' => (int) $_SESSION['usuario_id']
    ]);

    $doacao = $consulta->fetch();

    if (!$doacao) {
        responder(404, [
            'sucesso' => false,
            'mensagem' => 'Doação não encontrada.'
        ]);
    }

    responder(200, [
        'sucesso' => true,
        'doacao' => $doacao
    ]);

} catch (PDOException $erro) {
    error_log('Erro ao consultar doação: ' . $erro->getMessage());

    responder(500, [
        'sucesso' => false,
        'mensagem' => 'Não foi possível carregar os dados da doação.'
    ]);
}
