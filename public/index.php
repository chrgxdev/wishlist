<?php
declare(strict_types=1);

use App\Router;
use App\Storage\FileStorage;
use App\Controller\ContentController;
use App\Controller\AdminController;

//$composer = __DIR__ . '/../vendor/autoload.php';
//if (file_exists($composer)) {
//    require $composer;
//} else {
    // Minimal PSR-4 autoload fallback for App\ namespace
    spl_autoload_register(function($class){
        $prefix = 'App\\';
        if (str_starts_with($class, $prefix)) {
            $rel = substr($class, strlen($prefix));
            $path = __DIR__ . '/../src/' . str_replace('\\', '/', $rel) . '.php';
            if (file_exists($path)) require $path;
        }
    });
//}

// Basic CORS for development
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$baseDir = dirname(__DIR__);
$storage = new FileStorage($baseDir);

$router = new Router();
$content = new ContentController($storage);
$admin = new AdminController($storage);

// API routes (legacy global)
$router->add('GET', '/api/names', fn() => $content->listNames());
$router->add('GET', '/api/content', fn() => $content->getContent());
$router->add('POST', '/api/content', fn() => $content->saveContent());
$router->add('GET', '/api/admin/names', fn() => $admin->getNames());
$router->add('POST', '/api/admin/names', fn() => $admin->setNames());

// API routes (groups)
$router->add('GET', '/api/groups', fn() => $content->listGroups());
$router->add('GET', '/api/:group/names', fn() => $content->listGroupNames());
$router->add('GET', '/api/:group/content', fn() => $content->getGroupContent());
$router->add('POST', '/api/:group/content', fn() => $content->saveGroupContent());

$router->add('GET', '/api/admin/groups', fn() => $admin->getGroups());
$router->add('POST', '/api/admin/groups', fn() => $admin->setGroups());
$router->add('GET', '/api/admin/:group/names', fn() => $admin->getGroupNames());
$router->add('POST', '/api/admin/:group/names', fn() => $admin->setGroupNames());

// Fallback for serving static files in public/ (when using PHP built-in server)
if (php_sapi_name() === 'cli-server') {
    $path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH) ?: '/';
    $file = __DIR__ . $path;
    if ($path !== '/' && file_exists($file) && !is_dir($file)) {
        return false; // let built-in server serve the static file
    }
}

// If request is to API, dispatch. Otherwise serve index.html
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH) ?: '/';
if (str_starts_with($path, '/api/')) {
    $router->dispatch($_SERVER['REQUEST_METHOD'] ?? 'GET', $_SERVER['REQUEST_URI'] ?? '/');
    return;
}

echo "Not found";