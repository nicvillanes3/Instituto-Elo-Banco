
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
    responder(401, [
        'erro' => 'Sessão não encontrada. Faça login novamente.'
    ]);
}

require_once 'conexao.php';

try {
    $sql = "SELECT id, nome, email, foto_perfil, biografia,
                   tipo, criado_em
            FROM usuarios
            WHERE id = :id AND ativo = 1
            LIMIT 1";

    $consulta = $pdo->prepare($sql);
    $consulta->execute([
        ':id' => (int) $_SESSION['usuario_id']
    ]);

    $usuario = $consulta->fetch();

    if (!$usuario) {
        responder(404, [
            'erro' => 'Usuário não encontrado ou conta inativa.'
        ]);
    }

    responder(200, [
        'id' => (int) $usuario['id'],
        'nome' => $usuario['nome'],
        'email' => $usuario['email'],
        'foto_perfil' => $usuario['foto_perfil'],
        'biografia' => $usuario['biografia'],
        'tipo' => $usuario['tipo'],
        'criado_em' => $usuario['criado_em']
    ]);

} catch (Throwable $e) {
    error_log('Erro em dados_perfil.php: ' . $e->getMessage());

    responder(500, [
        'erro' => 'Erro ao consultar os dados do perfil.'
    ]);
}
