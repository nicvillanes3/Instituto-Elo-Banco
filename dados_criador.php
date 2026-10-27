
<?php
session_start();
header('Content-Type: application/json; charset=utf-8');

require_once 'conexao.php';

if (empty($_SESSION['usuario_id'])) {
    http_response_code(401);
    echo json_encode([
        'sucesso' => false,
        'mensagem' => 'Sua sessão expirou. Entre novamente.'
    ]);
    exit;
}

try {
    $usuarioId = (int) $_SESSION['usuario_id'];

    // Busca o nome atualizado da conta conectada.
    $stmtUsuario = $pdo->prepare(
        'SELECT id, nome, email
         FROM usuarios
         WHERE id = :id AND ativo = 1
         LIMIT 1'
    );
    $stmtUsuario->execute(['id' => $usuarioId]);
    $usuario = $stmtUsuario->fetch(PDO::FETCH_ASSOC);

    if (!$usuario) {
        http_response_code(401);
        echo json_encode([
            'sucesso' => false,
            'mensagem' => 'Usuário não encontrado ou inativo.'
        ]);
        exit;
    }

    // Retorna somente campanhas pertencentes a esse usuário.
    $stmtProjetos = $pdo->prepare(
        'SELECT
            id,
            titulo,
            descricao,
            categoria,
            imagem,
            meta_valor,
            valor_arrecadado,
            data_inicio,
            data_fim,
            status
         FROM projetos
         WHERE usuario_id = :usuario_id
         ORDER BY criado_em DESC'
    );
    $stmtProjetos->execute(['usuario_id' => $usuarioId]);
    $registros = $stmtProjetos->fetchAll(PDO::FETCH_ASSOC);

    $hoje = new DateTimeImmutable('today');
    $projetos = [];

    foreach ($registros as $p) {
        $meta = (float) $p['meta_valor'];
        $arrecadado = (float) $p['valor_arrecadado'];

        $dias = 0;
        if (!empty($p['data_fim'])) {
            $fim = new DateTimeImmutable($p['data_fim']);
            $dias = max(0, (int) $hoje->diff($fim)->format('%r%a'));
        }

        $projetos[] = [
            'id' => (int) $p['id'],
            'titulo' => $p['titulo'],
            'desc' => $p['descricao'] ?? '',
            'categoria' => $p['categoria'] ?? '',
            'img' => $p['imagem'] ?? '',
            'meta' => $meta,
            'arrecadado' => $arrecadado,
            'pct' => $meta > 0
                ? min(100, (int) round(($arrecadado / $meta) * 100))
                : 0,
            'dias' => $dias,
            'status' => $p['status'] ?? '',
            'apoiadores' => 0,
            'atualizacoes' => []
        ];
    }

    echo json_encode([
        'sucesso' => true,
        'usuario' => [
            'id' => (int) $usuario['id'],
            'nome' => $usuario['nome'],
            'email' => $usuario['email']
        ],
        'projetos' => $projetos
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode([
        'sucesso' => false,
        'mensagem' => 'Não foi possível carregar os dados do painel.'
    ]);
}
