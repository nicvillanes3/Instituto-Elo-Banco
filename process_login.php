
<?php
session_start();
require_once 'conexao.php';

// Permite somente requisições POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Location: login.html');
    exit;
}

// Recebe os dados do formulário
$email = trim($_POST['email'] ?? '');
$senha = $_POST['password'] ?? '';

// Verifica se os campos foram preenchidos
if ($email === '' || $senha === '') {
    header('Location: login.html?erro=campos');
    exit;
}

try {
    // Busca o usuário pelo e-mail
    $sql = "SELECT id, nome, email, senha, tipo, ativo
            FROM usuarios
            WHERE email = :email
            LIMIT 1";

    $consulta = $pdo->prepare($sql);
    $consulta->execute([
        'email' => $email
    ]);

    $usuario = $consulta->fetch(PDO::FETCH_ASSOC);

    // Verifica o usuário e a senha
    if (
        !$usuario ||
        !password_verify($senha, $usuario['senha'])
    ) {
        header('Location: login.html?erro=credenciais');
        exit;
    }

    // Verifica se a conta está ativa
    if (!(int) $usuario['ativo']) {
        header('Location: login.html?erro=inativo');
        exit;
    }

    // Regenera o identificador da sessão
    session_regenerate_id(true);

    // Salva os dados na sessão PHP
    $_SESSION['usuario_id'] = (int) $usuario['id'];
    $_SESSION['usuario_nome'] = $usuario['nome'];
    $_SESSION['usuario_email'] = $usuario['email'];
    $_SESSION['usuario_tipo'] = $usuario['tipo'];

    // Finaliza a gravação da sessão
    session_write_close();

    // Dados que serão utilizados pelo auth.js
    $sessao = [
        'id' => (int) $usuario['id'],
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

    if ($sessaoJson === false) {
        header('Location: login.html?erro=servidor');
        exit;
    }
    ?>

    <!DOCTYPE html>
    <html lang="pt-BR">

    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Entrando...</title>
    </head>

    <body>

        <p>Login realizado! Redirecionando...</p>

        <script>
            try {
                const sessao = <?php echo $sessaoJson; ?>;

                localStorage.setItem(
                    'eloSessao',
                    JSON.stringify(sessao)
                );

                window.location.replace('perfil.html');

            } catch (erro) {
                console.error(
                    'Não foi possível salvar os dados locais:',
                    erro
                );

                // A sessão PHP já foi iniciada.
                // Continua para o perfil mesmo se o localStorage falhar.
                window.location.replace('perfil.html');
            }
        </script>

    </body>

    </html>

    <?php
    exit;

} catch (PDOException $e) {
    error_log('Erro no login do Elo: ' . $e->getMessage());

    header('Location: login.html?erro=servidor');
    exit;
}
