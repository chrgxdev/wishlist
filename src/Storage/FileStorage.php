<?php
namespace App\Storage;

class FileStorage
{
    private string $dataDir;
    private string $legacyMapFile;
    private string $groupsFile;

    public function __construct(string $baseDir)
    {
        $this->dataDir = rtrim($baseDir, DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR . 'data';
        $this->legacyMapFile = $this->dataDir . DIRECTORY_SEPARATOR . 'map.json';
        $this->groupsFile = $this->dataDir . DIRECTORY_SEPARATOR . 'groups.json';
        if (!is_dir($this->dataDir)) {
            @mkdir($this->dataDir, 0775, true);
        }
        // Initialize legacy map if missing
        if (!file_exists($this->legacyMapFile)) {
            $this->writeLegacyMap(['names' => [], 'map' => new \stdClass()]);
        }
        // Initialize groups registry if missing
        if (!file_exists($this->groupsFile)) {
            $this->writeGroups([['slug' => 'default', 'title' => 'Default']]);
        }
    }

    // ===== Groups registry =====
    public function getGroups(): array
    {
        $raw = (string)@file_get_contents($this->groupsFile);
        $data = json_decode($raw, true);
        if (!is_array($data) || !isset($data[0])) {
            $data = [];
        }
        // Normalize items and ensure default group exists
        $out = [];
        $hasDefault = false;
        foreach ($data as $g) {
            $slug = $this->slugify((string)($g['slug'] ?? ''));
            if ($slug === '') continue;
            $title = trim((string)($g['title'] ?? ''));
            $hidden = (bool)($g['hidden'] ?? false);
            if ($slug === 'default') $hasDefault = true;
            $out[] = ['slug' => $slug, 'title' => ($title !== '' ? $title : $slug), 'hidden' => $hidden];
        }
        if (!$hasDefault) {
            $out[] = ['slug' => 'default', 'title' => 'Default', 'hidden' => false];
            $this->writeGroups($out);
        }
        return $out;
    }

    public function getPublicGroups(): array
    {
        return array_values(array_filter($this->getGroups(), fn($g) => !($g['hidden'] ?? false)));
    }

    public function groupExists(string $slug): bool
    {
        $slug = $this->slugify($slug);
        foreach ($this->getGroups() as $g) {
            if (($g['slug'] ?? '') === $slug) return true;
        }
        return false;
    }

    public function setGroups(array $groups): void
    {
        // Normalize groups: ensure slug+title+hidden and unique slugs
        $out = [];
        $seen = [];
        $prev = $this->getGroups();
        $prevSlugs = array_map(fn($g) => $g['slug'], $prev);
        foreach ($groups as $g) {
            $slug = $this->slugify((string)($g['slug'] ?? ''));
            $title = trim((string)($g['title'] ?? ''));
            $hidden = (bool)($g['hidden'] ?? false);
            if ($slug === '') continue;
            if (isset($seen[$slug])) continue;
            // Handle rename if oldSlug provided and differs
            $oldSlug = $this->slugify((string)($g['oldSlug'] ?? $slug));
            if ($oldSlug !== $slug) {
                if ($oldSlug === 'default') {
                    // don't allow renaming default slug; keep as default
                    $oldSlug = 'default';
                    $slug = 'default';
                } else {
                    $this->migrateGroupDir($oldSlug, $slug);
                }
            }
            $seen[$slug] = true;
            $out[] = ['slug' => $slug, 'title' => ($title !== '' ? $title : $slug), 'hidden' => $hidden];
            // Ensure group dir exists (after possible migration)
            $this->ensureGroupDir($slug);
        }
        if (empty($out)) {
            $out = [['slug' => 'default', 'title' => 'Default', 'hidden' => false]];
        }
        $this->writeGroups($out);
    }

    // ===== Group names/content =====
    public function getGroupNames(string $group): array
    {
        if ($group === 'default') {
            $map = $this->readLegacyMap();
            return $map['names'] ?? [];
        }
        $map = $this->readGroupMap($group);
        return $map['names'] ?? [];
    }

    public function setGroupNames(string $group, array $names): void
    {
        $names = array_values(array_unique(array_filter(array_map(fn($n) => trim((string)$n), $names), fn($n) => $n !== '')));
        if ($group === 'default') {
            $map = $this->readLegacyMap();
            $map['names'] = $names;
            $currentMap = (array)($map['map'] ?? []);
            foreach ($names as $name) {
                if (!isset($currentMap[$name])) $currentMap[$name] = md5($name);
            }
            foreach (array_keys($currentMap) as $name) {
                if (!in_array($name, $names, true)) unset($currentMap[$name]);
            }
            $map['map'] = $currentMap;
            $this->writeLegacyMap($map);
            return;
        }
        $map = $this->readGroupMap($group);
        $map['names'] = $names;
        $currentMap = (array)($map['map'] ?? []);
        foreach ($names as $name) {
            if (!isset($currentMap[$name])) $currentMap[$name] = md5($group.'|'.$name);
        }
        foreach (array_keys($currentMap) as $name) {
            if (!in_array($name, $names, true)) unset($currentMap[$name]);
        }
        $map['map'] = $currentMap;
        $this->writeGroupMap($group, $map);
    }

    public function getGroupContent(string $group, string $name): string
    {
        $id = $this->getGroupId($group, $name);
        if ($id === null) return '';
        $file = $this->groupDir($group) . DIRECTORY_SEPARATOR . $id . '.dat';
        if (!file_exists($file)) return '';
        return (string)file_get_contents($file);
    }

    public function saveGroupContent(string $group, string $name, string $content): void
    {
        $id = $this->ensureGroupId($group, $name);
        $file = $this->groupDir($group) . DIRECTORY_SEPARATOR . $id . '.dat';
        file_put_contents($file, $content);
    }

    public function getGroupId(string $group, string $name): ?string
    {
        if ($group === 'default') return $this->getId($name);
        $map = $this->readGroupMap($group);
        $mapping = (array)($map['map'] ?? []);
        return $mapping[$name] ?? null;
    }

    public function ensureGroupId(string $group, string $name): string
    {
        if ($group === 'default') return $this->ensureId($name);
        $map = $this->readGroupMap($group);
        $mapping = (array)($map['map'] ?? []);
        if (!isset($mapping[$name])) {
            $mapping[$name] = md5($group.'|'.$name);
            $map['map'] = $mapping;
            if (!in_array($name, $map['names'] ?? [], true)) $map['names'][] = $name;
            $this->writeGroupMap($group, $map);
        }
        return $mapping[$name] ?? md5($group.'|'.$name);
    }

    // ===== Legacy global API (mapped to default group) =====
    public function getNames(): array { return $this->getGroupNames('default'); }
    public function setNames(array $names): void { $this->setGroupNames('default', $names); }
    public function getContent(string $name): string { return $this->getGroupContent('default', $name); }
    public function saveContent(string $name, string $content): void { $this->saveGroupContent('default', $name, $content); }
    public function getId(string $name): ?string { $map = $this->readLegacyMap(); $mapping = (array)($map['map'] ?? []); return $mapping[$name] ?? null; }
    public function ensureId(string $name): string {
        $map = $this->readLegacyMap();
        $mapping = (array)($map['map'] ?? []);
        if (!isset($mapping[$name])) {
            $mapping[$name] = md5($name);
            $map['map'] = $mapping;
            if (!in_array($name, $map['names'] ?? [], true)) { $map['names'][] = $name; }
            $this->writeLegacyMap($map);
        }
        return $mapping[$name] ?? md5($name);
    }

    // ===== Internals =====
    private function readLegacyMap(): array
    {
        $raw = (string)@file_get_contents($this->legacyMapFile);
        $data = json_decode($raw, true);
        if (!is_array($data)) { $data = ['names' => [], 'map' => []]; }
        $data['names'] = $data['names'] ?? [];
        $data['map'] = $data['map'] ?? [];
        return $data;
    }

    private function writeLegacyMap(array $map): void
    {
        file_put_contents($this->legacyMapFile, json_encode($map, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
    }

    private function readGroupMap(string $group): array
    {
        $this->ensureGroupDir($group);
        $file = $this->groupDir($group) . DIRECTORY_SEPARATOR . 'map.json';
        $raw = (string)@file_get_contents($file);
        $data = json_decode($raw, true);
        if (!is_array($data)) { $data = ['names' => [], 'map' => []]; }
        $data['names'] = $data['names'] ?? [];
        $data['map'] = $data['map'] ?? [];
        return $data;
    }

    private function writeGroupMap(string $group, array $map): void
    {
        $this->ensureGroupDir($group);
        $file = $this->groupDir($group) . DIRECTORY_SEPARATOR . 'map.json';
        file_put_contents($file, json_encode($map, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
    }

    private function groupDir(string $group): string
    {
        if ($group === 'default') return $this->dataDir; // legacy files sit here
        return $this->dataDir . DIRECTORY_SEPARATOR . 'groups' . DIRECTORY_SEPARATOR . $group;
    }

    private function ensureGroupDir(string $group): void
    {
        $dir = $this->groupDir($group);
        if (!is_dir($dir)) @mkdir($dir, 0775, true);
    }

    private function writeGroups(array $groups): void
    {
        file_put_contents($this->groupsFile, json_encode($groups, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
    }

    private function migrateGroupDir(string $oldSlug, string $newSlug): void
    {
        if ($oldSlug === $newSlug) return;
        $oldDir = $this->groupDir($oldSlug);
        $newDir = $this->groupDir($newSlug);
        if (is_dir($oldDir)) {
            if (!is_dir(dirname($newDir))) @mkdir(dirname($newDir), 0775, true);
            @rename($oldDir, $newDir);
        }
    }

    private function slugify(string $slug): string
    {
        $slug = strtolower(trim($slug));
        $slug = preg_replace('/[^a-z0-9\-]+/', '-', $slug) ?? '';
        $slug = trim($slug, '-');
        return $slug;
    }
}
