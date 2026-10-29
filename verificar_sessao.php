
<?php
session_start();

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate');

if (isset($_SESSION['usuario_id'])) {
    echo json_encode([
        'logado' => true,
        'usuario' => [
            'id' => $_SESSION['usuario_id'],
            'nome' => $_SESSION['usuario_nome'] ?? '',
            'email' => $_SESSION['usuario_email'] ?? ''
        ]
    ]);
} else {
    echo json_encode([
        'logado' => false,
        'usuario' => null
    ]);
}
