<?php
namespace App\Controller;

use App\Storage\FileStorage;

class ContentController
{
    public function __construct(private FileStorage $storage) {}

    // Legacy global endpoints
    public function listNames(): void
    {
        $this->json(['names' => $this->storage->getNames()]);
    }

    public function getContent(): void
    {
        $name = $this->param('name');
        if ($name === null || $name === '') {
            $this->badRequest('Missing name');
            return;
        }
        $content = $this->storage->getContent($name);
        $this->json(['name' => $name, 'content' => $content]);
    }

    public function saveContent(): void
    {
        $data = $this->jsonBody();
        $name = $data['name'] ?? null;
        $content = $data['content'] ?? '';
        if (!$name) {
            $this->badRequest('Missing name');
            return;
        }
        $this->storage->saveContent($name, (string)$content);
        $this->json(['status' => 'ok']);
    }

    // Group-aware endpoints
    public function listGroups(): void
    {
        // Only expose public (non-hidden) groups to the frontend index
        if (method_exists($this->storage, 'getPublicGroups')) {
            $this->json(['groups' => $this->storage->getPublicGroups()]);
            return;
        }
        $this->json(['groups' => $this->storage->getGroups()]);
    }

    public function listGroupNames(): void
    {
        $group = $this->param('group') ?: 'default';
        if (!$this->storage->groupExists($group)) {
            $this->notFound('Unknown group');
            return;
        }
        $this->json(['group' => $group, 'names' => $this->storage->getGroupNames($group)]);
    }

    public function getGroupContent(): void
    {
        $group = $this->param('group') ?: 'default';
        if (!$this->storage->groupExists($group)) {
            $this->notFound('Unknown group');
            return;
        }
        $name = $this->param('name');
        if ($name === null || $name === '') {
            $this->badRequest('Missing name');
            return;
        }
        $content = $this->storage->getGroupContent($group, $name);
        $this->json(['group' => $group, 'name' => $name, 'content' => $content]);
    }

    public function saveGroupContent(): void
    {
        $group = $this->param('group') ?: 'default';
        if (!$this->storage->groupExists($group)) {
            $this->notFound('Unknown group');
            return;
        }
        $data = $this->jsonBody();
        $name = $data['name'] ?? null;
        $content = $data['content'] ?? '';
        if (!$name) {
            $this->badRequest('Missing name');
            return;
        }
        $this->storage->saveGroupContent($group, $name, (string)$content);
        $this->json(['status' => 'ok']);
    }

    private function json(array $data, int $code = 200): void
    {
        http_response_code($code);
        header('Content-Type: application/json');
        echo json_encode($data);
    }

    private function badRequest(string $msg): void
    {
        $this->json(['error' => $msg], 400);
    }

    private function notFound(string $msg): void
    {
        $this->json(['error' => $msg], 404);
    }

    private function param(string $key): ?string
    {
        return isset($_GET[$key]) ? trim((string)$_GET[$key]) : null;
    }

    private function jsonBody(): array
    {
        $raw = file_get_contents('php://input');
        $data = json_decode($raw, true);
        return is_array($data) ? $data : [];
    }
}
