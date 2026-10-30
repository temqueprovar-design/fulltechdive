<?php
// Uso (no computador, nunca no servidor): php make_users.php pedro SENHA1 admin SENHA2
// Gera admin/_data/users.json com as senhas protegidas (hash).
if (php_sapi_name() !== 'cli') { http_response_code(404); exit; }
$a = array_slice($argv, 1);
if (count($a) < 2 || count($a) % 2) { fwrite(STDERR, "Uso: php make_users.php usuario senha [usuario senha ...]\n"); exit(1); }
$users = array();
for ($i = 0; $i < count($a); $i += 2) {
    $salt = substr(strtr(base64_encode(md5(uniqid(mt_rand(), true), true) . md5(mt_rand(), true)), '+', '.'), 0, 22);
    $users[] = array('user' => strtolower($a[$i]), 'hash' => crypt($a[$i + 1], '$2y$10$' . $salt));
}
@mkdir(dirname(__FILE__) . '/_data', 0755, true);
file_put_contents(dirname(__FILE__) . '/_data/users.json', json_encode($users, JSON_PRETTY_PRINT));
echo "ok: " . count($users) . " usuario(s)\n";
