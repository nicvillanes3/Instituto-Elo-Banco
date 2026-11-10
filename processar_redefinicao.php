
<?php

header('Content-Type: application/json; charset=utf-8');

require_once 'conexao.php';

function responder($mensagem, $status = 200) {
    http_response_code($status);
    echo json_encode(['mensagem' => $mensagem]);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    responder('Método não permitido.', 405);
}

$dados = json_decode(file_get_contents('php://input'), true);

$token = trim($dados['token'] ?? '');
$senha = $dados['senha'] ?? '';
$confirmarSenha = $dados['confirmar_senha'] ?? '';

if (!preg_match('/^[a-f0-9]{64}$/i', $token)) {
    responder('Link de recuperação inválido.', 400);
}

if (strlen($senha) < 8) {
    responder('A senha precisa ter pelo menos 8 caracteres.', 400);
}

if ($senha !== $confirmarSenha) {
    responder('As senhas não coincidem.', 400);
}

try {

    $pdo->beginTransaction();

    // Calcula o hash do token recebido.
    $tokenHash = hash('sha256', $token);

    // Procura um token válido, não utilizado e ainda não expirado.
    $consulta = $pdo->prepare(
        "SELECT id, usuario_id
         FROM recuperacao_senha
         WHERE token_hash = :token_hash
           AND utilizado = 0
           AND expira_em > NOW()
         LIMIT 1
         FOR UPDATE"
    );

    $consulta->execute([
        'token_hash' => $tokenHash
    ]);

    $recuperacao = $consulta->fetch();

    if (!$recuperacao) {
        $pdo->rollBack();

        responder(
            'Este link é inválido, expirou ou já foi utilizado. Solicite uma nova recuperação.',
            400
        );
    }

    // Gera o hash seguro da nova senha.
    $senhaHash = password_hash($senha, PASSWORD_DEFAULT);

    if (!$senhaHash) {
        throw new Exception('Não foi possível proteger a nova senha.');
    }

    // Atualiza a senha do usuário.
    $atualizarSenha = $pdo->prepare(
        "UPDATE usuarios
         SET senha = :senha
         WHERE id = :usuario_id"
    );

    $atualizarSenha->execute([
        'senha' => $senhaHash,
        'usuario_id' => $recuperacao['usuario_id']
    ]);

    if ($atualizarSenha->rowCount() !== 1) {
        throw new Exception('Não foi possível atualizar a senha.');
    }

    // Marca o token utilizado.
    $utilizarToken = $pdo->prepare(
        "UPDATE recuperacao_senha
         SET utilizado = 1
         WHERE id = :id AND utilizado = 0"
    );

    $utilizarToken->execute([
        'id' => $recuperacao['id']
    ]);

    if ($utilizarToken->rowCount() !== 1) {
        throw new Exception('Não foi possível finalizar a recuperação.');
    }

    // Confirma as alterações no banco.
    $pdo->commit();

    responder('Sua senha foi redefinida com sucesso! Você será direcionado para o login.');

} catch (Throwable $e) {

    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }

    error_log('Erro ao redefinir senha: ' . $e->getMessage());

    responder(
        'Ocorreu um erro ao redefinir sua senha. Tente novamente.',
        500
    );
}
