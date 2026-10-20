
<?php
session_start();
require_once 'conexao.php';

header('Content-Type: application/json; charset=utf-8');

try {
    $sql = "SELECT
                p.id,
                p.usuario_id,
                p.titulo,
                p.descricao,
                p.categoria,
                p.imagem,
                p.meta_valor,
                p.valor_arrecadado,
                p.data_inicio,
                p.data_fim,
                p.local,
                p.instituicao,
                u.nome AS autor
            FROM projetos p
            LEFT JOIN usuarios u ON u.id = p.usuario_id
            WHERE p.status = 'ativa'
            ORDER BY p.criado_em DESC";

    $consulta = $pdo->query($sql);
    $resultado = $consulta->fetchAll();

    $cores = [
        'Tecnologia' => '#1265df',
        'Meio Ambiente' => '#1265df',
        'Educação' => '#28a745',
        'Sustentabilidade' => '#17a2b8',
        'Inclusão Social' => '#fd7e14',
        'Cultura' => '#e83e8c',
        'Saúde' => '#e83e8c',
        'Arte e cultura' => '#e83e8c',
        'Esporte' => '#fd7e14'
    ];

    $projetos = [];

    foreach ($resultado as $p) {
        $meta = (float) $p['meta_valor'];
        $arrecadado = (float) $p['valor_arrecadado'];

        $pct = $meta > 0
            ? min(100, (int) round(($arrecadado / $meta) * 100))
            : 0;

        $dataFim = new DateTime($p['data_fim']);
        $hoje = new DateTime('today');

        $dias = $hoje > $dataFim
            ? 0
            : (int) $hoje->diff($dataFim)->days;

        $categoria = $p['categoria'];

        $projetos[] = [
            'id' => (int) $p['id'],
            'usuario_id' => (int) $p['usuario_id'],
            'titulo' => $p['titulo'],
            'categoria' => $categoria,
            'cor' => $cores[$categoria] ?? '#2157AE',
            'autor' => $p['autor'] ?? 'Criador do projeto',
            'org' => $p['instituicao'] ?: ($p['local'] ?: ($p['autor'] ?? 'Instituição')),
            'desc' => $p['descricao'],
            'arrecadado' => $arrecadado,
            'meta' => $meta,
            'pct' => $pct,
            'dias' => $dias,
            'apoiadores' => 0,
            'img' => $p['imagem']
        ];
    }

    echo json_encode(
        $projetos,
        JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES
    );

} catch (Throwable $e) {
    http_response_code(500);

    echo json_encode([
        'erro' => 'Não foi possível carregar os projetos.'
    ], JSON_UNESCAPED_UNICODE);
}
