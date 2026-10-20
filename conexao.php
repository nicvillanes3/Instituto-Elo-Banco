
<?php
$host = 'localhost';
$banco = 'elo';
$usuario = 'root';
$senha = '';

try {
    $pdo = new PDO(
        "mysql:host=$host;dbname=$banco;charset=utf8mb4",
        $usuario,
        $senha,
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
        ]
    );
} catch (PDOException $e) {
    exit('Não foi possível conectar ao banco de dados. Confira se o MySQL está iniciado e as configurações.');
}
