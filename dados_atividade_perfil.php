
<?php
session_start();

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate');

function responder($status, $dados) {
    http_response_code($status);
    echo json_encode($dados, JSON_UNESCAPED_UNICODE);
    exit;
}

if (empty($_SESSION['usuario_id'])) {
    responder(401, [
        'erro' => 'Sessão não encontrada. Faça login novamente.'
    ]);
}

require_once 'conexao.php';

try {
    $usuario_id = (int) $_SESSION['usuario_id'];

    // Projetos criados pelo usuário logado
    $sqlProjetos = "
        SELECT
            id,
            titulo,
            descricao,
            categoria,
            imagem,
            meta_valor,
            valor_arrecadado,
            status,
            criado_em
        FROM projetos
        WHERE usuario_id = :usuario_id
        ORDER BY criado_em DESC
    ";

    $consultaProjetos = $pdo->prepare($sqlProjetos);
    $consultaProjetos->execute([
        ':usuario_id' => $usuario_id
    ]);

    $projetos = $consultaProjetos->fetchAll(PDO::FETCH_ASSOC);

    // Doações confirmadas feitas pelo usuário logado
    $sqlDoacoes = "
        SELECT
            d.id,
            d.projeto_id,
            d.valor,
            d.data_doacao,
            p.titulo AS projeto_titulo,
            p.imagem AS projeto_imagem
        FROM doacoes d
        INNER JOIN projetos p ON p.id = d.projeto_id
        WHERE d.usuario_id = :usuario_id
          AND d.status = 'confirmada'
        ORDER BY d.data_doacao DESC
    ";

    $consultaDoacoes = $pdo->prepare($sqlDoacoes);
    $consultaDoacoes->execute([
        ':usuario_id' => $usuario_id
    ]);

    $doacoes = $consultaDoacoes->fetchAll(PDO::FETCH_ASSOC);

    // Total doado pelo usuário
    $totalDoado = 0;

    foreach ($doacoes as $doacao) {
        $totalDoado += (float) $doacao['valor'];
    }

    // Quantidade de projetos diferentes apoiados
    $projetosApoiados = [];

    foreach ($doacoes as $doacao) {
        $projetosApoiados[] = $doacao['projeto_id'];
    }

    $quantidadeApoiados = count(array_unique($projetosApoiados));

    responder(200, [
        'projetos' => $projetos,
        'doacoes' => $doacoes,
        'estatisticas' => [
            'total_projetos' => count($projetos),
            'total_apoiados' => $quantidadeApoiados,
            'total_doado' => $totalDoado
        ]
    ]);

} catch (Throwable $e) {
    error_log('Erro em dados_atividade_perfil.php: ' . $e->getMessage());

    responder(500, [
        'erro' => 'Erro ao consultar as atividades do perfil.'
    ]);
}
