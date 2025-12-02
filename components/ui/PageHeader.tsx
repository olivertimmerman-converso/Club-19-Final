/**
 * Club 19 Sales OS - Page Header Component
 *
 * Standardized header for all staff pages
 */

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
          <div className="mt-1 border-b-2 border-[#F3DFA2] w-full"></div>
          {subtitle && <p className="mt-2 text-gray-600">{subtitle}</p>}
        </div>
        {actions && <div className="flex items-center gap-3">{actions}</div>}
      </div>
    </div>
  );
}
