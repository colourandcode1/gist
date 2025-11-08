import mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist';

// Set up PDF.js worker for Vite
// Use local worker file from public directory for better reliability
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

/**
 * Extracts text content from various file types
 * @param {File} file - The file to parse
 * @returns {Promise<string>} - The extracted text content
 */
export const parseFile = async (file) => {
  const fileName = file.name.toLowerCase();
  const extension = fileName.split('.').pop();

  try {
    switch (extension) {
      case 'txt':
        return await parseTextFile(file);
      
      case 'docx':
      case 'doc':
        return await parseDocxFile(file);
      
      case 'pdf':
        return await parsePdfFile(file);
      
      default:
        throw new Error(`Unsupported file type: .${extension}`);
    }
  } catch (error) {
    console.error('Error parsing file:', error);
    throw new Error(`Failed to parse file: ${error.message}`);
  }
};

/**
 * Parses a plain text file
 */
const parseTextFile = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = (e) => reject(new Error('Failed to read text file'));
    reader.readAsText(file);
  });
};

/**
 * Parses a .docx file using mammoth
 */
const parseDocxFile = async (file) => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value;
  } catch (error) {
    throw new Error(`Failed to parse DOCX file: ${error.message}`);
  }
};

/**
 * Parses a .pdf file using PDF.js with positional analysis to preserve formatting
 * Uses Y-coordinate analysis (best practice) to detect line breaks and paragraphs
 */
const parsePdfFile = async (file) => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    
    let fullText = '';
    
    // Extract text from all pages
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      
      if (textContent.items.length === 0) {
        continue;
      }
      
      // Extract items with their positions
      const itemsWithPositions = textContent.items
        .filter(item => item.str && item.str.trim().length > 0)
        .map(item => {
          // Extract X and Y coordinates from transform matrix
          // Transform matrix: [scaleX, skewY, skewX, scaleY, x, y]
          const transform = item.transform || [1, 0, 0, 1, 0, 0];
          const x = transform[4] || 0;
          const y = transform[5] || 0;
          
          return {
            text: item.str,
            x: x,
            y: y,
            width: item.width || 0,
            height: item.height || 0
          };
        });
      
      if (itemsWithPositions.length === 0) {
        continue;
      }
      
      // Calculate line height from first few items
      // Use median of height values to establish baseline
      const heights = itemsWithPositions
        .map(item => item.height)
        .filter(h => h > 0)
        .sort((a, b) => a - b);
      const medianHeight = heights.length > 0 
        ? heights[Math.floor(heights.length / 2)]
        : 12; // Default fallback
      
      // Tolerance for grouping items on the same line (small floating-point differences)
      const yTolerance = medianHeight * 0.3;
      
      // Group items by Y-coordinate (same line)
      const lines = [];
      const processed = new Set();
      
      itemsWithPositions.forEach((item, index) => {
        if (processed.has(index)) return;
        
        // Find all items on the same line (similar Y-coordinate)
        const lineItems = [item];
        processed.add(index);
        
        itemsWithPositions.forEach((otherItem, otherIndex) => {
          if (processed.has(otherIndex)) return;
          
          const yDiff = Math.abs(item.y - otherItem.y);
          if (yDiff <= yTolerance) {
            lineItems.push(otherItem);
            processed.add(otherIndex);
          }
        });
        
        // Sort items within line by X-coordinate (left-to-right reading order)
        lineItems.sort((a, b) => a.x - b.x);
        
        lines.push({
          y: item.y,
          items: lineItems
        });
      });
      
      // Sort lines by Y-coordinate (top-to-bottom, but PDF Y is bottom-to-top, so reverse)
      lines.sort((a, b) => b.y - a.y);
      
      // Build text with proper line breaks
      let pageText = '';
      let previousY = null;
      
      lines.forEach((line) => {
        // Join items on the same line with spaces
        const lineText = line.items.map(item => item.text).join(' ').trim();
        
        if (lineText.length === 0) {
          return;
        }
        
        // Determine if this is a new line or paragraph break
        if (previousY !== null) {
          const yGap = Math.abs(previousY - line.y);
          const lineHeight = medianHeight;
          
          // If gap is significantly larger than line height, it's a paragraph break
          if (yGap > lineHeight * 1.5) {
            pageText += '\n\n';
          } else {
            // Regular line break
            pageText += '\n';
          }
        }
        
        pageText += lineText;
        previousY = line.y;
      });
      
      // Add page break if not the last page
      if (pageNum < pdf.numPages) {
        fullText += pageText + '\n\n';
      } else {
        fullText += pageText;
      }
    }
    
    return fullText.trim();
  } catch (error) {
    throw new Error(`Failed to parse PDF file: ${error.message}`);
  }
};

