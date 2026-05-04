<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Project;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;

class PdfController extends Controller
{
    public function export(Request $request, $id)
    {
        $project = Project::where('user_id', $request->user()->id)
                ->findOrFail($id);

        $blueprint = $project->blueprint;

        if (!$blueprint) {
            return response()->json([
                'message' => 'Blueprint not found for this project'
            ], 404);
        }

        $pdf = Pdf::loadView('pdf.premium-blueprint', compact('project','blueprint'))
          ->setPaper('a4', 'portrait');

        $safeName = preg_replace('/[^a-zA-Z0-9_\- ]+/', '', (string) ($project->project_name ?? 'Blueprint'));
        $safeName = trim((string) $safeName);
        if ($safeName === '') $safeName = 'Blueprint';
        $filename = $safeName . '_Project_DNA.pdf';

        return $pdf->download($filename);
    }
}
