
<?php
session_start();

require_once 'conexao.php';

header('Content-Type: application/json; charset=utf-8');

try {
    // Verifica se existe um usuário conectado.
    if (empty($_SESSION['usuario_id'])) {
        http_response_code(401);

        echo json_encode([
            'erro' => 'Você precisa entrar na sua conta para ver seus projetos.'
        ], JSON_UNESCAPED_UNICODE);

        exit;
    }

    $usuarioId = (int) $_SESSION['usuario_id'];

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
                p.criado_em,
                p.status,
                p.`local`,
                p.instituicao,
                u.nome AS autor
            FROM projetos p
            LEFT JOIN usuarios u ON u.id = p.usuario_id
            WHERE p.usuario_id = :usuario_id
            ORDER BY p.criado_em DESC, p.id DESC";

    $consulta = $pdo->prepare($sql);
    $consulta->execute([
        'usuario_id' => $usuarioId
    ]);

    $resultado = $consulta->fetchAll(PDO::FETCH_ASSOC);

    $cores = [
        'Tecnologia'       => '#1265df',
        'Meio Ambiente'    => '#1265df',
        'Meio ambiente'    => '#1265df',
        'Educação'         => '#28a745',
        'Sustentabilidade' => '#17a2b8',
        'Inclusão Social'  => '#fd7e14',
        'Cultura'           => '#e83e8c',
        'Saúde'             => '#e83e8c',
        'Arte e cultura'    => '#e83e8c',
        'Esporte'           => '#fd7e14'
    ];

    $projetos = [];
    $hoje = new DateTimeImmutable('today');

    foreach ($resultado as $p) {
        $meta = (float) ($p['meta_valor'] ?? 0);
        $arrecadado = (float) ($p['valor_arrecadado'] ?? 0);

        $pct = $meta > 0
            ? (int) round(($arrecadado / $meta) * 100)
            : 0;

        $dias = 0;

        if (!empty($p['data_fim'])) {
            try {
                $dataFim = new DateTimeImmutable($p['data_fim']);

                $dias = max(
                    0,
                    (int) $hoje->diff($dataFim)->format('%r%a')
                );
            } catch (Exception $e) {
                $dias = 0;
            }
        }

        $categoria = $p['categoria'] ?? '';
        $local = $p['local'] ?? '';

        $autor = !empty($p['autor'])
            ? $p['autor']
            : 'Criador do projeto';

        $projetos[] = [
            'id'          => (int) $p['id'],
            'usuario_id'  => (int) $p['usuario_id'],
            'titulo'      => $p['titulo'] ?? '',
            'categoria'   => $categoria,
            'cor'         => $cores[$categoria] ?? '#2157AE',
            'autor'       => $autor,
            'org'         => $p['instituicao'] ?: ($local ?: $autor),
            'local'       => $local,
            'desc'        => $p['descricao'] ?? '',
            'arrecadado'  => $arrecadado,
            'meta'        => $meta,
            'pct'         => $pct,
            'dias'        => $dias,
            'apoiadores'  => 0,
            'img'         => $p['imagem'] ?? '',
            'criadoEm'    => !empty($p['criado_em'])
                ? substr($p['criado_em'], 0, 10)
                : date('Y-m-d'),
            'concluidoEm' => null,
            'data_inicio' => $p['data_inicio'] ?? null,
            'data_fim'    => $p['data_fim'] ?? null,
            'status'      => $p['status'] ?? ''
        ];
    }

    echo json_encode(
        $projetos,
        JSON_UNESCAPED_UNICODE |
        JSON_UNESCAPED_SLASHES |
        JSON_INVALID_UTF8_SUBSTITUTE
    );

} catch (Throwable $e) {
    http_response_code(500);

    echo json_encode([
        'erro' => 'Não foi possível carregar seus projetos.'
    ], JSON_UNESCAPED_UNICODE);
}
