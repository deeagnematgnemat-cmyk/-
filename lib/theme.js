//@Eren/changes Universal Eren theme formatter for converted plugins
export const theme = {
  build(items) {
    if (typeof items === 'string') return items;
    if (!Array.isArray(items)) return String(items || '');
    let out = [];
    for (const item of items) {
      if (typeof item === 'string') {
        out.push(item);
        continue;
      }
      switch (item.type) {
        case 'title':
          out.push(`╭────────『 🍷 ${item.text} 』────────╮`);
          break;
        case 'subtitle':
          out.push(`│ ✦ ${item.text}`);
          break;
        case 'divider':
          out.push(`├────────────────────────────────────┤`);
          break;
        case 'info':
          out.push(`│ [${item.label || '•'}] ${item.value || ''}`);
          break;
        case 'line':
          out.push(`│ ${item.text}`);
          break;
        default:
          out.push(`│ ${item.text || item.value || ''}`);
      }
    }
    out.push(`╰────────────────────────────────────╯`);
    return out.join('\n');
  }
};

export const formatWithTheme = (data) => theme.build(data);

export default theme;
