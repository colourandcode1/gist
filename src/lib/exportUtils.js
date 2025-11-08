/**
 * Export utilities for problem spaces
 * Supports PDF, PowerPoint, CSV, and embed code generation
 */

import { getAllNuggets, getComments, getProblemSpaceById } from './firestoreUtils';

/**
 * Get all data needed for export
 */
export const getProblemSpaceExportData = async (problemSpaceId, userId, options = {}) => {
  const { includeComments = false, includeTranscripts = false } = options;

  const problemSpace = await getProblemSpaceById(problemSpaceId);
  if (!problemSpace) {
    throw new Error('Problem space not found');
  }

  // Get all insights
  const allNuggets = await getAllNuggets(userId);
  const insightIds = problemSpace.insightIds || [];
  const insights = allNuggets.filter(nugget => {
    const insightId = `${nugget.session_id}:${nugget.id}`;
    return insightIds.includes(insightId);
  });

  // Get comments if requested
  let comments = [];
  if (includeComments) {
    comments = await getComments(problemSpaceId);
  }

  return {
    problemSpace,
    insights,
    comments
  };
};

/**
 * Export to CSV
 */
export const exportToCSV = async (problemSpaceId, userId, options = {}) => {
  const { includeComments = false } = options;
  const data = await getProblemSpaceExportData(problemSpaceId, userId, { includeComments });

  // Create CSV content
  let csvContent = `Problem Space: ${data.problemSpace.name}\n`;
  csvContent += `Description: ${data.problemSpace.description || ''}\n`;
  csvContent += `Problem Statement: ${data.problemSpace.problemStatement || ''}\n`;
  csvContent += `Created: ${data.problemSpace.createdAt || ''}\n`;
  csvContent += `\n`;

  // Insights section
  csvContent += `Insights (${data.insights.length})\n`;
  csvContent += `Observation,Evidence,Speaker,Timestamp,Category,Tags,Session\n`;
  
  data.insights.forEach(insight => {
    const observation = `"${(insight.observation || '').replace(/"/g, '""')}"`;
    const evidence = `"${(insight.evidence_text || '').replace(/"/g, '""')}"`;
    const speaker = `"${(insight.speaker || '').replace(/"/g, '""')}"`;
    const timestamp = `"${(insight.timestamp || '').replace(/"/g, '""')}"`;
    const category = `"${(insight.category || '').replace(/"/g, '""')}"`;
    const tags = `"${(Array.isArray(insight.tags) ? insight.tags.join(', ') : '').replace(/"/g, '""')}"`;
    const session = `"${(insight.session_title || '').replace(/"/g, '""')}"`;
    
    csvContent += `${observation},${evidence},${speaker},${timestamp},${category},${tags},${session}\n`;
  });

  // Comments section
  if (includeComments && data.comments.length > 0) {
    csvContent += `\nComments (${data.comments.length})\n`;
    csvContent += `Author,Content,Created At,Resolved\n`;
    
    data.comments.forEach(comment => {
      const author = `"${(comment.userId || '').replace(/"/g, '""')}"`;
      const content = `"${(comment.content || '').replace(/"/g, '""')}"`;
      const createdAt = `"${(comment.createdAt || '').replace(/"/g, '""')}"`;
      const resolved = comment.resolved ? 'Yes' : 'No';
      
      csvContent += `${author},${content},${createdAt},${resolved}\n`;
    });
  }

  // Download CSV
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `${data.problemSpace.name.replace(/[^a-z0-9]/gi, '_')}_export.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Export to PDF (using browser print functionality)
 */
export const exportToPDF = async (problemSpaceId, userId, options = {}) => {
  const { includeComments = false } = options;
  const data = await getProblemSpaceExportData(problemSpaceId, userId, { includeComments });

  // Create HTML content for PDF
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>${data.problemSpace.name}</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          max-width: 800px;
          margin: 0 auto;
          padding: 40px;
          line-height: 1.6;
          color: #333;
        }
        h1 {
          color: #1a1a1a;
          border-bottom: 3px solid #3b82f6;
          padding-bottom: 10px;
          margin-bottom: 20px;
        }
        h2 {
          color: #374151;
          margin-top: 30px;
          margin-bottom: 15px;
          border-bottom: 1px solid #e5e7eb;
          padding-bottom: 5px;
        }
        .metadata {
          background: #f9fafb;
          padding: 15px;
          border-radius: 8px;
          margin-bottom: 30px;
        }
        .metadata p {
          margin: 5px 0;
          color: #6b7280;
        }
        .insight {
          margin-bottom: 25px;
          padding: 15px;
          border-left: 4px solid #3b82f6;
          background: #f9fafb;
        }
        .insight h3 {
          margin: 0 0 10px 0;
          color: #1f2937;
        }
        .insight .evidence {
          font-style: italic;
          color: #4b5563;
          margin: 10px 0;
          padding: 10px;
          background: white;
          border-radius: 4px;
        }
        .insight .meta {
          font-size: 0.9em;
          color: #6b7280;
          margin-top: 10px;
        }
        .tag {
          display: inline-block;
          background: #e5e7eb;
          padding: 3px 8px;
          border-radius: 4px;
          font-size: 0.85em;
          margin-right: 5px;
        }
        .comment {
          margin-bottom: 15px;
          padding: 12px;
          background: #f3f4f6;
          border-radius: 6px;
        }
        .comment .author {
          font-weight: 600;
          color: #374151;
          margin-bottom: 5px;
        }
        .comment .content {
          color: #4b5563;
        }
        @media print {
          body {
            padding: 20px;
          }
        }
      </style>
    </head>
    <body>
      <h1>${escapeHtml(data.problemSpace.name)}</h1>
      
      <div class="metadata">
        <p><strong>Description:</strong> ${escapeHtml(data.problemSpace.description || 'No description')}</p>
        ${data.problemSpace.problemStatement ? `<p><strong>Problem Statement:</strong> ${escapeHtml(data.problemSpace.problemStatement)}</p>` : ''}
        <p><strong>Created:</strong> ${formatDate(data.problemSpace.createdAt)}</p>
        <p><strong>Total Insights:</strong> ${data.insights.length}</p>
      </div>

      ${data.problemSpace.keyQuestions && data.problemSpace.keyQuestions.length > 0 ? `
        <h2>Key Questions</h2>
        <ul>
          ${data.problemSpace.keyQuestions.map(q => `<li>${escapeHtml(q)}</li>`).join('')}
        </ul>
      ` : ''}

      <h2>Insights (${data.insights.length})</h2>
      ${data.insights.map((insight, index) => `
        <div class="insight">
          <h3>${index + 1}. ${escapeHtml(insight.observation || 'Untitled Insight')}</h3>
          <div class="evidence">"${escapeHtml(insight.evidence_text || '')}"</div>
          <div class="meta">
            <strong>Category:</strong> ${escapeHtml(insight.category || 'general')} | 
            <strong>Speaker:</strong> ${escapeHtml(insight.speaker || 'Unknown')} | 
            <strong>Session:</strong> ${escapeHtml(insight.session_title || 'Unknown')}
            ${insight.timestamp ? ` | <strong>Timestamp:</strong> ${escapeHtml(insight.timestamp)}` : ''}
            ${Array.isArray(insight.tags) && insight.tags.length > 0 ? `
              <br><strong>Tags:</strong> ${insight.tags.map(tag => `<span class="tag">${escapeHtml(tag)}</span>`).join('')}
            ` : ''}
          </div>
        </div>
      `).join('')}

      ${includeComments && data.comments.length > 0 ? `
        <h2>Comments (${data.comments.length})</h2>
        ${data.comments.map(comment => `
          <div class="comment">
            <div class="author">${escapeHtml(comment.userId)}</div>
            <div class="content">${escapeHtml(comment.content)}</div>
            <div style="font-size: 0.85em; color: #9ca3af; margin-top: 5px;">
              ${formatDate(comment.createdAt)} ${comment.resolved ? '• Resolved' : ''}
            </div>
          </div>
        `).join('')}
      ` : ''}
    </body>
    </html>
  `;

  // Open in new window and trigger print
  const printWindow = window.open('', '_blank');
  printWindow.document.write(htmlContent);
  printWindow.document.close();
  
  // Wait for content to load, then print
  printWindow.onload = () => {
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };
};

/**
 * Export to PowerPoint (generates HTML that can be converted to PPT)
 * Note: True PPT export would require a library like PptxGenJS
 */
export const exportToPowerPoint = async (problemSpaceId, userId, options = {}) => {
  const { includeComments = false } = options;
  const data = await getProblemSpaceExportData(problemSpaceId, userId, { includeComments });

  // For now, we'll create a structured HTML that can be opened in PowerPoint
  // A full implementation would use PptxGenJS or similar library
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>${data.problemSpace.name} - PowerPoint Export</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          max-width: 960px;
          margin: 0 auto;
          padding: 20px;
        }
        .slide {
          page-break-after: always;
          padding: 40px;
          border: 1px solid #ddd;
          margin-bottom: 20px;
          background: white;
        }
        h1 { color: #1a1a1a; font-size: 32px; }
        h2 { color: #374151; font-size: 24px; margin-top: 30px; }
        .insight { margin: 20px 0; padding: 15px; background: #f9fafb; }
        .insight-title { font-size: 18px; font-weight: bold; margin-bottom: 10px; }
        .insight-evidence { font-style: italic; color: #4b5563; }
      </style>
    </head>
    <body>
      <div class="slide">
        <h1>${escapeHtml(data.problemSpace.name)}</h1>
        <p>${escapeHtml(data.problemSpace.description || '')}</p>
        <p><strong>Problem Statement:</strong> ${escapeHtml(data.problemSpace.problemStatement || '')}</p>
        <p>Total Insights: ${data.insights.length}</p>
      </div>

      ${data.insights.map((insight, index) => `
        <div class="slide">
          <h2>Insight ${index + 1}</h2>
          <div class="insight">
            <div class="insight-title">${escapeHtml(insight.observation || 'Untitled Insight')}</div>
            <div class="insight-evidence">"${escapeHtml(insight.evidence_text || '')}"</div>
            <p><strong>Category:</strong> ${escapeHtml(insight.category || 'general')}</p>
            <p><strong>Session:</strong> ${escapeHtml(insight.session_title || 'Unknown')}</p>
          </div>
        </div>
      `).join('')}
    </body>
    </html>
  `;

  // Download as HTML (can be opened in PowerPoint)
  const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `${data.problemSpace.name.replace(/[^a-z0-9]/gi, '_')}_export.html`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Generate embed code for Notion/Confluence
 */
export const generateEmbedCode = async (problemSpaceId, userId, platform = 'notion') => {
  const data = await getProblemSpaceExportData(problemSpaceId, userId, { includeComments: false });

  if (platform === 'notion') {
    // Notion embed code (Markdown format)
    let markdown = `# ${data.problemSpace.name}\n\n`;
    markdown += `${data.problemSpace.description || ''}\n\n`;
    
    if (data.problemSpace.problemStatement) {
      markdown += `## Problem Statement\n\n${data.problemSpace.problemStatement}\n\n`;
    }
    
    if (data.problemSpace.keyQuestions && data.problemSpace.keyQuestions.length > 0) {
      markdown += `## Key Questions\n\n`;
      data.problemSpace.keyQuestions.forEach(q => {
        markdown += `- ${q}\n`;
      });
      markdown += `\n`;
    }
    
    markdown += `## Insights\n\n`;
    data.insights.forEach((insight, index) => {
      markdown += `### ${index + 1}. ${insight.observation || 'Untitled Insight'}\n\n`;
      markdown += `> ${insight.evidence_text || ''}\n\n`;
      markdown += `**Category:** ${insight.category || 'general'} | **Session:** ${insight.session_title || 'Unknown'}\n\n`;
      if (Array.isArray(insight.tags) && insight.tags.length > 0) {
        markdown += `**Tags:** ${insight.tags.join(', ')}\n\n`;
      }
    });

    return {
      code: markdown,
      format: 'markdown',
      instructions: 'Copy this markdown and paste it into a Notion page'
    };
  } else if (platform === 'confluence') {
    // Confluence uses a different format (HTML/Storage format)
    let html = `<h1>${escapeHtml(data.problemSpace.name)}</h1>`;
    html += `<p>${escapeHtml(data.problemSpace.description || '')}</p>`;
    
    if (data.problemSpace.problemStatement) {
      html += `<h2>Problem Statement</h2><p>${escapeHtml(data.problemSpace.problemStatement)}</p>`;
    }
    
    html += `<h2>Insights</h2>`;
    data.insights.forEach((insight, index) => {
      html += `<h3>${index + 1}. ${escapeHtml(insight.observation || 'Untitled Insight')}</h3>`;
      html += `<blockquote>${escapeHtml(insight.evidence_text || '')}</blockquote>`;
      html += `<p><strong>Category:</strong> ${escapeHtml(insight.category || 'general')} | <strong>Session:</strong> ${escapeHtml(insight.session_title || 'Unknown')}</p>`;
    });

    return {
      code: html,
      format: 'html',
      instructions: 'Copy this HTML and paste it into a Confluence page (use the HTML macro)'
    };
  }

  return null;
};

// Helper functions
const escapeHtml = (text) => {
  if (!text) return '';
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return String(text).replace(/[&<>"']/g, (m) => map[m]);
};

const formatDate = (dateString) => {
  if (!dateString) return 'Unknown';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  } catch {
    return dateString;
  }
};

