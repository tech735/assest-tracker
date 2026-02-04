/**
 * Exports data to a CSV file and triggers a browser download.
 * 
 * @param data - Array of objects to export
 * @param fileName - Name of the file (without extension)
 */
export function exportToCSV(data: any[], fileName: string) {
    if (!data || !data.length) {
        console.error('No data to export');
        return;
    }

    // Get keys from first object as headers
    const headers = Object.keys(data[0]);

    // Map data to CSV rows
    const csvRows = [
        // Header row
        headers.join(','),
        // Data rows
        ...data.map((row) =>
            headers
                .map((header) => {
                    const value = row[header];
                    // Escape quotes and wrap in quotes if value contains commas
                    const escaped = ('' + (value ?? '')).replace(/"/g, '""');
                    return `"${escaped}"`;
                })
                .join(',')
        ),
    ];

    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${fileName}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
