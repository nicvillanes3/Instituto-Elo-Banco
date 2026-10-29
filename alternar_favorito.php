
<?php
session_start();

header('Content-Type: application/json; charset=utf-8');

if (!isset($_SESSION['usuario_id'])) {
    http_response_code(401);
    echo json_encode([
        'sucesso' => false,
        'mensagem' => 'Faça login para favoritar projetos.',
        'login' => false
    ]);
    exit;
}

require_once 'conexao.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode([
        'sucesso' => false,
        'mensagem' => 'Método não permitido.'
    ]);
    exit;
}

$dados = json_decode(file_get_contents('php://input'), true);
$projeto_id = filter_var(
    $dados['projeto_id'] ?? null,
    FILTER_VALIDATE_INT
);

if (!$projeto_id || $projeto_id < 1) {
    http_response_code(400);
    echo json_encode([
        'sucesso' => false,
        'mensagem' => 'Projeto inválido.'
    ]);
    exit;
}

try {
    $usuario_id = (int) $_SESSION['usuario_id'];

    // Confirma que o projeto existe.
    $consulta = $pdo->prepare(
        'SELECT id FROM projetos WHERE id = ?'
    );
    $consulta->execute([$projeto_id]);

    if (!$consulta->fetch(PDO::FETCH_ASSOC)) {
        http_response_code(404);
        echo json_encode([
            'sucesso' => false,
            'mensagem' => 'Projeto não encontrado.'
        ]);
        exit;
    }

    // Verifica se já está nos favoritos deste usuário.
    $consulta = $pdo->prepare(
        'SELECT id FROM favoritos
         WHERE usuario_id = ? AND projeto_id = ?'
    );
    $consulta->execute([$usuario_id, $projeto_id]);

    if ($consulta->fetch(PDO::FETCH_ASSOC)) {
        $consulta = $pdo->prepare(
            'DELETE FROM favoritos
             WHERE usuario_id = ? AND projeto_id = ?'
        );
        $consulta->execute([$usuario_id, $projeto_id]);

        echo json_encode([
            'sucesso' => true,
            'favoritado' => false,
            'mensagem' => 'Projeto removido dos favoritos.'
        ]);
    } else {
        $consulta = $pdo->prepare(
            'INSERT INTO favoritos (usuario_id, projeto_id)
             VALUES (?, ?)'
        );
        $consulta->execute([$usuario_id, $projeto_id]);

        echo json_encode([
            'sucesso' => true,
            'favoritado' => true,
            'mensagem' => 'Projeto adicionado aos favoritos.'
        ]);
    }
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'sucesso' => false,
        'mensagem' => 'Não foi possível atualizar os favoritos.'
    ]);
}
