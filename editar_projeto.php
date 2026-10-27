
<?php
session_start();
require_once 'conexao.php';

header('Content-Type: application/json; charset=utf-8');

function responder(int $status, array $dados): void {
    http_response_code($status);
    echo json_encode($dados, JSON_UNESCAPED_UNICODE);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    responder(405, ['erro' => 'Método não permitido.']);
}

if (empty($_SESSION['usuario_id'])) {
    responder(401, ['erro' => 'Faça login novamente.']);
}

$usuarioId = (int) $_SESSION['usuario_id'];
$id = filter_input(INPUT_POST, 'id', FILTER_VALIDATE_INT);

$titulo = trim($_POST['titulo'] ?? '');
$descricao = trim($_POST['descricao'] ?? '');
$categoria = trim($_POST['categoria'] ?? '');
$metaTexto = trim($_POST['meta'] ?? '');

$categoriasPermitidas = [
    'Educação',
    'Tecnologia',
    'Meio ambiente',
    'Saúde',
    'Arte e cultura',
    'Esporte'
];

$metaTexto = preg_replace('/[R$\s]/u', '', $metaTexto);
$metaTexto = str_replace('.', '', $metaTexto);
$metaTexto = str_replace(',', '.', $metaTexto);
$meta = is_numeric($metaTexto) ? (float) $metaTexto : 0;

if (!$id || $id < 1) {
    responder(400, ['erro' => 'Campanha inválida.']);
}

if ($titulo === '' || mb_strlen($titulo) > 80) {
    responder(400, [
        'erro' => 'Informe um título com até 80 caracteres.'
    ]);
}

if ($descricao === '' || mb_strlen($descricao) > 160) {
    responder(400, [
        'erro' => 'Informe uma descrição com até 160 caracteres.'
    ]);
}

if (!in_array($categoria, $categoriasPermitidas, true)) {
    responder(400, ['erro' => 'Categoria inválida.']);
}

if ($meta <= 0) {
    responder(400, ['erro' => 'Informe uma meta válida.']);
}

try {
    $sql = "UPDATE projetos
            SET titulo = :titulo,
                descricao = :descricao,
                categoria = :categoria,
                meta_valor = :meta,
                atualizado_em = CURRENT_TIMESTAMP
            WHERE id = :id
              AND usuario_id = :usuario_id";

    $stmt = $pdo->prepare($sql);
    $stmt->execute([
        ':titulo' => $titulo,
        ':descricao' => $descricao,
        ':categoria' => $categoria,
        ':meta' => $meta,
        ':id' => $id,
        ':usuario_id' => $usuarioId
    ]);

    $verificar = $pdo->prepare(
        'SELECT id FROM projetos
         WHERE id = :id AND usuario_id = :usuario_id'
    );

    $verificar->execute([
        ':id' => $id,
        ':usuario_id' => $usuarioId
    ]);

    if (!$verificar->fetch()) {
        responder(404, [
            'erro' => 'Campanha não encontrada ou sem permissão.'
        ]);
    }

    responder(200, [
        'sucesso' => true,
        'mensagem' => 'Campanha atualizada com sucesso.'
    ]);

} catch (Throwable $e) {
    error_log($e->getMessage());
    responder(500, ['erro' => 'Não foi possível salvar a campanha.']);
}
