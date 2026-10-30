<?php
/*
 * Painel Full Tech Dive - API
 * Escrito para funcionar em PHP 5.4 ou mais novo (sem recursos de PHP 7).
 *
 * O painel guarda tudo em admin/_data/site.json e, a cada salvamento, gera os
 * arquivos que o site público lê: assets/data/products.js, links.js e catalogos.js.
 */
error_reporting(E_ALL);
ini_set('display_errors', '0');
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');

define('ADMIN_DIR', dirname(__FILE__));
define('ROOT', dirname(ADMIN_DIR));
define('DATA', ADMIN_DIR . '/_data');
define('SITE_JSON', DATA . '/site.json');
define('BACKUPS', DATA . '/backups');
define('IMG_PROD', ROOT . '/assets/img/produtos');
define('IMG_LINKS', ROOT . '/assets/img/links');
define('DOCS', ROOT . '/assets/docs');
define('MAX_BACKUPS', 40);

// ---------------------------------------------------------------- utilidades
function out($arr, $code = 200) {
    if ($code != 200) { http_response_code($code); }
    echo json_encode($arr);
    exit;
}

function fail($msg, $code = 400) {
    out(array('ok' => false, 'error' => $msg), $code);
}

function jflags() {
    $f = 0;
    if (defined('JSON_UNESCAPED_UNICODE')) { $f |= JSON_UNESCAPED_UNICODE; }
    if (defined('JSON_UNESCAPED_SLASHES')) { $f |= JSON_UNESCAPED_SLASHES; }
    return $f;
}

function jpretty() {
    $f = jflags();
    if (defined('JSON_PRETTY_PRINT')) { $f |= JSON_PRETTY_PRINT; }
    return $f;
}

function rnd($n) {
    if (function_exists('openssl_random_pseudo_bytes')) {
        return bin2hex(openssl_random_pseudo_bytes($n));
    }
    $s = '';
    for ($i = 0; $i < $n; $i++) { $s .= chr(mt_rand(0, 255)); }
    return bin2hex($s);
}

function same($a, $b) {
    if (function_exists('hash_equals')) { return hash_equals((string)$a, (string)$b); }
    return (string)$a === (string)$b;
}

function atomic_write($path, $content) {
    $tmp = $path . '.tmp' . rnd(4);
    if (file_put_contents($tmp, $content, LOCK_EX) === false) { return false; }
    if (!@rename($tmp, $path)) {
        @unlink($path);
        if (!@rename($tmp, $path)) { @unlink($tmp); return false; }
    }
    return true;
}

function ensure_dir($d) {
    if (!is_dir($d)) { @mkdir($d, 0755, true); }
    return is_dir($d) && is_writable($d);
}

function body() {
    $raw = file_get_contents('php://input');
    $d = json_decode($raw, true);
    return is_array($d) ? $d : array();
}

function val($arr, $k, $def = '') {
    return (is_array($arr) && isset($arr[$k])) ? $arr[$k] : $def;
}

function clean_str($s, $max) {
    if (!is_string($s)) { return ''; }
    $s = trim(preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F]/', '', $s));
    if (function_exists('mb_substr')) { return mb_substr($s, 0, $max, 'UTF-8'); }
    return substr($s, 0, $max);
}

function slugify($s) {
    $s = clean_str($s, 80);
    if (function_exists('iconv')) {
        $t = @iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $s);
        if ($t !== false) { $s = $t; }
    }
    $s = strtolower(preg_replace('/[^A-Za-z0-9]+/', '', $s));
    return $s === '' ? 'linha' . substr(rnd(3), 0, 4) : $s;
}

function safe_file($f) {
    return is_string($f) && preg_match('/^[A-Za-z0-9._-]{1,120}$/', $f) && strpos($f, '..') === false;
}

// ---------------------------------------------------------------- sessão
function start_session() {
    if (session_id() !== '') { return; }
    session_name('ftd_admin');
    $secure = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off');
    session_set_cookie_params(0, '/', '', $secure, true);
    @session_start();
}

function current_user() {
    start_session();
    return isset($_SESSION['user']) ? $_SESSION['user'] : null;
}

function require_login() {
    $u = current_user();
    if (!$u) { fail('Faça o login para continuar.', 401); }
    return $u;
}

function require_csrf() {
    $h = isset($_SERVER['HTTP_X_CSRF']) ? $_SERVER['HTTP_X_CSRF'] : '';
    if (empty($_SESSION['csrf']) || !same($_SESSION['csrf'], $h)) {
        fail('Sessão expirada. Entre de novo.', 403);
    }
}

// ---------------------------------------------------------------- usuários e senha
function load_users() {
    $f = DATA . '/users.json';
    if (!is_file($f)) { return array(); }
    $d = json_decode(file_get_contents($f), true);
    return is_array($d) ? $d : array();
}

function check_pass($pass, $hash) {
    if (!is_string($hash) || strlen($hash) < 20) { return false; }
    $c = crypt($pass, $hash);
    return is_string($c) && strlen($c) > 12 && same($c, $hash);
}

function attempts_file() { return DATA . '/attempts.json'; }

function too_many_attempts() {
    $f = attempts_file();
    $d = is_file($f) ? json_decode(file_get_contents($f), true) : array();
    if (!is_array($d)) { $d = array(); }
    $ip = isset($_SERVER['REMOTE_ADDR']) ? $_SERVER['REMOTE_ADDR'] : '?';
    $now = time();
    $list = array();
    if (isset($d[$ip])) {
        foreach ($d[$ip] as $t) { if ($now - $t < 900) { $list[] = $t; } }
    }
    return count($list) >= 8;
}

function note_attempt($ok) {
    $f = attempts_file();
    $d = is_file($f) ? json_decode(file_get_contents($f), true) : array();
    if (!is_array($d)) { $d = array(); }
    $ip = isset($_SERVER['REMOTE_ADDR']) ? $_SERVER['REMOTE_ADDR'] : '?';
    $now = time();
    $new = array();
    foreach ($d as $k => $list) {
        $keep = array();
        foreach ($list as $t) { if ($now - $t < 900) { $keep[] = $t; } }
        if ($keep) { $new[$k] = $keep; }
    }
    if ($ok) { unset($new[$ip]); } else { $new[$ip][] = $now; }
    atomic_write($f, json_encode($new));
}

// ---------------------------------------------------------------- dados do site
function seed_site() {
    $cats = array();
    $f = ROOT . '/assets/data/products.js';
    if (is_file($f)) {
        $t = file_get_contents($f);
        $t = preg_replace('/^\xEF\xBB\xBF/', '', $t);
        $i = strpos($t, '[');
        $j = strrpos($t, ']');
        if ($i !== false && $j !== false) {
            $d = json_decode(substr($t, $i, $j - $i + 1), true);
            if (is_array($d)) { $cats = $d; }
        }
    }
    $links = array(
        array('name' => 'Broco Rankin', 'url' => 'https://www.broco-rankin.com/', 'image' => 'site/links02.jpg'),
        array('name' => 'Cavi Blaster', 'url' => 'https://pt.caviblaster.com/', 'image' => 'site/links05.jpg'),
        array('name' => 'Kirby Morgan', 'url' => 'http://www.kirbymorgan.com/products/helmets', 'image' => 'site/links01.jpg'),
        array('name' => 'Tescom', 'url' => 'https://www.emerson.com/en-us/catalog/valves-actuators-regulators/regulators', 'image' => 'site/links04.jpg'),
        array('name' => 'Cygnus', 'url' => 'https://www.cygnus-instruments.com/us/', 'image' => 'site/links03.jpg')
    );
    $cat = array();
    if (is_file(ROOT . '/assets/docs/Catalogo FT 2021-WEB.pdf')) {
        $cat = array('title' => 'Catálogo FullTech 2021', 'year' => 2021, 'file' => 'Catalogo FT 2021-WEB.pdf', 'cover' => 'catalogoft.jpg');
    }
    return array('rev' => 1, 'categorias' => $cats, 'links' => $links, 'catalogo' => $cat);
}

function load_site() {
    if (!is_file(SITE_JSON)) {
        $s = seed_site();
        $s = sanitize_site($s, true);
        write_site($s, 'inicial', false);
        return $s;
    }
    $d = json_decode(file_get_contents(SITE_JSON), true);
    return is_array($d) ? $d : seed_site();
}

function clean_image_list($list, $dir) {
    $r = array();
    if (!is_array($list)) { return $r; }
    foreach ($list as $f) {
        if (safe_file($f) && is_file($dir . '/' . $f)) { $r[] = $f; }
        if (count($r) >= 12) { break; }
    }
    return $r;
}

function sanitize_site($in, $trustFiles) {
    $cats = array();
    $used = array();
    $src = val($in, 'categorias', array());
    if (!is_array($src)) { $src = array(); }
    foreach ($src as $c) {
        $title = clean_str(val($c, 'title'), 80);
        if ($title === '') { continue; }
        $slug = val($c, 'slug');
        if (!is_string($slug) || !preg_match('/^[a-z0-9]{1,60}$/', $slug)) { $slug = slugify($title); }
        $base = $slug; $n = 2;
        while (isset($used[$slug])) { $slug = $base . $n; $n++; }
        $used[$slug] = 1;
        $cover = val($c, 'cover');
        if (!safe_file($cover)) { $cover = ''; }
        $prods = array();
        $psrc = val($c, 'products', array());
        if (!is_array($psrc)) { $psrc = array(); }
        foreach ($psrc as $p) {
            $imgs = array();
            $pi = val($p, 'images', array());
            if (!is_array($pi) || !$pi) {
                $one = val($p, 'image');
                $pi = $one !== '' ? array($one) : array();
            }
            foreach ($pi as $f) {
                if (safe_file($f) && ($trustFiles || is_file(IMG_PROD . '/' . $f))) { $imgs[] = $f; }
                if (count($imgs) >= 12) { break; }
            }
            $name = clean_str(val($p, 'name'), 120);
            $det = array();
            $ds = val($p, 'details', array());
            if (is_array($ds)) {
                foreach ($ds as $line) {
                    $line = clean_str($line, 220);
                    if ($line !== '') { $det[] = $line; }
                    if (count($det) >= 60) { break; }
                }
            }
            if (!$imgs && $name === '' && !$det) { continue; }
            $prods[] = array('name' => $name, 'image' => $imgs ? $imgs[0] : '', 'images' => $imgs, 'details' => $det);
        }
        $cats[] = array('slug' => $slug, 'title' => $title, 'cover' => $cover, 'products' => $prods);
    }

    $links = array();
    $ls = val($in, 'links', array());
    if (is_array($ls)) {
        foreach ($ls as $l) {
            $name = clean_str(val($l, 'name'), 80);
            $url = clean_str(val($l, 'url'), 300);
            if ($name === '' || $url === '') { continue; }
            if (!preg_match('#^https?://#i', $url)) { $url = 'https://' . $url; }
            if (!preg_match('#^https?://[^\s<>"\']+$#i', $url)) { continue; }
            $img = val($l, 'image');
            $ok = false;
            if (is_string($img) && preg_match('#^(site|links)/[A-Za-z0-9._-]{1,120}$#', $img) && strpos($img, '..') === false) {
                $ok = $trustFiles || is_file(ROOT . '/assets/img/' . $img);
            }
            $links[] = array('name' => $name, 'url' => $url, 'image' => $ok ? $img : '');
            if (count($links) >= 40) { break; }
        }
    }

    $catalogo = array();
    $c = val($in, 'catalogo', array());
    if (is_array($c) && val($c, 'file') !== '') {
        $file = $c['file'];
        if (is_string($file) && preg_match('/^[A-Za-z0-9._ -]{1,140}$/', $file) && strpos($file, '..') === false && is_file(DOCS . '/' . $file)) {
            $cover = val($c, 'cover');
            if (!safe_file($cover)) { $cover = 'catalogoft.jpg'; }
            $size = filesize(DOCS . '/' . $file);
            $catalogo = array(
                'title' => clean_str(val($c, 'title', 'Catálogo FullTech'), 100),
                'year' => (int)val($c, 'year', date('Y')),
                'file' => $file,
                'size' => str_replace('.', ',', number_format($size / 1048576, 1)) . ' MB',
                'cover' => $cover
            );
        }
    }

    return array(
        'rev' => (int)val($in, 'rev', 1),
        'categorias' => $cats,
        'links' => $links,
        'catalogo' => $catalogo
    );
}

function js_header($what) {
    return "/* " . $what . " - gerado pelo painel. Não edite este arquivo à mão. */\n";
}

function write_public($s) {
    $dir = ROOT . '/assets/data';
    if (!ensure_dir($dir)) { return false; }
    $f = jflags();
    $ok = atomic_write($dir . '/products.js', js_header('Produtos') . 'window.CATEGORIAS = ' . json_encode($s['categorias'], $f | (defined('JSON_PRETTY_PRINT') ? JSON_PRETTY_PRINT : 0)) . ";\n");
    $ok = atomic_write($dir . '/links.js', js_header('Links') . 'window.LINKS = ' . json_encode($s['links'], $f) . ";\n") && $ok;
    $docs = $s['catalogo'] ? array($s['catalogo']) : array();
    $ok = atomic_write($dir . '/catalogos.js', js_header('Catálogo em PDF') . 'window.CATALOGOS = ' . json_encode($docs, $f) . ";\n") && $ok;
    return $ok;
}

function write_site($s, $by, $backup) {
    if (!ensure_dir(DATA)) { return false; }
    if ($backup && is_file(SITE_JSON) && ensure_dir(BACKUPS)) {
        @copy(SITE_JSON, BACKUPS . '/site-' . date('Ymd-His') . '-' . substr(rnd(2), 0, 3) . '.json');
        prune_backups();
    }
    $s['savedBy'] = $by;
    $s['savedAt'] = date('c');
    if (!atomic_write(SITE_JSON, json_encode($s, jpretty()))) { return false; }
    return write_public($s);
}

function prune_backups() {
    $list = glob(BACKUPS . '/site-*.json');
    if (!$list || count($list) <= MAX_BACKUPS) { return; }
    sort($list);
    $extra = count($list) - MAX_BACKUPS;
    for ($i = 0; $i < $extra; $i++) { @unlink($list[$i]); }
}

function collect_used($s) {
    $u = array();
    foreach ($s['categorias'] as $c) {
        foreach ($c['products'] as $p) { foreach ($p['images'] as $f) { $u['p/' . $f] = 1; } }
    }
    foreach ($s['links'] as $l) { if ($l['image'] !== '') { $u['l/' . basename($l['image'])] = 1; } }
    if ($s['catalogo']) { $u['d/' . $s['catalogo']['file']] = 1; }
    return $u;
}

// remove arquivos enviados pelo painel (prefixo u-) que não são mais usados e têm mais de 1 hora
function collect_garbage($s) {
    $used = collect_used($s);
    $sets = array(array('p/', IMG_PROD), array('l/', IMG_LINKS), array('d/', DOCS));
    foreach ($sets as $set) {
        $files = glob($set[1] . '/u-*');
        if (!$files) { continue; }
        foreach ($files as $f) {
            if (isset($used[$set[0] . basename($f)])) { continue; }
            if (time() - filemtime($f) > 3600) { @unlink($f); }
        }
    }
}

// ---------------------------------------------------------------- rotas
$action = isset($_GET['a']) ? $_GET['a'] : '';
$method = $_SERVER['REQUEST_METHOD'];

if ($action === 'me') {
    $u = current_user();
    if (!$u) { out(array('ok' => true, 'user' => null)); }
    if (empty($_SESSION['csrf'])) { $_SESSION['csrf'] = rnd(16); }
    out(array('ok' => true, 'user' => $u, 'csrf' => $_SESSION['csrf']));
}

if ($action === 'login') {
    if ($method !== 'POST') { fail('Método inválido.', 405); }
    ensure_dir(DATA);
    if (too_many_attempts()) { fail('Muitas tentativas. Espere 15 minutos e tente de novo.', 429); }
    $b = body();
    $user = strtolower(clean_str(val($b, 'user'), 40));
    $pass = is_string(val($b, 'pass')) ? $b['pass'] : '';
    $okUser = null;
    foreach (load_users() as $u) {
        if (isset($u['user']) && strtolower($u['user']) === $user && check_pass($pass, val($u, 'hash'))) { $okUser = $u['user']; break; }
    }
    if (!$okUser) {
        note_attempt(false);
        usleep(600000);
        fail('Usuário ou senha incorretos.', 401);
    }
    note_attempt(true);
    start_session();
    if (function_exists('session_regenerate_id')) { session_regenerate_id(true); }
    $_SESSION['user'] = $okUser;
    $_SESSION['csrf'] = rnd(16);
    out(array('ok' => true, 'user' => $okUser, 'csrf' => $_SESSION['csrf']));
}

if ($action === 'logout') {
    start_session();
    $_SESSION = array();
    @session_destroy();
    out(array('ok' => true));
}

$user = require_login();
if ($action === 'ping') {
    out(array('ok' => true, 'php' => PHP_VERSION, 'gd' => function_exists('imagecreatefromjpeg'),
        'upload_max' => ini_get('upload_max_filesize'), 'post_max' => ini_get('post_max_size'),
        'writable' => array(
            'data' => ensure_dir(DATA), 'assets_data' => is_writable(ROOT . '/assets/data'),
            'produtos' => ensure_dir(IMG_PROD), 'links' => ensure_dir(IMG_LINKS), 'docs' => ensure_dir(DOCS)
        )));
}




if ($action === 'data') {
    out(array('ok' => true, 'data' => load_site()));
}

if ($action === 'backups') {
    $r = array();
    $list = glob(BACKUPS . '/site-*.json');
    if ($list) {
        rsort($list);
        foreach ($list as $f) {
            $d = json_decode(file_get_contents($f), true);
            if (!is_array($d)) { continue; }
            $n = 0;
            foreach ($d['categorias'] as $c) { $n += count($c['products']); }
            $r[] = array('id' => basename($f, '.json'), 'at' => val($d, 'savedAt'), 'by' => val($d, 'savedBy'), 'products' => $n, 'links' => count($d['links']));
        }
    }
    out(array('ok' => true, 'backups' => $r));
}

if ($method !== 'POST') { fail('Método inválido.', 405); }
require_csrf();

if ($action === 'save') {
    $b = body();
    $cur = load_site();
    if ((int)val($b, 'rev', 0) !== (int)$cur['rev']) {
        fail('Outra pessoa alterou o site enquanto você editava. Recarregue a página e refaça a alteração.', 409);
    }
    $s = sanitize_site(val($b, 'data', array()), false);
    $s['rev'] = (int)$cur['rev'] + 1;
    if (!write_site($s, $user, true)) { fail('Não consegui gravar no servidor. Avise o suporte.', 500); }
    collect_garbage($s);
    out(array('ok' => true, 'data' => $s));
}

if ($action === 'upload') {
    $kind = isset($_POST['kind']) ? $_POST['kind'] : '';
    if (empty($_FILES['file']) || !is_uploaded_file($_FILES['file']['tmp_name'])) {
        $code = isset($_FILES['file']['error']) ? $_FILES['file']['error'] : 0;
        if ($code == UPLOAD_ERR_INI_SIZE || $code == UPLOAD_ERR_FORM_SIZE) { fail('Arquivo grande demais para o servidor.', 413); }
        fail('Nenhum arquivo recebido.');
    }
    $f = $_FILES['file'];
    if ($f['error'] !== UPLOAD_ERR_OK) { fail('Falha no envio (código ' . (int)$f['error'] . ').'); }
    if ($kind === 'product' || $kind === 'link') {
        $info = @getimagesize($f['tmp_name']);
        if (!$info || $info[2] !== IMAGETYPE_JPEG) { fail('Envie uma foto em JPG.'); }
        if ($f['size'] > 4 * 1048576) { fail('A foto passou de 4 MB.'); }
        $dir = $kind === 'product' ? IMG_PROD : IMG_LINKS;
        if (!ensure_dir($dir)) { fail('Pasta de fotos sem permissão de escrita.', 500); }
        $name = 'u-' . date('ymd') . '-' . rnd(5) . '.jpg';
        if (!move_uploaded_file($f['tmp_name'], $dir . '/' . $name)) { fail('Não consegui salvar a foto.', 500); }
        @chmod($dir . '/' . $name, 0644);
        out(array('ok' => true, 'file' => $kind === 'product' ? $name : 'links/' . $name));
    }
    if ($kind === 'pdf') {
        $h = @fopen($f['tmp_name'], 'rb');
        $magic = $h ? fread($h, 5) : '';
        if ($h) { fclose($h); }
        if ($magic !== '%PDF-') { fail('Envie um arquivo PDF.'); }
        if (!ensure_dir(DOCS)) { fail('Pasta de catálogos sem permissão de escrita.', 500); }
        $name = 'u-' . date('ymd') . '-' . rnd(4) . '.pdf';
        if (!move_uploaded_file($f['tmp_name'], DOCS . '/' . $name)) { fail('Não consegui salvar o PDF.', 500); }
        @chmod(DOCS . '/' . $name, 0644);
        out(array('ok' => true, 'file' => $name, 'size' => str_replace('.', ',', number_format($f['size'] / 1048576, 1)) . ' MB'));
    }
    fail('Tipo de envio inválido.');
}

if ($action === 'restore') {
    $b = body();
    $id = val($b, 'id');
    if (!is_string($id) || !preg_match('/^site-[0-9]{8}-[0-9]{6}-[a-z0-9]{3}$/', $id) || !is_file(BACKUPS . '/' . $id . '.json')) { fail('Versão não encontrada.', 404); }
    $d = json_decode(file_get_contents(BACKUPS . '/' . $id . '.json'), true);
    if (!is_array($d)) { fail('Versão danificada.', 500); }
    $cur = load_site();
    $s = sanitize_site($d, false);
    $s['rev'] = (int)$cur['rev'] + 1;
    if (!write_site($s, $user, true)) { fail('Não consegui gravar no servidor.', 500); }
    out(array('ok' => true, 'data' => $s));
}

fail('Ação desconhecida.', 404);
