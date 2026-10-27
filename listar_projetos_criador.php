
<?php
session_start();
require_once 'conexao.php';

header('Content-Type: application/json; charset=utf-8');

if (empty($_SESSION['usuario_id'])) {
    http_response_code(401);
    echo json_encode(['erro' => 'Faça login para acessar seus projetos.']);
    exit;
}

$usuarioId = (int) $_SESSION['usuario_id'];

try {
    $sql = "SELECT
                p.id,
                p.titulo,
                p.descricao,
                p.categoria,
                p.imagem,
                p.meta_valor,
                p.valor_arrecadado,
                p.data_inicio,
                p.data_fim,
                p.status,
                p.`local`,
                p.instituicao,
                (
                    SELECT COUNT(*)
                    FROM doacoes d
                    WHERE d.projeto_id = p.id
                ) AS apoiadores
            FROM projetos p
            WHERE p.usuario_id = :usuario_id
            ORDER BY p.criado_em DESC";

    $stmt = $pdo->prepare($sql);
    $stmt->execute([':usuario_id' => $usuarioId]);

    $projetos = $stmt->fetchAll();

    $buscarAtualizacoes = $pdo->prepare(
        "SELECT id, titulo, conteudo, imagem, criado_em
         FROM atualizacoes_projeto
         WHERE projeto_id = :projeto_id
         ORDER BY criado_em DESC"
    );

    $hoje = new DateTimeImmutable('today');

    foreach ($projetos as &$projeto) {
        $meta = (float) $projeto['meta_valor'];
        $arrecadado = (float) $projeto['valor_arrecadado'];

        $fim = new DateTimeImmutable($projeto['data_fim']);
        $dias = max(0, (int) $hoje->diff($fim)->format('%r%a'));

        $projeto['id'] = (int) $projeto['id'];
        $projeto['meta'] = $meta;
        $projeto['arrecadado'] = $arrecadado;
        $projeto['apoiadores'] = (int) $projeto['apoiadores'];
        $projeto['dias'] = $dias;
        $projeto['img'] = $projeto['imagem'] ?: '';
        $projeto['desc'] = $projeto['descricao'];

        $buscarAtualizacoes->execute([
            ':projeto_id' => $projeto['id']
        ]);

        $projeto['atualizacoes'] = array_map(
            function ($atualizacao) {
                return [
                    'id' => (int) $atualizacao['id'],
                    'titulo' => $atualizacao['titulo'],
                    'descricao' => $atualizacao['conteudo'],
                    'texto' => $atualizacao['conteudo'],
                    'imagem' => $atualizacao['imagem'],
                    'data' => date(
                        'd/m/Y H:i',
                        strtotime($atualizacao['criado_em'])
                    )
                ];
            },
            $buscarAtualizacoes->fetchAll()
        );
    }

    unset($projeto);

    echo json_encode(
        ['projetos' => $projetos],
        JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES
    );

} catch (Throwable $e) {
    error_log($e->getMessage());

    http_response_code(500);
    echo json_encode([
        'erro' => 'Não foi possível carregar os projetos.'
    ]);
}
