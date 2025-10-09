// Sentiment analysis utility for transcript highlighting
// Designed to be extensible for future user customization features

// Predefined sentiment dictionaries
export const sentimentDictionary = {
  positive: [
    // Core positive words
    'great', 'excellent', 'amazing', 'wonderful', 'fantastic', 'awesome', 'brilliant', 'outstanding',
    'perfect', 'love', 'adore', 'enjoy', 'like', 'appreciate', 'satisfied', 'pleased', 'happy',
    'delighted', 'thrilled', 'excited', 'impressed', 'smooth', 'easy', 'simple', 'intuitive',
    'helpful', 'useful', 'valuable', 'beneficial', 'effective', 'efficient', 'fast', 'quick',
    'reliable', 'stable', 'secure', 'safe', 'comfortable', 'convenient', 'accessible',
    'clear', 'obvious', 'straightforward', 'logical', 'organized', 'clean', 'beautiful',
    'attractive', 'appealing', 'engaging', 'interesting', 'fun', 'enjoyable', 'pleasant',
    'good', 'better', 'best', 'improved', 'enhanced', 'upgraded', 'optimized',
    'successful', 'working', 'functional', 'responsive', 'flexible', 'versatile',
    'innovative', 'creative', 'unique', 'special', 'exceptional', 'remarkable',
    'recommend', 'suggest', 'prefer', 'choose', 'select', 'favorite', 'top',
    'exceeded', 'surpassed', 'outperformed', 'delivered', 'achieved', 'accomplished',
    'solved', 'fixed', 'resolved', 'improved', 'enhanced', 'upgraded'
  ],
  negative: [
    // Core negative words
    'bad', 'terrible', 'awful', 'horrible', 'dreadful', 'disappointing', 'frustrating',
    'annoying', 'irritating', 'bothersome', 'hate', 'dislike', 'disappointed', 'upset',
    'angry', 'mad', 'furious', 'confused', 'lost', 'stuck', 'blocked', 'broken',
    'difficult', 'hard', 'challenging', 'complex', 'complicated', 'confusing', 'unclear',
    'slow', 'laggy', 'delayed', 'unresponsive', 'buggy', 'glitchy', 'unstable',
    'unreliable', 'inconsistent', 'unpredictable', 'risky', 'unsafe', 'dangerous',
    'uncomfortable', 'awkward', 'clunky', 'messy', 'disorganized', 'chaotic', 'cluttered',
    'ugly', 'unattractive', 'boring', 'dull', 'tedious', 'repetitive', 'monotonous',
    'worse', 'worst', 'poor', 'inadequate', 'insufficient', 'limited', 'restricted',
    'failed', 'broken', 'malfunctioning', 'defective', 'faulty', 'problematic',
    'error', 'mistake', 'issue', 'problem', 'concern', 'worry', 'anxiety', 'stress',
    'overwhelming', 'exhausting', 'tiring', 'draining', 'demanding', 'burdensome',
    'expensive', 'costly', 'overpriced', 'waste', 'useless', 'pointless', 'meaningless',
    'avoid', 'skip', 'ignore', 'reject', 'refuse', 'decline', 'abandon', 'quit',
    'struggle', 'fight', 'battle', 'conflict', 'disagreement', 'argument', 'complaint'
  ]
};

// Function to create word variations for stemming-like matching
const createWordVariations = (word) => {
  const variations = [word.toLowerCase()];
  
  // Add common suffixes and variations
  const suffixes = ['s', 'ed', 'ing', 'ly', 'er', 'est', 'tion', 'sion', 'ness', 'ment'];
  
  // For each suffix, try adding it to the base word
  suffixes.forEach(suffix => {
    if (!word.toLowerCase().endsWith(suffix)) {
      variations.push(word.toLowerCase() + suffix);
    }
  });
  
  // Remove common suffixes to get root forms
  const rootSuffixes = ['s', 'ed', 'ing', 'ly', 'er', 'est', 'tion', 'sion', 'ness', 'ment'];
  rootSuffixes.forEach(suffix => {
    if (word.toLowerCase().endsWith(suffix) && word.length > suffix.length + 2) {
      variations.push(word.toLowerCase().slice(0, -suffix.length));
    }
  });
  
  return [...new Set(variations)]; // Remove duplicates
};

// Create comprehensive word lists with variations
const createComprehensiveWordLists = () => {
  const positiveWords = new Set();
  const negativeWords = new Set();
  
  // Add base words and their variations
  sentimentDictionary.positive.forEach(word => {
    createWordVariations(word).forEach(variation => {
      positiveWords.add(variation);
    });
  });
  
  sentimentDictionary.negative.forEach(word => {
    createWordVariations(word).forEach(variation => {
      negativeWords.add(variation);
    });
  });
  
  return {
    positive: Array.from(positiveWords),
    negative: Array.from(negativeWords)
  };
};

// Get comprehensive word lists
const wordLists = createComprehensiveWordLists();

// Function to analyze text for sentiment words
export const analyzeSentiment = (text) => {
  if (!text || typeof text !== 'string') {
    return { positiveWords: [], negativeWords: [] };
  }
  
  const words = text.toLowerCase().split(/\s+/);
  const positiveWords = [];
  const negativeWords = [];
  
  words.forEach(word => {
    // Clean word (remove punctuation)
    const cleanWord = word.replace(/[^\w]/g, '');
    
    if (wordLists.positive.includes(cleanWord)) {
      positiveWords.push(word);
    } else if (wordLists.negative.includes(cleanWord)) {
      negativeWords.push(word);
    }
  });
  
  return { positiveWords, negativeWords };
};

// Function to highlight sentiment words in text
export const highlightSentimentWords = (text, showSentiment = false) => {
  if (!showSentiment || !text) {
    return text;
  }
  
  const { positiveWords, negativeWords } = analyzeSentiment(text);
  
  let highlightedText = text;
  
  // Highlight positive words
  positiveWords.forEach(word => {
    const regex = new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
    highlightedText = highlightedText.replace(regex, `<span class="sentiment-positive cursor-pointer" data-sentiment-word="true" data-sentiment-type="positive">${word}</span>`);
  });
  
  // Highlight negative words
  negativeWords.forEach(word => {
    const regex = new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
    highlightedText = highlightedText.replace(regex, `<span class="sentiment-negative cursor-pointer" data-sentiment-word="true" data-sentiment-type="negative">${word}</span>`);
  });
  
  return highlightedText;
};

// Function to extract the full sentence containing a clicked word
export const extractSentenceFromText = (text, clickedWord) => {
  if (!text || !clickedWord) return '';
  
  // Find the position of the clicked word in the text
  const wordIndex = text.toLowerCase().indexOf(clickedWord.toLowerCase());
  if (wordIndex === -1) return '';
  
  // Find sentence boundaries around the word
  let sentenceStart = 0;
  let sentenceEnd = text.length;
  
  // Look backwards for sentence start
  for (let i = wordIndex - 1; i >= 0; i--) {
    const char = text[i];
    if (char === '.' || char === '!' || char === '?') {
      sentenceStart = i + 1;
      break;
    }
  }
  
  // Look forwards for sentence end
  for (let i = wordIndex; i < text.length; i++) {
    const char = text[i];
    if (char === '.' || char === '!' || char === '?') {
      sentenceEnd = i + 1;
      break;
    }
  }
  
  // Extract the sentence and clean it up
  let sentence = text.slice(sentenceStart, sentenceEnd).trim();
  
  // Remove any leading/trailing whitespace and clean up
  sentence = sentence.replace(/^\s*[:\-]\s*/, ''); // Remove leading colons or dashes
  sentence = sentence.replace(/\s+/g, ' '); // Normalize whitespace
  
  return sentence;
};

// Export dictionary for future customization features
export const getSentimentDictionary = () => sentimentDictionary;

// Function to add custom words (for future features)
export const addCustomSentimentWords = (words, sentiment) => {
  if (sentiment === 'positive') {
    sentimentDictionary.positive.push(...words);
  } else if (sentiment === 'negative') {
    sentimentDictionary.negative.push(...words);
  }
};
