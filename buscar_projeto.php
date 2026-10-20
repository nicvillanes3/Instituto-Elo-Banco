
<?php
require_once 'conexao.php';

header('Content-Type: application/json; charset=utf-8');

$id = filter_input(INPUT_GET, 'id', FILTER_VALIDATE_INT);

if (!$id || $id < 1) {
    http_response_code(400);
    echo json_encode(['erro' => 'ID de projeto inválido.']);
    exit;
}

try {
    $sql = "SELECT
                id,
                titulo,
                descricao,
                categoria,
                imagem,
                meta_valor,
                valor_arrecadado,
                data_inicio,
                data_fim,
                status,
                `local`,
                instituicao
            FROM projetos
            WHERE id = :id
            LIMIT 1";

    $stmt = $pdo->prepare($sql);
    $stmt->execute([':id' => $id]);
    $p = $stmt->fetch();

    if (!$p) {
        http_response_code(404);
        echo json_encode(['erro' => 'Projeto não encontrado.']);
        exit;
    }

    $hoje = new DateTimeImmutable('today');
    $fim = new DateTimeImmutable($p['data_fim']);
    $dias = max(0, (int) $hoje->diff($fim)->format('%r%a'));

    $cores = [
        'Educação' => '#075BE8',
        'Tecnologia' => '#6C63FF',
        'Meio ambiente' => '#16A05D',
        'Saúde' => '#E45C70',
        'Arte e cultura' => '#C17BDB',
        'Esporte' => '#E3A008'
    ];

    $meta = (float) $p['meta_valor'];
    $arrecadado = (float) $p['valor_arrecadado'];

    echo json_encode([
        'id' => (int) $p['id'],
        'titulo' => $p['titulo'],
        'categoria' => $p['categoria'],
        'img' => $p['imagem'] ?: '',
        'desc' => $p['descricao'],
        'local' => $p['local'] ?: 'Brasil',
        'nivel' => $p['instituicao'] ?: 'Instituição de ensino',
        'meta' => $meta,
        'arrecadado' => $arrecadado,
        'pct' => $meta > 0
            ? min(100, (int) round($arrecadado / $meta * 100))
            : 0,
        'dias' => $dias,
        'apoiadores' => 0,
        'cor' => $cores[$p['categoria']] ?? '#075BE8',
        'sobre' => [$p['descricao']],
        'destaques' => [],
        'atualizacoes' => []
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['erro' => 'Não foi possível consultar o projeto.']);
}
