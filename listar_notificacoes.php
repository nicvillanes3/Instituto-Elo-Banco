
<?php
session_start();
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate');

if (!isset($_SESSION['usuario_id'])) {
    http_response_code(401);
    echo json_encode([
        'logado' => false,
        'notificacoes' => []
    ]);
    exit;
}

require_once 'conexao.php';

try {
    $usuarioId = (int) $_SESSION['usuario_id'];
    $limite = 10;
    $pagina = max(1, (int) ($_GET['pagina'] ?? 1));
    $offset = ($pagina - 1) * $limite;

    $sql = "
        SELECT id, titulo, mensagem, tipo, lida, link, criado_em
        FROM notificacoes
        WHERE usuario_id = :usuario_id
        ORDER BY criado_em DESC, id DESC
        LIMIT :limite OFFSET :offset
    ";

    $consulta = $pdo->prepare($sql);
    $consulta->bindValue(':usuario_id', $usuarioId, PDO::PARAM_INT);
    $consulta->bindValue(':limite', $limite, PDO::PARAM_INT);
    $consulta->bindValue(':offset', $offset, PDO::PARAM_INT);
    $consulta->execute();

    $notificacoes = $consulta->fetchAll(PDO::FETCH_ASSOC);

    $contagem = $pdo->prepare("
        SELECT
            COUNT(*) AS total,
            COALESCE(SUM(lida = 0), 0) AS nao_lidas,
            COALESCE(SUM(tipo = 'doacao'), 0) AS doacoes,
            COALESCE(SUM(tipo = 'projeto'), 0) AS projetos,
            COALESCE(SUM(tipo = 'sistema'), 0) AS sistema
        FROM notificacoes
        WHERE usuario_id = ?
    ");

    $contagem->execute([$usuarioId]);
    $contadores = $contagem->fetch(PDO::FETCH_ASSOC);

    $total = (int) $contadores['total'];

    echo json_encode([
        'logado' => true,
        'notificacoes' => $notificacoes,
        'contadores' => $contadores,
        'pagina' => $pagina,
        'tem_mais' => ($offset + count($notificacoes)) < $total
    ], JSON_UNESCAPED_UNICODE);

} catch (PDOException $e) {
    error_log('Erro ao listar notificações: ' . $e->getMessage());
    http_response_code(500);

    echo json_encode([
        'erro' => 'Não foi possível carregar as notificações.'
    ], JSON_UNESCAPED_UNICODE);
}
