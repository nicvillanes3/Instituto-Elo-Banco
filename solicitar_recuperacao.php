
<?php
header('Content-Type: application/json; charset=utf-8');

require_once 'conexao.php';
require_once 'resend_config.php';

function responder($mensagem, $status = 200) {
    http_response_code($status);
    echo json_encode(['mensagem' => $mensagem]);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    responder('Método não permitido.', 405);
}

$dados = json_decode(file_get_contents('php://input'), true);
$email = trim($dados['email'] ?? '');

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    responder('Informe um e-mail válido.', 400);
}

try {
    // Procura uma conta ativa com esse e-mail.
    $consulta = $pdo->prepare(
        "SELECT id, nome, email
         FROM usuarios
         WHERE email = :email AND ativo = 1
         LIMIT 1"
    );

    $consulta->execute(['email' => $email]);
    $usuario = $consulta->fetch();

    // Resposta genérica para não revelar se o e-mail está cadastrado.
    $respostaGenerica = 'Se esse e-mail estiver cadastrado, você receberá um link para redefinir sua senha.';

    if (!$usuario) {
        responder($respostaGenerica);
    }

    // Invalida solicitações anteriores ainda não utilizadas.
    $invalidar = $pdo->prepare(
        "UPDATE recuperacao_senha
         SET utilizado = 1
         WHERE usuario_id = :usuario_id AND utilizado = 0"
    );

    $invalidar->execute(['usuario_id' => $usuario['id']]);

    // Gera um token aleatório e guarda somente seu hash.
    $token = bin2hex(random_bytes(32));
    $tokenHash = hash('sha256', $token);
    $expiraEm = date('Y-m-d H:i:s', time() + 1800);

    $inserir = $pdo->prepare(
        "INSERT INTO recuperacao_senha
            (usuario_id, token_hash, expira_em, utilizado)
         VALUES
            (:usuario_id, :token_hash, :expira_em, 0)"
    );

    $inserir->execute([
        'usuario_id' => $usuario['id'],
        'token_hash' => $tokenHash,
        'expira_em' => $expiraEm
    ]);

    // Link que será enviado por e-mail.
    $link = APP_URL . '/redefinirSenha.html?token=' . urlencode($token);

    $nome = htmlspecialchars($usuario['nome'], ENT_QUOTES, 'UTF-8');

    $html = "
        <div style='font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#172033'>
            <h2 style='color:#075BE8'>Redefinição de senha - Instituto Elo</h2>
            <p>Olá, {$nome}!</p>
            <p>Recebemos uma solicitação para redefinir a senha da sua conta.</p>
            <p>
                <a href='{$link}'
                   style='display:inline-block;background:#075BE8;color:white;
                   padding:14px 22px;border-radius:8px;text-decoration:none'>
                    Redefinir minha senha
                </a>
            </p>
            <p>Esse link é válido por 30 minutos e só pode ser utilizado uma vez.</p>
            <p>Se você não solicitou essa alteração, pode ignorar este e-mail.</p>
            <p>Instituto Elo</p>
        </div>
    ";

    // Envia pelo Resend.
    $curl = curl_init('https://api.resend.com/emails');

    curl_setopt_array($curl, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_HTTPHEADER => [
            'Authorization: Bearer ' . RESEND_API_KEY,
            'Content-Type: application/json'
        ],
        CURLOPT_POSTFIELDS => json_encode([
            'from' => RESEND_FROM,
            'to' => [$usuario['email']],
            'subject' => 'Redefinição de senha - Instituto Elo',
            'html' => $html
        ]),
        CURLOPT_TIMEOUT => 20
    ]);

    $resultado = curl_exec($curl);
    $erroCurl = curl_error($curl);
    $codigoHttp = curl_getinfo($curl, CURLINFO_HTTP_CODE);

    curl_close($curl);

    if ($resultado === false || $erroCurl || $codigoHttp < 200 || $codigoHttp >= 300) {
        // Se o envio falhar, invalida o token recém-criado.
        $remover = $pdo->prepare(
            "UPDATE recuperacao_senha
             SET utilizado = 1
             WHERE token_hash = :token_hash"
        );
        $remover->execute(['token_hash' => $tokenHash]);

        error_log('Erro ao enviar e-mail pelo Resend: ' . $erroCurl . ' | ' . $resultado);

        responder('Não foi possível enviar o e-mail agora. Tente novamente mais tarde.', 500);
    }

    responder($respostaGenerica);

} catch (Throwable $e) {
    error_log('Erro na recuperação de senha: ' . $e->getMessage());
    responder('Ocorreu um erro ao solicitar a recuperação. Tente novamente.', 500);
}
