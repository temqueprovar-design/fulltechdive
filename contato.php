<?php
/*
 * Envio do formulário de contato (site público).
 * Recebe JSON {nome, email, msg, site} e manda um e-mail para a Full Tech Dive.
 * Compatível com PHP 5.4+. O campo "site" é uma armadilha para robôs: tem que vir vazio.
 */
error_reporting(E_ALL);
ini_set('display_errors', '0');
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

define('DEST', 'contato@fulltechdive.com.br');

function done($ok, $msg, $code) {
    if ($code != 200) { http_response_code($code); }
    echo json_encode($ok ? array('ok' => true) : array('ok' => false, 'error' => $msg));
    exit;
}

if (!isset($_SERVER['REQUEST_METHOD']) || $_SERVER['REQUEST_METHOD'] !== 'POST') { done(false, 'Método inválido.', 405); }

$d = json_decode(file_get_contents('php://input'), true);
if (!is_array($d)) { done(false, 'Dados inválidos.', 400); }

// robô: finge que deu certo
if (!empty($d['site'])) { done(true, '', 200); }

function clean($s, $max) {
    if (!is_string($s)) { return ''; }
    $s = trim(preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F]/', '', $s));
    return function_exists('mb_substr') ? mb_substr($s, 0, $max, 'UTF-8') : substr($s, 0, $max);
}

$nome = clean(isset($d['nome']) ? $d['nome'] : '', 100);
$email = clean(isset($d['email']) ? $d['email'] : '', 150);
$msg = clean(isset($d['msg']) ? $d['msg'] : '', 3000);

// impede injeção de cabeçalhos
$nome = str_replace(array("\r", "\n"), ' ', $nome);
$email = str_replace(array("\r", "\n"), '', $email);

if ($nome === '' || $msg === '') { done(false, 'Preencha o nome e a mensagem.', 400); }
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) { done(false, 'Confira o e-mail digitado.', 400); }

// limite simples por visitante: 1 mensagem a cada 30 segundos, 8 por hora
$ip = isset($_SERVER['REMOTE_ADDR']) ? $_SERVER['REMOTE_ADDR'] : '?';
$f = rtrim(sys_get_temp_dir(), '/\\') . '/ftd_contato_' . md5($ip) . '.json';
$hist = array();
if (is_file($f)) {
    $h = json_decode(@file_get_contents($f), true);
    if (is_array($h)) { $hist = $h; }
}
$now = time();
$recent = array();
foreach ($hist as $t) { if ($now - $t < 3600) { $recent[] = $t; } }
if ($recent && ($now - max($recent)) < 30) { done(false, 'Aguarde alguns segundos e tente de novo.', 429); }
if (count($recent) >= 8) { done(false, 'Muitas mensagens em pouco tempo. Tente mais tarde ou fale pelo WhatsApp.', 429); }

$host = isset($_SERVER['SERVER_NAME']) ? preg_replace('/^www\./', '', $_SERVER['SERVER_NAME']) : 'fulltechdive.com.br';
$body = "Mensagem enviada pelo site:\r\n\r\n" . $msg . "\r\n\r\n---\r\nNome: " . $nome . "\r\nE-mail: " . $email . "\r\n";
$subject = '=?UTF-8?B?' . base64_encode('Contato pelo site - ' . $nome) . '?=';
$headers = "From: Site Full Tech Dive <contato@" . $host . ">\r\n" .
    "Reply-To: " . $nome . " <" . $email . ">\r\n" .
    "Content-Type: text/plain; charset=UTF-8\r\n";
$headers = str_replace("Reply-To: " . $nome . " <", "Reply-To: =?UTF-8?B?" . base64_encode($nome) . "?= <", $headers);

if (!@mail(DEST, $subject, $body, $headers)) {
    done(false, 'Não consegui enviar agora. Fale com a gente pelo WhatsApp ou por e-mail.', 500);
}

$recent[] = $now;
@file_put_contents($f, json_encode($recent));
done(true, '', 200);
