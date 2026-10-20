
<?php
session_start();
require_once 'conexao.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Location: login.html');
    exit;
}

$email = trim($_POST['email'] ?? '');
$senha = $_POST['password'] ?? '';

if ($email === '' || $senha === '') {
    header('Location: login.html?erro=campos');
    exit;
}

try {
    $sql = "SELECT id, nome, email, senha, tipo, ativo
            FROM usuarios
            WHERE email = :email
            LIMIT 1";

    $consulta = $pdo->prepare($sql);
    $consulta->execute(['email' => $email]);
    $usuario = $consulta->fetch();

    if (!$usuario || !password_verify($senha, $usuario['senha'])) {
        header('Location: login.html?erro=credenciais');
        exit;
    }

    if (!(int)$usuario['ativo']) {
        header('Location: login.html?erro=inativo');
        exit;
    }

    session_regenerate_id(true);

    $_SESSION['usuario_id'] = $usuario['id'];
    $_SESSION['usuario_nome'] = $usuario['nome'];
    $_SESSION['usuario_email'] = $usuario['email'];
    $_SESSION['usuario_tipo'] = $usuario['tipo'];

    $sessao = [
        'id' => $usuario['id'],
        'nome' => $usuario['nome'],
        'email' => $usuario['email'],
        'tipo' => $usuario['tipo']
    ];

    $sessaoJson = json_encode(
        $sessao,
        JSON_UNESCAPED_UNICODE |
        JSON_HEX_TAG |
        JSON_HEX_APOS |
        JSON_HEX_QUOT |
        JSON_HEX_AMP
    );
    ?>
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Entrando...</title>
    </head>
    <body>
        <script>
            localStorage.setItem('eloSessao', <?php echo json_encode($sessaoJson); ?>);
            window.location.replace('perfil.html');
        </script>
    </body>
    </html>
    <?php
    exit;

} catch (PDOException $e) {
    header('Location: login.html?erro=servidor');
    exit;
}
