import { FilePlus2 } from 'lucide-react';

type Props = {
  message: string;
  details?: string;
}

export default function EmptyState({ message, details }: Props) {
  return (
    <div className="text-center p-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
      <FilePlus2 className="mx-auto h-12 w-12 text-gray-400" />
      <h3 className="mt-2 text-sm font-semibold text-gray-900">{message}</h3>
      {details && <p className="mt-1 text-sm text-gray-500">{details}</p>}
    </div>
  );
}