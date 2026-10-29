
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

require_once 'conexao.php';

$id = (int) $_SESSION['usuario_id'];

try {
    $consulta = $pdo->prepare(
        "SELECT id FROM usuarios
         WHERE id = :id AND ativo = 1
         LIMIT 1"
    );
    $consulta->execute([':id' => $id]);

    if (!$consulta->fetch()) {
        responder(404, ['erro' => 'Usuário não encontrado ou inativo.']);
    }

    $metodo = $_SERVER['REQUEST_METHOD'];

    if ($metodo === 'GET') {
        $consulta = $pdo->prepare(
            "SELECT notificacoes_email, notificacoes_sistema,
                    perfil_publico
             FROM preferencias_usuario
             WHERE usuario_id = :id
             LIMIT 1"
        );
        $consulta->execute([':id' => $id]);
        $preferencias = $consulta->fetch();

        if (!$preferencias) {
            $preferencias = [
                'notificacoes_email' => 1,
                'notificacoes_sistema' => 1,
                'perfil_publico' => 1
            ];
        }

        responder(200, [
            'notificacoes_email' =>
                (bool) $preferencias['notificacoes_email'],
            'notificacoes_sistema' =>
                (bool) $preferencias['notificacoes_sistema'],
            'perfil_publico' =>
                (bool) $preferencias['perfil_publico']
        ]);
    }

    if ($metodo !== 'POST') {
        responder(405, ['erro' => 'Método não permitido.']);
    }

    $entrada = json_decode(file_get_contents('php://input'), true);

    if (!is_array($entrada)) {
        responder(400, ['erro' => 'Dados enviados inválidos.']);
    }

    $campos = [
        'notificacoes_email',
        'notificacoes_sistema',
        'perfil_publico'
    ];

    foreach ($campos as $campo) {
        if (!array_key_exists($campo, $entrada) ||
            !in_array($entrada[$campo], [true, false, 0, 1], true)) {
            responder(422, [
                'erro' => 'Informe todas as preferências corretamente.'
            ]);
        }
    }

    $sql = "INSERT INTO preferencias_usuario
                (usuario_id, notificacoes_email,
                 notificacoes_sistema, perfil_publico)
            VALUES
                (:id, :email, :sistema, :publico)
            ON DUPLICATE KEY UPDATE
                notificacoes_email = VALUES(notificacoes_email),
                notificacoes_sistema = VALUES(notificacoes_sistema),
                perfil_publico = VALUES(perfil_publico)";

    $consulta = $pdo->prepare($sql);
    $consulta->execute([
        ':id' => $id,
        ':email' => (int) $entrada['notificacoes_email'],
        ':sistema' => (int) $entrada['notificacoes_sistema'],
        ':publico' => (int) $entrada['perfil_publico']
    ]);

    responder(200, [
        'mensagem' => 'Preferências salvas com sucesso.'
    ]);

} catch (Throwable $e) {
    error_log('Erro nas preferências: ' . $e->getMessage());

    responder(500, [
        'erro' => 'Não foi possível processar as preferências.'
    ]);
}
