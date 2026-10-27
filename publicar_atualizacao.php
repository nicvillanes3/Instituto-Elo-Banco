
<?php
session_start();
require_once 'conexao.php';

header('Content-Type: application/json; charset=utf-8');

function responderAtualizacao(int $status, array $dados): void {
    http_response_code($status);
    echo json_encode($dados, JSON_UNESCAPED_UNICODE);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    responderAtualizacao(405, ['erro' => 'Método não permitido.']);
}

if (empty($_SESSION['usuario_id'])) {
    responderAtualizacao(401, ['erro' => 'Faça login novamente.']);
}

$usuarioId = (int) $_SESSION['usuario_id'];
$idProjeto = filter_input(INPUT_POST, 'projeto_id', FILTER_VALIDATE_INT);
$titulo = trim($_POST['titulo'] ?? '');
$conteudo = trim($_POST['conteudo'] ?? '');

if (!$idProjeto || $idProjeto < 1) {
    responderAtualizacao(400, ['erro' => 'Campanha inválida.']);
}

if ($titulo === '' || mb_strlen($titulo) > 150) {
    responderAtualizacao(400, [
        'erro' => 'Informe um título com até 150 caracteres.'
    ]);
}

if ($conteudo === '') {
    responderAtualizacao(400, [
        'erro' => 'Escreva o conteúdo da atualização.'
    ]);
}

try {
    $verificar = $pdo->prepare(
        'SELECT id FROM projetos
         WHERE id = :id AND usuario_id = :usuario_id'
    );

    $verificar->execute([
        ':id' => $idProjeto,
        ':usuario_id' => $usuarioId
    ]);

    if (!$verificar->fetch()) {
        responderAtualizacao(404, [
            'erro' => 'Campanha não encontrada ou sem permissão.'
        ]);
    }

    $sql = "INSERT INTO atualizacoes_projeto
                (projeto_id, titulo, conteudo, imagem)
            VALUES
                (:projeto_id, :titulo, :conteudo, NULL)";

    $stmt = $pdo->prepare($sql);
    $stmt->execute([
        ':projeto_id' => $idProjeto,
        ':titulo' => $titulo,
        ':conteudo' => $conteudo
    ]);

    responderAtualizacao(201, [
        'sucesso' => true,
        'mensagem' => 'Atualização publicada com sucesso.',
        'id' => (int) $pdo->lastInsertId()
    ]);

} catch (Throwable $e) {
    error_log($e->getMessage());
    responderAtualizacao(500, [
        'erro' => 'Não foi possível publicar a atualização.'
    ]);
}
