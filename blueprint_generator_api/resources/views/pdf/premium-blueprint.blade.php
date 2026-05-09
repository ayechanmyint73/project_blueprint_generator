<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">

<style>
    @page {
        margin: 80px 50px 60px 50px;
        @bottom-right {
            content: "Page " counter(page) " of " counter(pages);
            font-size: 9px;
            color: #64748b;
        }
    }

    :root {
        --brand: #2563eb;    /* Professional Blue */
        --slate: #0f172a;    /* Deep Navy Header */
        --text: #334155;     /* Slate Gray Text */
        --muted: #64748b;
        --border: #e2e8f0;
        --bg-soft: #f8fafc;
    }

    body {
        margin: 0;
        font-family: 'Helvetica', 'Arial', sans-serif; /* Cleaner than DejaVu */
        font-size: 11px; /* Slightly smaller is more professional */
        color: var(--text);
        line-height: 1.6;
    }

    /* Cover Page Improvements */
    .cover {
        margin: -80px -50px 40px -50px;
        background: var(--bg-soft);
        padding: 60px 50px;
        border-bottom: 4px solid var(--brand);
    }

    .cover-title {
        font-size: 32px;
        font-weight: 800;
        color: var(--slate);
        margin: 0;
        letter-spacing: -0.02em;
    }

    .cover-project {
        font-size: 18px;
        color: var(--brand);
        font-weight: 600;
        margin-top: 5px;
    }

    /* Technical Info Grid */
    .meta-grid {
        width: 100%;
        margin-top: 30px;
        border-top: 1px solid var(--border);
        padding-top: 20px;
    }

    .meta-item {
        font-size: 10px;
        color: var(--muted);
        text-transform: uppercase;
        letter-spacing: 0.05em;
    }

    /* Section Styling */
    .section {
        margin-top: 25px;
        page-break-inside: avoid; /* Prevents splitting titles from content */
    }

    .section-title {
        font-size: 13px;
        font-weight: 700;
        color: var(--slate);
        text-transform: uppercase;
        letter-spacing: 0.02em;
        margin-bottom: 10px;
        display: flex;
        align-items: center;
    }

    /* The "Blueprint" Rule: Thin and precise */
    .section-rule {
        height: 1px;
        background: var(--brand);
        width: 40px;
        margin-bottom: 8px;
    }

    /* Content Styling */
    p { margin: 0 0 10px 0; }

    .bullets, ol {
        margin: 0 0 15px 0;
        padding-left: 20px;
    }

    li { margin-bottom: 6px; }

    /* The technical "Box" for generated plans */
    .data-block {
        background: var(--bg-soft);
        border: 1px solid var(--border);
        padding: 15px;
        border-radius: 4px;
    }

    footer {
        position: fixed;
        bottom: -40px;
        left: 0;
        right: 0;
        border-top: 1px solid var(--border);
        padding-top: 10px;
        font-size: 9px;
        color: var(--muted);
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
    <div class="cover-title">PROJECT SPECIFICATION</div>
    <div class="cover-project">{{ $project->project_name ?? 'Untitled Project' }}</div>

    <table class="meta-grid">
        <tr>
            <td class="meta-item">Document ID: <strong>BP-{{ date('Ymd') }}-{{ $project->id }}</strong></td>
            <td class="meta-item" style="text-align: right;">Generated: <strong>{{ now()->format('F d, Y') }}</strong></td>
        </tr>
    </table>
</div>

<div class="page-break"></div>

<!-- Content -->
<div class="page">
    @foreach ($sections as $section)
        <div class="section">
            <div class="section-rule"></div>
            <div class="section-title">{{ $section['title'] }}</div>

            <div class="data-block"> <!-- Wraps AI content in a professional 'vessel' -->
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
        </div>
    @endforeach
</div>

<footer>
    <table style="width: 100%">
        <tr>
            <td>Architectural Blueprint Generator | Confidential</td>
            <td style="text-align: right;">v1.0.4</td>
        </tr>
    </table>
</footer>

</body>
</html>
