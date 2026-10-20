
<?php
session_start();
require_once 'conexao.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Location: criarConta.html');
    exit;
}

$nome = trim($_POST['nome'] ?? '');
$email = trim($_POST['email'] ?? '');
$senha = $_POST['password'] ?? '';
$confirmarSenha = $_POST['confirm_password'] ?? '';

if ($nome === '' || $email === '' || $senha === '' || $confirmarSenha === '') {
    exit('Preencha todos os campos. <a href="criarConta.html">Voltar</a>');
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    exit('Digite um e-mail válido. <a href="criarConta.html">Voltar</a>');
}

if (strlen($senha) < 8) {
    exit('A senha precisa ter pelo menos 8 caracteres. <a href="criarConta.html">Voltar</a>');
}

if ($senha !== $confirmarSenha) {
    exit('As senhas não coincidem. <a href="criarConta.html">Voltar</a>');
}

try {
    $consulta = $pdo->prepare(
        'SELECT id FROM usuarios WHERE email = :email LIMIT 1'
    );
    $consulta->execute(['email' => $email]);

    if ($consulta->fetch()) {
        exit('Este e-mail já está cadastrado. <a href="criarConta.html">Voltar</a>');
    }

    $senhaHash = password_hash($senha, PASSWORD_DEFAULT);

    $sql = 'INSERT INTO usuarios (nome, email, senha, tipo, ativo)
            VALUES (:nome, :email, :senha, :tipo, :ativo)';

    $stmt = $pdo->prepare($sql);
    $stmt->execute([
        'nome' => $nome,
        'email' => $email,
        'senha' => $senhaHash,
        'tipo' => 'apoiador',
        'ativo' => 1
    ]);

    header('Location: login.html?cadastro=sucesso');
    exit;

} catch (PDOException $e) {
    if ($e->getCode() === '23000') {
        exit('Este e-mail já está cadastrado. <a href="criarConta.html">Voltar</a>');
    }

    http_response_code(500);
    exit('Não foi possível concluir o cadastro. Tente novamente.');
}
