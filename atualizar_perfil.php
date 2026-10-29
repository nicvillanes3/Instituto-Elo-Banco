
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

$id = (int) $_SESSION['usuario_id'];
$nome = trim($_POST['nome'] ?? '');
$email = trim($_POST['email'] ?? '');
$biografia = trim($_POST['biografia'] ?? '');

if ($nome === '' || mb_strlen($nome) > 100) {
    responder(422, ['erro' => 'Informe um nome com até 100 caracteres.']);
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL) ||
    mb_strlen($email) > 150) {
    responder(422, ['erro' => 'Informe um e-mail válido.']);
}

if (mb_strlen($biografia) > 1000) {
    responder(422, ['erro' => 'A biografia deve ter até 1000 caracteres.']);
}

try {
    $consulta = $pdo->prepare(
        "SELECT id, foto_perfil
         FROM usuarios
         WHERE id = :id AND ativo = 1
         LIMIT 1"
    );
    $consulta->execute([':id' => $id]);
    $atual = $consulta->fetch();

    if (!$atual) {
        responder(404, ['erro' => 'Usuário não encontrado ou inativo.']);
    }

    // Impede que o e-mail seja usado por outra conta.
    $consulta = $pdo->prepare(
        "SELECT id FROM usuarios
         WHERE email = :email AND id <> :id
         LIMIT 1"
    );
    $consulta->execute([
        ':email' => $email,
        ':id' => $id
    ]);

    if ($consulta->fetch()) {
        responder(409, ['erro' => 'Este e-mail já está cadastrado.']);
    }

    $foto = $atual['foto_perfil'];

    if (isset($_FILES['foto']) &&
        $_FILES['foto']['error'] !== UPLOAD_ERR_NO_FILE) {

        if ($_FILES['foto']['error'] !== UPLOAD_ERR_OK) {
            responder(422, ['erro' => 'Não foi possível enviar a foto.']);
        }

        if ($_FILES['foto']['size'] > 2 * 1024 * 1024) {
            responder(422, ['erro' => 'A foto deve ter no máximo 2 MB.']);
        }

        $temporario = $_FILES['foto']['tmp_name'];

        $finfo = new finfo(FILEINFO_MIME_TYPE);
        $mime = $finfo->file($temporario);

        $tiposPermitidos = [
            'image/jpeg' => 'jpg',
            'image/png' => 'png',
            'image/webp' => 'webp'
        ];

        if (!isset($tiposPermitidos[$mime]) ||
            @getimagesize($temporario) === false) {
            responder(422, [
                'erro' => 'Envie uma imagem JPG, PNG ou WEBP válida.'
            ]);
        }

        $pasta = __DIR__ . '/uploads/perfis';

        if (!is_dir($pasta) &&
            !mkdir($pasta, 0755, true) &&
            !is_dir($pasta)) {
            responder(500, ['erro' => 'Não foi possível criar a pasta de fotos.']);
        }

        $arquivo = 'perfil_' . $id . '_' .
                   bin2hex(random_bytes(8)) . '.' .
                   $tiposPermitidos[$mime];

        if (!move_uploaded_file($temporario, $pasta . '/' . $arquivo)) {
            responder(500, ['erro' => 'Não foi possível salvar a foto.']);
        }

        $foto = 'uploads/perfis/' . $arquivo;
    }

    $sql = "UPDATE usuarios
            SET nome = :nome,
                email = :email,
                biografia = :biografia,
                foto_perfil = :foto,
                atualizado_em = CURRENT_TIMESTAMP
            WHERE id = :id AND ativo = 1";

    $consulta = $pdo->prepare($sql);
    $consulta->execute([
        ':nome' => $nome,
        ':email' => $email,
        ':biografia' => $biografia,
        ':foto' => $foto,
        ':id' => $id
    ]);

    // Mantém os dados da sessão sincronizados.
    $_SESSION['usuario_nome'] = $nome;
    $_SESSION['usuario_email'] = $email;

    $consulta = $pdo->prepare(
        "SELECT id, nome, email, foto_perfil, biografia, tipo, criado_em
         FROM usuarios
         WHERE id = :id
         LIMIT 1"
    );
    $consulta->execute([':id' => $id]);
    $usuario = $consulta->fetch();

    responder(200, [
        'mensagem' => 'Perfil atualizado com sucesso.',
        'usuario' => $usuario
    ]);

} catch (PDOException $e) {
    error_log('Erro ao atualizar perfil: ' . $e->getMessage());

    responder(500, [
        'erro' => 'Não foi possível atualizar o perfil.'
    ]);
} catch (Throwable $e) {
    error_log('Erro inesperado ao atualizar perfil: ' . $e->getMessage());

    responder(500, [
        'erro' => 'Ocorreu um erro ao atualizar o perfil.'
    ]);
}
