<?php
session_start();
require_once 'conexao.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Location: criarCampanha1.html');
    exit;
}

if (empty($_SESSION['usuario_id'])) {
    header('Location: login.html?voltar=criarCampanha1.html');
    exit;
}

$usuario_id = (int) $_SESSION['usuario_id'];

$titulo = trim($_POST['titulo'] ?? '');
$categoria = trim($_POST['categoria'] ?? '');
$resumo = trim($_POST['resumo'] ?? '');
$local = trim($_POST['local'] ?? '');
$instituicao = trim($_POST['instituicao'] ?? '');
$dias = (int) ($_POST['dias'] ?? 30);

$metaTexto = trim($_POST['meta'] ?? '');
$metaTexto = str_replace(['R$', ' '], '', $metaTexto);
$metaTexto = str_replace('.', '', $metaTexto);
$metaTexto = str_replace(',', '.', $metaTexto);

$meta = filter_var($metaTexto, FILTER_VALIDATE_FLOAT);

if (
    $titulo === '' ||
    $categoria === '' ||
    $resumo === '' ||
    $meta === false ||
    $meta <= 0 ||
    !in_array($dias, [7, 15, 30, 45, 60, 90], true)
) {
    exit('Confira os dados da campanha. A meta deve ser um valor válido maior que zero.');
}

if (mb_strlen($titulo) > 80 || mb_strlen($resumo) > 160) {
    exit('O título ou o resumo ultrapassou o limite permitido.');
}

if (!in_array($categoria, [
    'Educação',
    'Tecnologia',
    'Meio ambiente',
    'Saúde',
    'Arte e cultura',
    'Esporte'
], true)) {
    exit('Categoria inválida.');
}

$imagem = null;

if (
    isset($_FILES['capa']) &&
    $_FILES['capa']['error'] !== UPLOAD_ERR_NO_FILE
) {
    if ($_FILES['capa']['error'] !== UPLOAD_ERR_OK) {
        exit('Não foi possível enviar a imagem.');
    }

    if ($_FILES['capa']['size'] > 5 * 1024 * 1024) {
        exit('A imagem deve ter no máximo 5 MB.');
    }

    $arquivoTemporario = $_FILES['capa']['tmp_name'];
    $tipoImagem = (new finfo(FILEINFO_MIME_TYPE))->file($arquivoTemporario);

    $tiposPermitidos = [
        'image/jpeg' => 'jpg',
        'image/png' => 'png',
        'image/webp' => 'webp'
    ];

    if (!isset($tiposPermitidos[$tipoImagem])) {
        exit('Formato de imagem inválido. Use JPG, PNG ou WEBP.');
    }

    $pasta = __DIR__ . '/uploads/projetos/';

    if (
        !is_dir($pasta) &&
        !mkdir($pasta, 0755, true) &&
        !is_dir($pasta)
    ) {
        exit('Não foi possível criar a pasta de imagens.');
    }

    $nomeArquivo = bin2hex(random_bytes(16)) . '.' . $tiposPermitidos[$tipoImagem];
    $destino = $pasta . $nomeArquivo;

    if (!move_uploaded_file($arquivoTemporario, $destino)) {
        exit('Não foi possível salvar a imagem enviada.');
    }

    $imagem = 'uploads/projetos/' . $nomeArquivo;
}

$dataInicio = date('Y-m-d');
$dataFim = date('Y-m-d', strtotime("+$dias days"));

try {
    $pdo->beginTransaction();

    $sql = "INSERT INTO projetos
        (
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
            local,
            instituicao
        )
        VALUES
        (
            :usuario_id,
            :titulo,
            :descricao,
            :categoria,
            :imagem,
            :meta_valor,
            0,
            :data_inicio,
            :data_fim,
            'ativa',
            :local,
            :instituicao
        )";

    $stmt = $pdo->prepare($sql);

    $stmt->execute([
        ':usuario_id' => $usuario_id,
        ':titulo' => $titulo,
        ':descricao' => $resumo,
        ':categoria' => $categoria,
        ':imagem' => $imagem,
        ':meta_valor' => $meta,
        ':data_inicio' => $dataInicio,
        ':data_fim' => $dataFim,
        ':local' => $local,
        ':instituicao' => $instituicao
    ]);

    $projetoId = (int) $pdo->lastInsertId();

    $pdo->commit();

    // Cria uma notificação para o criador da campanha.
    // Se a notificação falhar, a campanha permanece cadastrada.
    try {
        $sqlNotificacao = "INSERT INTO notificacoes
            (usuario_id, titulo, mensagem, tipo, lida, link)
            VALUES
            (:usuario_id, :titulo, :mensagem, 'projeto', 0, :link)";

        $stmtNotificacao = $pdo->prepare($sqlNotificacao);

        $stmtNotificacao->execute([
            ':usuario_id' => $usuario_id,
            ':titulo' => 'Campanha publicada!',
            ':mensagem' => 'Sua campanha "' . $titulo . '" foi cadastrada com sucesso.',
            ':link' => 'projeto.html?id=' . $projetoId
        ]);
    } catch (Throwable $erroNotificacao) {
        // Não impede a publicação caso a notificação falhe.
        error_log('Erro ao criar notificação: ' . $erroNotificacao->getMessage());
    }

    header('Location: projeto.html?id=' . $projetoId . '&criado=sucesso');
    exit;

} catch (Throwable $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }

    http_response_code(500);
    exit('Não foi possível cadastrar a campanha. Confira a estrutura da tabela projetos e tente novamente.');
}
