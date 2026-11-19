
<?php
session_start();

header('Content-Type: application/json; charset=utf-8');

function responder($status, $dados)
{
    http_response_code($status);
    echo json_encode($dados, JSON_UNESCAPED_UNICODE);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    responder(405, [
        'sucesso' => false,
        'mensagem' => 'Método não permitido.'
    ]);
}

$usuarioId = filter_var(
    $_SESSION['usuario_id'] ?? null,
    FILTER_VALIDATE_INT
);

if (!$usuarioId || $usuarioId <= 0) {
    responder(401, [
        'sucesso' => false,
        'mensagem' => 'Faça login novamente.'
    ]);
}

$dados = json_decode(file_get_contents('php://input'), true);

$doacaoId = filter_var(
    $dados['doacao_id'] ?? null,
    FILTER_VALIDATE_INT
);

if (!$doacaoId || $doacaoId <= 0) {
    responder(400, [
        'sucesso' => false,
        'mensagem' => 'Doação inválida.'
    ]);
}

try {
    require_once __DIR__ . '/conexao.php';

    // Verifica se é administrador ativo
    $consultaAdmin = $pdo->prepare(
        "SELECT tipo
         FROM usuarios
         WHERE id = :id AND ativo = 1
         LIMIT 1"
    );

    $consultaAdmin->execute([
        ':id' => $usuarioId
    ]);

    $admin = $consultaAdmin->fetch(PDO::FETCH_ASSOC);

    if (!$admin || $admin['tipo'] !== 'administrador') {
        responder(403, [
            'sucesso' => false,
            'mensagem' => 'Apenas administradores podem confirmar doações.'
        ]);
    }

    $pdo->beginTransaction();

    // Bloqueia a doação para evitar confirmações simultâneas
    $consulta = $pdo->prepare(
        "SELECT id, valor, status
         FROM doacoes
         WHERE id = :id
         FOR UPDATE"
    );

    $consulta->execute([
        ':id' => $doacaoId
    ]);

    $doacao = $consulta->fetch(PDO::FETCH_ASSOC);

    if (!$doacao) {
        $pdo->rollBack();

        responder(404, [
            'sucesso' => false,
            'mensagem' => 'Doação não encontrada.'
        ]);
    }

    if ($doacao['status'] !== 'pendente') {
        $pdo->rollBack();

        responder(409, [
            'sucesso' => false,
            'mensagem' => 'Esta doação não está pendente. Status atual: ' . $doacao['status']
        ]);
    }

    // A atualização dispara o trigger de confirmação
    $atualizar = $pdo->prepare(
        "UPDATE doacoes
         SET status = 'confirmada'
         WHERE id = :id AND status = 'pendente'"
    );

    $atualizar->execute([
        ':id' => $doacaoId
    ]);

    if ($atualizar->rowCount() !== 1) {
        throw new Exception('Não foi possível confirmar a doação.');
    }

    $pdo->commit();

    responder(200, [
        'sucesso' => true,
        'mensagem' => 'Doação confirmada com sucesso!',
        'doacao_id' => $doacaoId
    ]);

} catch (Throwable $erro) {

    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }

    error_log('Erro ao confirmar doação: ' . $erro->getMessage());

    responder(500, [
        'sucesso' => false,
        'mensagem' => 'Erro ao confirmar a doação.'
    ]);
}
