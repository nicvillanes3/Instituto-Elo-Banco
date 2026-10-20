
<?php
session_start();
header('Content-Type: application/json; charset=utf-8');

if (!isset($_SESSION['usuario_id'])) {
    http_response_code(401);
    echo json_encode(['erro' => 'Faça login para acessar seu perfil.']);
    exit;
}

require_once 'conexao.php';

try {
    $sql = "SELECT id, nome, email, foto_perfil, biografia, tipo, criado_em
            FROM usuarios
            WHERE id = :id AND ativo = 1
            LIMIT 1";

    $consulta = $pdo->prepare($sql);
    $consulta->execute(['id' => $_SESSION['usuario_id']]);
    $usuario = $consulta->fetch();

    if (!$usuario) {
        http_response_code(404);
        echo json_encode(['erro' => 'Usuário não encontrado.']);
        exit;
    }

    echo json_encode([
        'id' => $usuario['id'],
        'nome' => $usuario['nome'],
        'email' => $usuario['email'],
        'foto_perfil' => $usuario['foto_perfil'],
        'biografia' => $usuario['biografia'],
        'tipo' => $usuario['tipo'],
        'criado_em' => $usuario['criado_em']
    ], JSON_UNESCAPED_UNICODE);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['erro' => 'Não foi possível carregar o perfil.']);
}
