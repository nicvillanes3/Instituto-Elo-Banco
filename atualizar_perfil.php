
<?php
session_start();
header('Content-Type: application/json; charset=utf-8');

function responder($status, $dados) {
    http_response_code($status);
    echo json_encode($dados, JSON_UNESCAPED_UNICODE);
    exit;
}

if (!isset($_SESSION['usuario_id'])) {
    responder(401, ['erro' => 'Faça login novamente.']);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    responder(405, ['erro' => 'Método não permitido.']);
}

require_once 'conexao.php';

$nome = trim($_POST['nome'] ?? '');
$email = trim($_POST['email'] ?? '');
$biografia = trim($_POST['biografia'] ?? '');

if ($nome === '' || mb_strlen($nome) > 100) {
    responder(422, ['erro' => 'Informe um nome de até 100 caracteres.']);
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL) || mb_strlen($email) > 150) {
    responder(422, ['erro' => 'Informe um e-mail válido.']);
}

if (mb_strlen($biografia) > 200) {
    responder(422, ['erro' => 'A biografia deve ter até 200 caracteres.']);
}

try {
    $consulta = $pdo->prepare(
        "SELECT foto_perfil FROM usuarios WHERE id = :id AND ativo = 1 LIMIT 1"
    );
    $consulta->execute(['id' => $_SESSION['usuario_id']]);
    $usuario = $consulta->fetch();

    if (!$usuario) {
        responder(404, ['erro' => 'Usuário não encontrado.']);
    }

    $foto = $usuario['foto_perfil'];

    if (isset($_FILES['foto']) && $_FILES['foto']['error'] !== UPLOAD_ERR_NO_FILE) {
        if ($_FILES['foto']['error'] !== UPLOAD_ERR_OK) {
            responder(422, ['erro' => 'Não foi possível enviar a foto.']);
        }

        if ($_FILES['foto']['size'] > 2 * 1024 * 1024) {
            responder(422, ['erro' => 'A foto deve ter no máximo 2 MB.']);
        }

        $info = getimagesize($_FILES['foto']['tmp_name']);

        if ($info === false) {
            responder(422, ['erro' => 'O arquivo enviado não é uma imagem válida.']);
        }

        $tipos = [
            'image/jpeg' => 'jpg',
            'image/png' => 'png',
            'image/webp' => 'webp'
        ];

        $mime = $info['mime'] ?? '';

        if (!isset($tipos[$mime])) {
            responder(422, ['erro' => 'Use uma imagem JPG, PNG ou WEBP.']);
        }

        $pasta = __DIR__ . '/uploads/perfil/';

        if (!is_dir($pasta) && !mkdir($pasta, 0755, true)) {
            responder(500, ['erro' => 'Não foi possível preparar a pasta das fotos.']);
        }

        $nomeArquivo = bin2hex(random_bytes(16)) . '.' . $tipos[$mime];

        if (!move_uploaded_file($_FILES['foto']['tmp_name'], $pasta . $nomeArquivo)) {
            responder(500, ['erro' => 'Não foi possível salvar a foto.']);
        }

        $foto = 'uploads/perfil/' . $nomeArquivo;
    }

    $sql = "UPDATE usuarios
            SET nome = :nome,
                email = :email,
                biografia = :biografia,
                foto_perfil = :foto
            WHERE id = :id AND ativo = 1";

    $atualizar = $pdo->prepare($sql);
    $atualizar->execute([
        'nome' => $nome,
        'email' => $email,
        'biografia' => $biografia,
        'foto' => $foto,
        'id' => $_SESSION['usuario_id']
    ]);

    $_SESSION['usuario_nome'] = $nome;
    $_SESSION['usuario_email'] = $email;

    responder(200, [
        'mensagem' => 'Perfil atualizado com sucesso!',
        'usuario' => [
            'nome' => $nome,
            'email' => $email,
            'biografia' => $biografia,
            'foto_perfil' => $foto
        ]
    ]);

} catch (PDOException $e) {
    if ($e->getCode() === '23000') {
        responder(409, ['erro' => 'Este e-mail já está cadastrado em outra conta.']);
    }

    responder(500, ['erro' => 'Não foi possível atualizar o perfil.']);
}
