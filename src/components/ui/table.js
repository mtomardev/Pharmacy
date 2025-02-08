const Table = ({ children, className }) => <table className={`w-full border ${className}`}>{children}</table>;
const TableHead = ({ children }) => <thead className="bg-gray-200">{children}</thead>;
const TableRow = ({ children }) => <tr className="border">{children}</tr>;
const TableCell = ({ children }) => <td className="p-2 border">{children}</td>;
const TableBody = ({ children }) => <tbody>{children}</tbody>;

export { Table, TableHead, TableRow, TableCell, TableBody };
