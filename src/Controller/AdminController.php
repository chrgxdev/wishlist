<?php
namespace App\Controller;

use App\Storage\FileStorage;

class AdminController
{
    public function __construct(private FileStorage $storage) {}

    // Legacy endpoints for default group
    public function getNames(): void
    {
        $this->json(['names' => $this->storage->getNames()]);
    }

    public function setNames(): void
    {
        $data = $this->jsonBody();
        $names = $data['names'] ?? null;
        if (!is_array($names)) {
            $this->badRequest('Invalid names payload');
            return;
        }
        $this->storage->setNames($names);
        $this->json(['status' => 'ok', 'names' => $this->storage->getNames()]);
    }

    // Group management
    public function getGroups(): void
    {
        $this->json(['groups' => $this->storage->getGroups()]);
    }

    public function setGroups(): void
    {
        $data = $this->jsonBody();
        $groups = $data['groups'] ?? null;
        if (!is_array($groups)) {
            $this->badRequest('Invalid groups payload');
            return;
        }
        $this->storage->setGroups($groups);
        $this->json(['status' => 'ok', 'groups' => $this->storage->getGroups()]);
    }

    public function getGroupNames(): void
    {
        $group = isset($_GET['group']) ? (string)$_GET['group'] : 'default';
        if (!$this->storage->groupExists($group)) {
            $this->notFound('Unknown group');
            return;
        }
        $this->json(['group' => $group, 'names' => $this->storage->getGroupNames($group)]);
    }

    public function setGroupNames(): void
    {
        $group = isset($_GET['group']) ? (string)$_GET['group'] : 'default';
        if (!$this->storage->groupExists($group)) {
            $this->notFound('Unknown group');
            return;
        }
        $data = $this->jsonBody();
        $names = $data['names'] ?? null;
        if (!is_array($names)) {
            $this->badRequest('Invalid names payload');
            return;
        }
        $this->storage->setGroupNames($group, $names);
        $this->json(['status' => 'ok', 'group' => $group, 'names' => $this->storage->getGroupNames($group)]);
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

    private function jsonBody(): array
    {
        $raw = file_get_contents('php://input');
        $data = json_decode($raw, true);
        return is_array($data) ? $data : [];
    }
}
