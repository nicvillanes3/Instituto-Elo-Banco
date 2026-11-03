
<?php
require_once 'conexao.php';

header('Content-Type: application/json; charset=utf-8');

$id = filter_input(INPUT_GET, 'id', FILTER_VALIDATE_INT);

if (!$id || $id < 1) {
    http_response_code(400);

    echo json_encode([
        'sucesso' => false,
        'erro' => 'ID de projeto inválido.'
    ], JSON_UNESCAPED_UNICODE);

    exit;
}

try {
    // ==========================================
    // BUSCAR PROJETO
    // ==========================================

    $sql = "SELECT
                id,
                usuario_id,
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

        echo json_encode([
            'sucesso' => false,
            'erro' => 'Projeto não encontrado.'
        ], JSON_UNESCAPED_UNICODE);

        exit;
    }

    // ==========================================
    // CALCULAR PRAZO
    // ==========================================

    $dias = 0;

    if (!empty($p['data_fim'])) {
        $hoje = new DateTimeImmutable('today');
        $fim = new DateTimeImmutable($p['data_fim']);

        $dias = max(
            0,
            (int) $hoje->diff($fim)->format('%r%a')
        );
    }

    // ==========================================
    // CALCULAR VALORES E PROGRESSO
    // ==========================================

    $meta = (float) $p['meta_valor'];
    $arrecadado = (float) $p['valor_arrecadado'];

    $porcentagem = $meta > 0
        ? min(100, (int) round(($arrecadado / $meta) * 100))
        : 0;

    // ==========================================
    // CONTAR APOIADORES
    // ==========================================

    $sqlApoiadores = "SELECT COUNT(DISTINCT usuario_id)
                      FROM doacoes
                      WHERE projeto_id = :projeto_id
                      AND status = 'confirmada'";

    $stmtApoiadores = $pdo->prepare($sqlApoiadores);

    $stmtApoiadores->execute([
        ':projeto_id' => $id
    ]);

    $apoiadores = (int) $stmtApoiadores->fetchColumn();

    // ==========================================
    // CORES DAS CATEGORIAS
    // ==========================================

    $cores = [
        'Educação' => '#075BE8',
        'Tecnologia' => '#6C63FF',
        'Meio ambiente' => '#16A05D',
        'Saúde' => '#E45C70',
        'Arte e cultura' => '#C17BDB',
        'Esporte' => '#E3A008'
    ];

    $cor = $cores[$p['categoria']] ?? '#075BE8';

    // ==========================================
    // BUSCAR ATUALIZAÇÕES
    // ==========================================

    $sqlAtualizacoes = "SELECT
                            id,
                            titulo,
                            conteudo,
                            imagem,
                            criado_em
                        FROM atualizacoes_projeto
                        WHERE projeto_id = :projeto_id
                        ORDER BY criado_em DESC, id DESC";

    $stmtAtualizacoes = $pdo->prepare($sqlAtualizacoes);

    $stmtAtualizacoes->execute([
        ':projeto_id' => $id
    ]);

    $atualizacoes = [];

    foreach ($stmtAtualizacoes->fetchAll() as $item) {
        $atualizacoes[] = [
            'id' => (int) $item['id'],
            'titulo' => $item['titulo'],
            'texto' => $item['conteudo'],
            'descricao' => $item['conteudo'],
            'imagem' => $item['imagem'],
            'data' => date(
                'd/m/Y H:i',
                strtotime($item['criado_em'])
            )
        ];
    }

    // ==========================================
    // RETORNAR DADOS DO PROJETO
    // ==========================================

    echo json_encode([
        'sucesso' => true,

        'projeto' => [
            'id' => (int) $p['id'],

            'titulo' => $p['titulo'],
            'categoria' => $p['categoria'],
            'desc' => $p['descricao'],

            'img' => $p['imagem'] ?: '',

            'local' => $p['local'] ?: 'Brasil',
            'nivel' => $p['instituicao'] ?: 'Instituição de ensino',

            'meta' => $meta,
            'arrecadado' => $arrecadado,
            'pct' => $porcentagem,

            'dias' => $dias,
            'apoiadores' => $apoiadores,

            'cor' => $cor,

            'sobre' => [
                $p['descricao']
            ],

            'destaques' => [],

            'atualizacoes' => $atualizacoes
        ]

    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

} catch (Throwable $e) {
    error_log('Erro ao buscar projeto: ' . $e->getMessage());

    http_response_code(500);

    echo json_encode([
        'sucesso' => false,
        'erro' => 'Não foi possível consultar o projeto.'
    ], JSON_UNESCAPED_UNICODE);
}
