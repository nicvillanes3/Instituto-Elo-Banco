
<?php
session_start();

// Limpa todos os dados da sessão PHP
$_SESSION = [];

// Remove o cookie da sessão do navegador
if (ini_get('session.use_cookies')) {
    $parametros = session_get_cookie_params();

    setcookie(
        session_name(),
        '',
        time() - 42000,
        $parametros['path'],
        $parametros['domain'],
        $parametros['secure'],
        $parametros['httponly']
    );
}

// Encerra a sessão PHP
session_destroy();

// Redireciona para a página inicial
header('Location: index.html');
exit;
