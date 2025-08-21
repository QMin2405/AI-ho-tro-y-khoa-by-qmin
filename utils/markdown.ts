
// Processes all inline formatting tags used in the app
export const processInlineFormatting = (str: string) => {
    if (!str) return '';
    return str
        .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold">$1</strong>')
        .replace(/\*(.*?)\*/g, '<em class="italic">$1</em>')
        .replace(/__(.*?)__/g, '<span class="underline decoration-2 decoration-sky-500">$1</span>')
        .replace(/==(.*?)==/g, '<mark class="bg-yellow-200 dark:bg-yellow-800/60 px-1 py-0.5 rounded-md text-slate-900 dark:text-yellow-100">$1</mark>')
        .replace(/\[HL\](.*?)\[\/HL\]/g, '<strong class="text-medical-blue-light dark:text-medical-blue-dark font-semibold">$1</strong>')
        .replace(/\[DEF term="(.*?)"\](.*?)\[\/DEF\]/g, `
            <span class="relative group cursor-pointer font-bold text-medical-blue-light dark:text-medical-blue-dark underline decoration-dotted decoration-1 underline-offset-2">
                $1
                <span class="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-72 p-3 bg-gray-900 dark:bg-gray-800 text-white text-sm rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none text-left normal-case font-normal border border-slate-700">
                    $2
                </span>
            </span>
        `);
};

// Converts markdown text (handling blocks like headers, lists, and tables) to an HTML string
export const markdownToHtml = (text: string) => {
    if (!text) return '';
    const lines = text.split('\n');
    let html = '';
    let inList = false;
    let i = 0;

    while (i < lines.length) {
        const line = lines[i];
        const trimmedLine = line.trim();

        const h3Match = trimmedLine.match(/^###\s?(.*)/);
        const h2Match = trimmedLine.match(/^##\s?(.*)/);
        const h1Match = trimmedLine.match(/^#\s?(.*)/);
        
        const isTableLine = (l: string) => l.includes('|');
        const isSeparatorLine = (l: string) => /\|(?=.*\|)[ -:|]+/.test(l.trim());

        if (isTableLine(trimmedLine) && lines[i + 1] && isSeparatorLine(lines[i + 1])) {
            if (inList) { html += '</ul>'; inList = false; }
            
            html += `<div class="my-4 overflow-x-auto rounded-lg border border-slate-200 dark:border-gray-700"><table class="w-full text-sm text-left">`;

            const headers = lines[i].split('|').map(h => h.trim()).filter(Boolean);
            html += `<thead class="text-xs uppercase bg-slate-100 dark:bg-gray-700/50 text-slate-600 dark:text-slate-300"><tr>`;
            headers.forEach(header => {
                html += `<th scope="col" class="px-4 py-3 font-semibold">${processInlineFormatting(header)}</th>`;
            });
            html += `</tr></thead>`;
            
            i += 2;

            html += '<tbody>';
            while (i < lines.length && isTableLine(lines[i])) {
                const cells = lines[i].split('|').map(c => c.trim()).filter(Boolean);
                html += `<tr class="bg-white dark:bg-gray-800 hover:bg-slate-50 dark:hover:bg-gray-700/50 border-t border-slate-200 dark:border-gray-700">`;
                cells.forEach(cell => {
                    html += `<td class="px-4 py-2">${processInlineFormatting(cell)}</td>`;
                });
                html += `</tr>`;
                i++;
            }
            html += '</tbody></table></div>';
            continue; 
        }

        if (h3Match) {
            if (inList) { html += '</ul>'; inList = false; }
            html += `<h3 class="text-base font-bold my-2 text-slate-600 dark:text-slate-300">${processInlineFormatting(h3Match[1])}</h3>`;
        } else if (h2Match) {
            if (inList) { html += '</ul>'; inList = false; }
            html += `<h2 class="text-lg font-bold my-2 text-slate-700 dark:text-slate-200">${processInlineFormatting(h2Match[1])}</h2>`;
        } else if (h1Match) {
            if (inList) { html += '</ul>'; inList = false; }
            html += `<h1 class="text-xl font-bold my-3 text-slate-800 dark:text-slate-100">${processInlineFormatting(h1Match[1])}</h1>`;
        } else if (trimmedLine.startsWith('- ')) {
            if (!inList) {
                html += '<ul class="list-disc list-inside space-y-1 my-2 pl-2">';
                inList = true;
            }
            html += `<li class="text-slate-700 dark:text-slate-300">${processInlineFormatting(trimmedLine.substring(2))}</li>`;
        } else {
            if (inList) {
                html += '</ul>';
                inList = false;
            }
            if (trimmedLine) {
                html += `<p class="my-2 text-slate-700 dark:text-slate-300">${processInlineFormatting(trimmedLine)}</p>`;
            } else {
                 html += '<br />';
            }
        }
        i++;
    }

    if (inList) {
        html += '</ul>';
    }

    return html;
};
