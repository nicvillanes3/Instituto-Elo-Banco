
<?php
session_start();

require_once 'conexao.php';

header('Content-Type: application/json; charset=utf-8');

try {
    // Busca somente os projetos publicados e os dados dos criadores.
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
            WHERE p.status = 'publicado'
            ORDER BY p.criado_em DESC, p.id DESC";

    $consulta = $pdo->query($sql);
    $resultado = $consulta->fetchAll(PDO::FETCH_ASSOC);

    // Cores das categorias.
    $cores = [
        'Tecnologia'       => '#1265df',
        'Meio Ambiente'    => '#1265df',
        'Meio ambiente'    => '#1265df',
        'Educação'         => '#28a745',
        'Sustentabilidade' => '#17a2b8',
        'Inclusão Social'  => '#fd7e14',
        'Cultura'          => '#e83e8c',
        'Saúde'            => '#e83e8c',
        'Arte e cultura'   => '#e83e8c',
        'Esporte'          => '#fd7e14'
    ];

    $projetos = [];
    $hoje = new DateTimeImmutable('today');

    foreach ($resultado as $p) {
        $meta = (float) ($p['meta_valor'] ?? 0);
        $arrecadado = (float) ($p['valor_arrecadado'] ?? 0);

        // Calcula a porcentagem arrecadada.
        $pct = $meta > 0
            ? min(100, (int) round(($arrecadado / $meta) * 100))
            : 0;

        // Calcula os dias restantes.
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
        $autor = !empty($p['autor'])
            ? $p['autor']
            : 'Criador do projeto';

        $local = $p['local'] ?? '';

        $instituicao = !empty($p['instituicao'])
            ? $p['instituicao']
            : (!empty($local) ? $local : $autor);

        // Organiza os dados no formato esperado pelo JavaScript.
        $projetos[] = [
            'id'          => (int) $p['id'],
            'usuario_id'  => (int) ($p['usuario_id'] ?? 0),
            'titulo'      => $p['titulo'] ?? '',
            'categoria'   => $categoria,
            'cor'         => $cores[$categoria] ?? '#2157AE',
            'autor'       => $autor,
            'org'         => $instituicao,
            'local'       => $local,
            'desc'        => $p['descricao'] ?? '',
            'arrecadado'  => $arrecadado,
            'meta'        => $meta,
            'pct'         => $pct,
            'dias'        => $dias,
            'apoiadores'  => 0,
            'img'         => $p['imagem'] ?? '',
            'criado_em'   => $p['criado_em'] ?? null,
            'data_inicio' => $p['data_inicio'] ?? null,
            'data_fim'    => $p['data_fim'] ?? null,
            'status'      => $p['status'] ?? ''
        ];
    }

    // Retorna os projetos em JSON.
    echo json_encode(
        $projetos,
        JSON_UNESCAPED_UNICODE |
        JSON_UNESCAPED_SLASHES |
        JSON_INVALID_UTF8_SUBSTITUTE
    );

} catch (Throwable $e) {
    http_response_code(500);

    echo json_encode([
        'erro' => 'Não foi possível carregar os projetos.'
    ], JSON_UNESCAPED_UNICODE);
}
