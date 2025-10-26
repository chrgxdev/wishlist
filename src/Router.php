<?php
namespace App;

class Router
{
    private array $routes = [];

    public function add(string $method, string $path, callable $handler): void
    {
        $method = strtoupper($method);
        $this->routes[$method][] = [
            'path' => $path,
            'parts' => $this->splitPath($path),
            'handler' => $handler,
        ];
    }

    public function dispatch(string $method, string $uri): void
    {
        $method = strtoupper($method);
        $path = parse_url($uri, PHP_URL_PATH) ?? '/';
        $parts = $this->splitPath($path);
        $routes = $this->routes[$method] ?? [];
        $match = null;
        $params = [];
        foreach ($routes as $route) {
            $p = $this->match($route['parts'], $parts);
            if ($p !== null) {
                $match = $route['handler'];
                $params = $p;
                break;
            }
        }

        if (!$match) {
            http_response_code(404);
            header('Content-Type: application/json');
            echo json_encode(['error' => 'Not Found']);
            return;
        }

        // Expose params via $_GET for simplicity/compat with existing controllers
        foreach ($params as $k => $v) {
            $_GET[$k] = $v;
        }

        try {
            ($match)();
        } catch (\Throwable $e) {
            http_response_code(500);
            header('Content-Type: application/json');
            echo json_encode(['error' => 'Server Error', 'message' => $e->getMessage()]);
        }
    }

    private function splitPath(string $path): array
    {
        $path = trim($path);
        if ($path === '') return ['/'];
        $clean = '/' . ltrim($path, '/');
        return array_values(array_filter(explode('/', $clean), fn($s) => $s !== ''));
    }

    private function match(array $routeParts, array $reqParts): ?array
    {
        if (count($routeParts) !== count($reqParts)) return null;
        $params = [];
        foreach ($routeParts as $i => $rp) {
            $rq = $reqParts[$i] ?? '';
            if (strlen($rp) > 0 && $rp[0] === ':') {
                $params[substr($rp, 1)] = $rq;
                continue;
            }
            if ($rp !== $rq) return null;
        }
        return $params;
    }
}
