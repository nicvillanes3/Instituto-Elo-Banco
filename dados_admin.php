
<?php
session_start();

header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/conexao.php';

// =========================================
// FUNÇÃO DE RESPOSTA
// =========================================

function responderJSON($dados, $codigo = 200) {
    http_response_code($codigo);

    echo json_encode(
        $dados,
        JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES
    );

    exit;
}

// =========================================
// VERIFICAR LOGIN
// =========================================

if (empty($_SESSION['usuario_id'])) {
    responderJSON([
        'sucesso' => false,
        'mensagem' => 'Você precisa estar logado.'
    ], 401);
}

// =========================================
// VERIFICAR ADMINISTRADOR
// =========================================

try {

    $stmtAdmin = $pdo->prepare("
        SELECT tipo, ativo
        FROM usuarios
        WHERE id = ?
        LIMIT 1
    ");

    $stmtAdmin->execute([
        $_SESSION['usuario_id']
    ]);

    $usuario = $stmtAdmin->fetch(PDO::FETCH_ASSOC);

    if (
        !$usuario ||
        $usuario['tipo'] !== 'administrador' ||
        (int)$usuario['ativo'] !== 1
    ) {
        responderJSON([
            'sucesso' => false,
            'mensagem' => 'Acesso restrito aos administradores.'
        ], 403);
    }

    // =========================================
    // FINANCEIRO
    // =========================================

    /*
        Somente doações confirmadas entram nos valores financeiros.

        5%  -> Instituto Elo
        95% -> Campanhas
    */

    $stmtFinanceiro = $pdo->query("
        SELECT
            COALESCE(SUM(valor), 0) AS total_arrecadado
        FROM doacoes
        WHERE status = 'confirmada'
    ");

    $financeiro = $stmtFinanceiro->fetch(PDO::FETCH_ASSOC);

    $totalArrecadado = (float)(
        $financeiro['total_arrecadado'] ?? 0
    );

    $totalElo = $totalArrecadado * 0.05;

    $totalCampanhas = $totalArrecadado * 0.95;

    // =========================================
    // TOTAL DE PROJETOS
    // =========================================

    /*
        Projetos excluídos não entram na contagem.
        Arquivados continuam sendo contabilizados.
    */

    $stmtProjetos = $pdo->query("
        SELECT COUNT(*) AS total
        FROM projetos
        WHERE status <> 'excluido'
    ");

    $totalProjetos = (int)(
        $stmtProjetos->fetch(PDO::FETCH_ASSOC)['total'] ?? 0
    );

    // =========================================
    // TOTAL DE USUÁRIOS ATIVOS
    // =========================================

    $stmtUsuarios = $pdo->query("
        SELECT COUNT(*) AS total
        FROM usuarios
        WHERE ativo = 1
    ");

    $totalUsuarios = (int)(
        $stmtUsuarios->fetch(PDO::FETCH_ASSOC)['total'] ?? 0
    );

    // =========================================
    // CAMPANHAS
    // =========================================

    /*
        Retorna todas as campanhas não excluídas.

        Inclui:
        - rascunho
        - em_analise
        - publicado
        - concluido
        - cancelado
        - arquivado

        O status é necessário para os botões
        Arquivar e Reativar do painel.
    */

    $stmtCampanhas = $pdo->query("
        SELECT
            p.id,
            p.usuario_id,
            p.titulo,
            p.status,
            p.meta_valor,
            p.valor_arrecadado,
            p.criado_em,

            COALESCE(
                SUM(
                    CASE
                        WHEN d.status = 'confirmada'
                        THEN d.valor
                        ELSE 0
                    END
                ),
                0
            ) AS total_arrecadado

        FROM projetos p

        LEFT JOIN doacoes d
            ON d.projeto_id = p.id

        WHERE p.status <> 'excluido'

        GROUP BY
            p.id,
            p.usuario_id,
            p.titulo,
            p.status,
            p.meta_valor,
            p.valor_arrecadado,
            p.criado_em

        ORDER BY p.id DESC
    ");

    $projetos = $stmtCampanhas->fetchAll(PDO::FETCH_ASSOC);

    // =========================================
    // CALCULAR REPASSE DO ELO POR CAMPANHA
    // =========================================

    foreach ($projetos as &$projeto) {

        $arrecadadoProjeto = (float)(
            $projeto['total_arrecadado'] ?? 0
        );

        $projeto['total_arrecadado'] = round(
            $arrecadadoProjeto,
            2
        );

        $projeto['total_elo'] = round(
            $arrecadadoProjeto * 0.05,
            2
        );

        $projeto['meta_valor'] = (float)(
            $projeto['meta_valor'] ?? 0
        );

        $projeto['valor_arrecadado'] = (float)(
            $projeto['valor_arrecadado'] ?? 0
        );

        $projeto['id'] = (int)$projeto['id'];

        $projeto['usuario_id'] = (int)$projeto['usuario_id'];
    }

    unset($projeto);

    // =========================================
    // RESPOSTA FINAL
    // =========================================

    responderJSON([
        'sucesso' => true,

        'financeiro' => [
            'total_arrecadado' => round($totalArrecadado, 2),
            'total_elo' => round($totalElo, 2),
            'total_campanhas' => round($totalCampanhas, 2)
        ],

        'total_projetos' => $totalProjetos,

        'total_usuarios' => $totalUsuarios,

        'projetos' => $projetos
    ]);

} catch (PDOException $e) {

    error_log(
        'Erro no dados_admin.php: ' . $e->getMessage()
    );

    responderJSON([
        'sucesso' => false,
        'mensagem' => 'Erro ao carregar os dados administrativos.'
    ], 500);
}
