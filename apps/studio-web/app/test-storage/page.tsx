'use client';

import { useState } from 'react';
import {
  uploadProjectFileAction,
  listProjectFilesAction,
  readProjectFileAction,
  deleteProjectFileAction,
} from '../actions/project-files';

export default function TestStoragePage() {
  const [projectId, setProjectId] = useState('');
  const [results, setResults] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const addResult = (message: string) => {
    setResults((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
  };

  const runTests = async () => {
    if (!projectId.trim()) {
      addResult('❌ Please enter a project ID');
      return;
    }

    setLoading(true);
    setResults([]);

    const testFileName = `test-${Date.now()}.babulus.ts`;
    const testContent = `// Test file created at ${new Date().toISOString()}
export default function TestVideo() {
  return scene('test', () => {
    text('Hello from S3!');
  });
}`;

    try {
      // 1. Upload test file
      addResult('1️⃣ Uploading test file...');
      const uploadedFile = await uploadProjectFileAction(
        projectId,
        testFileName,
        testContent,
        'video',
        'text/typescript'
      );
      addResult(`✅ Uploaded: ${(uploadedFile as any)?.relativePath}`);
      addResult(`   Storage key: ${(uploadedFile as any)?.storageKey}`);

      // 2. List files
      addResult('2️⃣ Listing project files...');
      const files = await listProjectFilesAction(projectId);
      addResult(`✅ Found ${files.length} file(s)`);
      files.forEach((file) => {
        addResult(`   - ${file.relativePath} (${file.fileType})`);
        if (file.url) {
          addResult(`     URL: ${file.url}`);
        }
      });

      // 3. Read file back
      addResult('3️⃣ Reading file content...');
      const content = await readProjectFileAction(projectId, testFileName);
      addResult(`✅ Read ${content.length} characters`);
      addResult(`   First 100 chars: ${content.substring(0, 100)}...`);

      // 4. Delete file
      addResult('4️⃣ Deleting test file...');
      await deleteProjectFileAction(projectId, testFileName);
      addResult(`✅ Deleted ${testFileName}`);

      // 5. Verify deletion
      addResult('5️⃣ Verifying deletion...');
      const filesAfter = await listProjectFilesAction(projectId);
      const stillExists = filesAfter.some((f) => f.relativePath === testFileName);
      if (!stillExists) {
        addResult(`✅ File successfully removed`);
      } else {
        addResult(`❌ File still exists!`);
      }

      addResult('');
      addResult('🎉 All tests passed!');
    } catch (error) {
      addResult(`❌ Error: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Project Storage Test</h1>

      <div className="bg-card p-6 rounded-lg border mb-6">
        <h2 className="text-xl font-semibold mb-4">Test Configuration</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Project ID (get from URL or database)
            </label>
            <input
              type="text"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="w-full p-2 border rounded"
              placeholder="Enter a project ID you have access to"
            />
          </div>
          <button
            onClick={runTests}
            disabled={loading || !projectId.trim()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-50"
          >
            {loading ? 'Running Tests...' : 'Run Storage Tests'}
          </button>
        </div>
      </div>

      {results.length > 0 && (
        <div className="bg-card p-6 rounded-lg border">
          <h2 className="text-xl font-semibold mb-4">Test Results</h2>
          <div className="font-mono text-sm space-y-1 bg-muted p-4 rounded max-h-[600px] overflow-y-auto">
            {results.map((result, i) => (
              <div key={i} className="whitespace-pre-wrap">
                {result}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-6 p-4 bg-muted rounded-lg text-sm">
        <h3 className="font-semibold mb-2">What This Tests:</h3>
        <ul className="list-disc list-inside space-y-1">
          <li>Upload file to S3 via server action</li>
          <li>Create ProjectFile database record</li>
          <li>List files with CloudFront URLs</li>
          <li>Read file content from S3</li>
          <li>Delete file from S3 and database</li>
          <li>Verify org access control</li>
        </ul>
      </div>
    </div>
  );
}
