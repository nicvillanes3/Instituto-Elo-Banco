
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

    // Junta notificações individuais e gerais.
    $sql = "
        SELECT *
        FROM (
            SELECT
                id,
                titulo,
                mensagem,
                tipo,
                lida,
                link,
                criado_em
            FROM notificacoes
            WHERE usuario_id = :usuario_individual

            UNION ALL

            SELECT
                -ng.id AS id,
                ng.titulo,
                ng.mensagem,
                ng.tipo,
                CASE
                    WHEN l.id IS NULL THEN 0
                    ELSE 1
                END AS lida,
                NULL AS link,
                ng.criado_em
            FROM notificacoes_gerais ng
            LEFT JOIN notificacoes_gerais_lidas l
                ON l.notificacao_id = ng.id
                AND l.usuario_id = :usuario_geral
        ) AS todas
        ORDER BY criado_em DESC, id DESC
        LIMIT :limite OFFSET :offset
    ";

    $consulta = $pdo->prepare($sql);

    $consulta->bindValue(
        ':usuario_individual',
        $usuarioId,
        PDO::PARAM_INT
    );

    $consulta->bindValue(
        ':usuario_geral',
        $usuarioId,
        PDO::PARAM_INT
    );

    $consulta->bindValue(':limite', $limite, PDO::PARAM_INT);
    $consulta->bindValue(':offset', $offset, PDO::PARAM_INT);

    $consulta->execute();

    $notificacoes = $consulta->fetchAll(PDO::FETCH_ASSOC);

    // Contadores individuais.
    $consultaIndividual = $pdo->prepare("
        SELECT
            COUNT(*) AS total,
            COALESCE(SUM(lida = 0), 0) AS nao_lidas,
            COALESCE(SUM(tipo = 'doacao'), 0) AS doacoes,
            COALESCE(SUM(tipo = 'projeto'), 0) AS projetos,
            COALESCE(SUM(tipo = 'sistema'), 0) AS sistema
        FROM notificacoes
        WHERE usuario_id = ?
    ");

    $consultaIndividual->execute([$usuarioId]);
    $individuais = $consultaIndividual->fetch(PDO::FETCH_ASSOC);

    // Contadores gerais considerando a leitura de cada usuário.
    $consultaGeral = $pdo->prepare("
        SELECT
            COUNT(*) AS total,
            COALESCE(SUM(l.id IS NULL), 0) AS nao_lidas,
            COALESCE(SUM(ng.tipo = 'doacao'), 0) AS doacoes,
            COALESCE(SUM(ng.tipo = 'projeto'), 0) AS projetos,
            COALESCE(SUM(ng.tipo = 'sistema'), 0) AS sistema
        FROM notificacoes_gerais ng
        LEFT JOIN notificacoes_gerais_lidas l
            ON l.notificacao_id = ng.id
            AND l.usuario_id = ?
    ");

    $consultaGeral->execute([$usuarioId]);
    $gerais = $consultaGeral->fetch(PDO::FETCH_ASSOC);

    // Soma os contadores das duas tabelas.
    $contadores = [];

    foreach ([
        'total',
        'nao_lidas',
        'doacoes',
        'projetos',
        'sistema'
    ] as $campo) {
        $contadores[$campo] =
            (int) $individuais[$campo] +
            (int) $gerais[$campo];
    }

    $total = $contadores['total'];

    echo json_encode([
        'logado' => true,
        'notificacoes' => $notificacoes,
        'contadores' => $contadores,
        'pagina' => $pagina,
        'tem_mais' => ($offset + count($notificacoes)) < $total
    ], JSON_UNESCAPED_UNICODE);

} catch (Throwable $e) {
    error_log('Erro ao listar notificações: ' . $e->getMessage());

    http_response_code(500);

    echo json_encode([
        'erro' => 'Não foi possível carregar as notificações.'
    ], JSON_UNESCAPED_UNICODE);
}
