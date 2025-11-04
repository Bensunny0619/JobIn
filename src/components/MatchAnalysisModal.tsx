import { Dialog } from '@headlessui/react';

type Analysis = {
  matchScore: number;
  summary: string;
  suggestions: string[];
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  analysis: Analysis | null;
  jobPosition: string;
};

export default function MatchAnalysisModal({ isOpen, onClose, analysis, jobPosition }: Props) {
  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/40" aria-hidden="true" />
      <div className="fixed inset-0 flex w-screen items-center justify-center p-4">
        <Dialog.Panel className="w-full max-w-lg rounded-xl bg-white p-6 space-y-4">
          <Dialog.Title className="text-xl font-semibold">AI Match Analysis for <span className="text-blue-600">{jobPosition}</span></Dialog.Title>
          
          {!analysis ? (
            <p className="text-center animate-pulse">Analyzing...</p>
          ) : (
            <>
              <div className="text-center">
                <p className="text-gray-600">Match Score</p>
                <p className="text-6xl font-bold text-blue-600">{analysis.matchScore}%</p>
              </div>

              <div>
                <h3 className="font-semibold mb-1">Summary</h3>
                <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-md">{analysis.summary}</p>
              </div>

              <div>
                <h3 className="font-semibold mb-1">Suggestions for Improvement</h3>
                <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
                  {analysis.suggestions.map((suggestion, index) => (
                    <li key={index}>{suggestion}</li>
                  ))}
                </ul>
              </div>
            </>
          )}

          <div className="text-right">
            <button onClick={onClose} className="bg-gray-200 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-300">Close</button>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}