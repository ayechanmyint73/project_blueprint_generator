<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">

<style>
/* PAGE SETTINGS */
@page {
    margin: 110px 45px 80px 45px;
}

/* GLOBAL */
body {
    font-family: DejaVu Sans, sans-serif;
    font-size: 12px;
    color: #222;
    line-height: 1.6;
    margin: 0;
    padding: 0;
}

/* HEADER */
header {
    position: fixed;
    top: -90px;
    left: 0;
    right: 0;
    height: 70px;
    border-bottom: 2px solid #6366f1;
}

.header-table {
    width: 100%;
    border-collapse: collapse;
}

.header-table td {
    vertical-align: middle;
}

.logo {
    width: 60px;
}

.header-title {
    text-align: right;
    font-size: 18px;
    font-weight: bold;
    color: #6366f1;
}

/* FOOTER */
footer {
    position: fixed;
    bottom: -60px;
    left: 0;
    right: 0;
    height: 45px;
    border-top: 1px solid #d1d5db;
    font-size: 10px;
    color: #666;
    padding-top: 8px;
}

.footer-left {
    float: left;
}

.footer-right {
    float: right;
}

/* COVER PAGE */
.cover-page {
    text-align: center;
    margin-top: 170px;
}

.cover-logo {
    width: 100px;
    margin-bottom: 25px;
}

.cover-title {
    font-size: 28px;
    color: #6366f1;
    font-weight: bold;
    margin-bottom: 15px;
}

.cover-subtitle {
    font-size: 16px;
    color: #555;
    margin-bottom: 60px;
}

.meta {
    font-size: 13px;
    color: #444;
    line-height: 1.8;
}

/* PAGE BREAK */
.page-break {
    page-break-after: always;
}

/* CONTENT */
h1 {
    color: #6366f1;
    border-bottom: 2px solid #6366f1;
    padding-bottom: 8px;
    margin-bottom: 25px;
    font-size: 22px;
}

h2 {
    color: #6366f1;
    margin-top: 25px;
    margin-bottom: 8px;
    font-size: 16px;
}

.section {
    margin-bottom: 22px;
}

.content-box {
    background: #f8fafc;
    border-left: 4px solid #6366f1;
    padding: 14px;
    margin-top: 8px;
    border-radius: 3px;
}

.small {
    font-size: 11px;
}

p {
    margin: 0 0 10px 0;
}
</style>
</head>

<body>

<!-- HEADER -->
<header>
    <table class="header-table">
        <tr>
            <td width="20%">
                <img src="{{ public_path('logo.png') }}" class="logo">
            </td>
            <td width="80%" class="header-title">
                AI Project Blueprint Generator
            </td>
        </tr>
    </table>
</header>

<!-- FOOTER -->
<footer>
    <div class="footer-left">
        Generated Report
    </div>

    <div class="footer-right">
        Page {PAGE_NUM} of {PAGE_COUNT}
    </div>
</footer>

<!-- COVER PAGE -->
<div class="cover-page">

    <img src="{{ public_path('logo.png') }}" class="cover-logo">

    <div class="cover-title">
        {{ $project->title }}
    </div>

    <div class="cover-subtitle">
        Software Project Blueprint Report
    </div>

    <div class="meta">
        Generated on {{ now()->format('F d, Y') }}<br>
        Prepared by AI Blueprint Generator
    </div>

</div>

<div class="page-break"></div>

<!-- MAIN CONTENT -->
<h1>Project Blueprint</h1>

<div class="section">
    <h2>Executive Summary</h2>
    <div class="content-box">
        This document contains the AI-generated software project blueprint for the proposed system.
    </div>
</div>

<div class="section">
    <h2>Generated Blueprint Content</h2>
    <div class="content-box">
        {!! nl2br(e($blueprint->content)) !!}
    </div>
</div>

<div class="section">
    <h2>Notes</h2>
    <div class="content-box small">
        This report was automatically generated based on user project inputs and AI analysis.
    </div>
</div>

</body>
</html>
