<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">

<style>
    @page {
        /* Keep top/bottom the same, reduce left/right */
        margin: 64px 18px 44px 18px;

        @bottom-right {
            content: "Page " counter(page) " / " counter(pages);
            font-size: 10px;
            color: #6b7280;
            padding-right: 0;
        }
    }

    :root {
        --accent: #6366f1;
        --text: #1f2937;
        --muted: #6b7280;
        --paper: #ffffff;
    }

    body {
        margin: 0;
        font-family: DejaVu Sans, sans-serif;
        font-size: 12px;
        color: var(--text);
        line-height: 1.7;
        background: var(--paper);
    }

    /* Header */
    header {
        position: fixed;
        top: -52px;
        left: 0;
        right: 0;
        height: 60px;
        border-bottom: 1px solid #ddd;
    }

    .header-table {
        width: 100%;
    }

    .header-logo {
        width: 90px;
    }

    .header-title {
        text-align: right;
        font-size: 16px;
        font-weight: bold;
        color: var(--accent);
    }

    /* Footer */
    footer {
        position: fixed;
        bottom: -48px;
        left: 0;
        right: 0;
        height: 45px;
        border-top: 1px solid #e5e7eb;
        font-size: 10px;
        color: var(--muted);
        padding-top: 8px;
        line-height: 1.5;
    }

    .footer-left {
        float: left;
    }

    .footer-right {
        float: right;
        text-align: right;
    }

    /* Main content */
    .page {
        padding: 0;
        text-align: left;
    }

    .cover {
        margin: -95px -45px 0 -45px;
    }

    .cover-banner {
        background: var(--accent);
        color: #fff;
        padding: 30px;
    }

    .cover-title {
        font-size: 38px;
        font-weight: 800;
        margin: 0 0 10px 0;
    }

    .cover-project {
        font-size: 16px;
        margin: 0;
    }

    .cover-meta {
        padding: 14px 40px 0;
        color: var(--muted);
        font-size: 11px;
    }

    .section {
        margin-top: 12px;
        page-break-inside: auto;
    }

    .section-rule {
        height: 2px;
        background: var(--accent);
        margin-bottom: 8px;
    }

    .section-title {
        font-size: 14px;
        font-weight: bold;
        margin-bottom: 8px;
        text-align: left;
    }

    p {
        margin: 0 0 6px 0;
    }

    .bullets {
        margin: 0;
        padding-left: 14px;
    }

    .bullets li {
        margin-bottom: 4px;
    }

    .bullets li::marker {
        color: var(--accent);
    }

    /* Proper Numbered Lists for AI Output */
    ol {
        margin: 0 0 6px 0;
        padding-left: 18px;
    }

    ol li {
        margin-bottom: 4px;
        padding-left: 4px;
        line-height: 1.7;
    }

    ol li::marker {
        color: var(--accent);
        font-weight: 500;
    }

    .page-break {
        page-break-after: always;
    }
</style>
</head>

<body>

@php
    $content = (string) ($blueprint->content ?? '');
    $lines = preg_split("/\r\n|\r|\n/", $content);

    $sections = [];
    $currentTitle = null;
    $currentLines = [];

    $flush = function () use (&$sections, &$currentTitle, &$currentLines) {
        if (!$currentTitle) return;
        $sections[] = [
            'title' => $currentTitle,
            'lines' => $currentLines,
        ];
    };

    foreach ($lines as $line) {
        $raw = (string) $line;
        $trim = trim($raw);

        // Markdown header: ## Title
        if (preg_match('/^#{1,3}\s+(.+)$/', $trim, $m)) {
            $flush();
            $currentTitle = trim($m[1]);
            $currentLines = [];
            continue;
        }

        // Numbered header: "1. Title"
        if (preg_match('/^(\d+)[.)]\s+(.+)$/', $trim, $m)) {
            $maybeTitle = trim($m[2]);
            $looksLikeHeader = strlen($maybeTitle) <= 64
                && stripos($maybeTitle, 'the system') !== 0
                && strpos($maybeTitle, ':') === false;

            if ($looksLikeHeader) {
                $flush();
                $currentTitle = $maybeTitle;
                $currentLines = [];
                continue;
            }
        }

        if ($currentTitle === null && $trim !== '') {
            $currentTitle = 'Overview';
        }

        $currentLines[] = $raw;
    }
    $flush();

    $renderBlocks = function (array $lines) {
        $out = [];
        $i = 0;
        $n = count($lines);

        $isBullet = function ($s) {
            $t = ltrim((string) $s);
            return str_starts_with($t, '- ') || str_starts_with($t, '* ') || str_starts_with($t, '• ');
        };

        $isNumberedLine = function ($s) {
            $t = ltrim((string) $s);
            return preg_match('/^\d+[.)]\s/', $t) === 1;
        };

        while ($i < $n) {
            $line = (string) $lines[$i];
            $trim = trim($line);
            if ($trim === '') { $i++; continue; }

            if ($isBullet($line)) {
                $items = [];
                while ($i < $n && $isBullet($lines[$i])) {
                    $t = ltrim((string) $lines[$i]);
                    $items[] = trim(mb_substr($t, 2));
                    $i++;
                }
                $out[] = ['type' => 'ul', 'items' => $items];
                continue;
            }

            // Proper numbered list handling - line by line alignment
            if ($isNumberedLine($line)) {
                $items = [];
                while ($i < $n && $isNumberedLine($lines[$i])) {
                    $t = (string) $lines[$i];
                    // Preserve indentation and line spacing exactly
                    $clean = preg_replace('/^\s*\d+[.)]\s/', '', $t);
                    $items[] = rtrim($clean);
                    $i++;
                }
                $out[] = ['type' => 'ol', 'items' => $items];
                continue;
            }

            $paras = [];
            while ($i < $n) {
                $l = (string) $lines[$i];
                $t = trim($l);
                if ($t === '' || $isBullet($l)) break;
                $paras[] = $t;
                $i++;
            }
            $out[] = ['type' => 'p', 'text' => implode(' ', $paras)];
        }

        return $out;
    };
@endphp

<!-- Cover -->
<div class="cover">
    <div class="cover-banner">
        <div class="cover-title">Project Blueprint Report</div>
        <p class="cover-project">{{ $project->project_name ?? 'Project' }}</p>
    </div>
    <div class="cover-meta">Generated on {{ now()->format('F d, Y') }}</div>
</div>

<div class="page-break"></div>

<!-- Content -->
<div class="page">
    @foreach ($sections as $section)
        <div class="section">
            <div class="section-rule"></div>
            <div class="section-title">{{ $section['title'] }}</div>

            @php $blocks = $renderBlocks($section['lines']); @endphp

            @foreach ($blocks as $b)
                @if ($b['type'] === 'p')
                    <p>{{ $b['text'] }}</p>
                @elseif ($b['type'] === 'ul')
                    <ul class="bullets">
                        @foreach ($b['items'] as $it)
                            <li>{{ $it }}</li>
                        @endforeach
                    </ul>
                @elseif ($b['type'] === 'ol')
                    <ol>
                        @foreach ($b['items'] as $it)
                            <li>{{ $it }}</li>
                        @endforeach
                    </ol>
                @endif
            @endforeach
        </div>
    @endforeach
</div>

<footer>
    <div class="footer-left">
        Project Blueprint Generator
    </div>
    <div class="footer-right">
        Generated: {{ now()->format('d M Y') }}
    </div>
</footer>

</body>
</html>
