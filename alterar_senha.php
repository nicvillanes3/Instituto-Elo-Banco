
<?php
session_start();

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate');

function responder($status, $dados) {
    http_response_code($status);
    echo json_encode($dados, JSON_UNESCAPED_UNICODE);
    exit;
}

if (empty($_SESSION['usuario_id'])) {
    responder(401, ['erro' => 'Faça login novamente.']);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    responder(405, ['erro' => 'Método não permitido.']);
}

require_once 'conexao.php';

$atual = $_POST['senha_atual'] ?? '';
$nova = $_POST['nova_senha'] ?? '';
$confirmacao = $_POST['confirmar_senha'] ?? '';

if ($atual === '' || $nova === '' || $confirmacao === '') {
    responder(422, ['erro' => 'Preencha todos os campos de senha.']);
}

if (strlen($nova) < 8) {
    responder(422, ['erro' => 'A nova senha deve ter pelo menos 8 caracteres.']);
}

if ($nova !== $confirmacao) {
    responder(422, ['erro' => 'A confirmação não corresponde à nova senha.']);
}

try {
    $consulta = $pdo->prepare(
        "SELECT senha FROM usuarios
         WHERE id = :id AND ativo = 1
         LIMIT 1"
    );
    $consulta->execute([
        ':id' => (int) $_SESSION['usuario_id']
    ]);

    $usuario = $consulta->fetch();

    if (!$usuario) {
        responder(404, ['erro' => 'Usuário não encontrado ou inativo.']);
    }

    if (!password_verify($atual, $usuario['senha'])) {
        responder(422, ['erro' => 'A senha atual está incorreta.']);
    }

    if (password_verify($nova, $usuario['senha'])) {
        responder(422, [
            'erro' => 'A nova senha deve ser diferente da senha atual.'
        ]);
    }

    $hash = password_hash($nova, PASSWORD_DEFAULT);

    $consulta = $pdo->prepare(
        "UPDATE usuarios
         SET senha = :senha,
             atualizado_em = CURRENT_TIMESTAMP
         WHERE id = :id AND ativo = 1"
    );

    $consulta->execute([
        ':senha' => $hash,
        ':id' => (int) $_SESSION['usuario_id']
    ]);

    responder(200, ['mensagem' => 'Senha alterada com sucesso.']);

} catch (Throwable $e) {
    error_log('Erro ao alterar senha: ' . $e->getMessage());

    responder(500, ['erro' => 'Não foi possível alterar a senha.']);
}
