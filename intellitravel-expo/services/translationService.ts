// Translation service using LibreTranslate (open source)

type TranslationResponse = {
  translatedText: string;
  error?: string;
};

// Using the Public LibreTranslate instance
const LIBRETRANSLATE_API = "https://libretranslate.de/translate";

export const translateText = async (
  text: string, 
  sourceLang: string = "auto", 
  targetLang: string = "tl"
): Promise<TranslationResponse> => {
  try {
    const response = await fetch(LIBRETRANSLATE_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        q: text,
        source: sourceLang,
        target: targetLang,
        format: "text",
      }),
    });

    const data = await response.json();
    
    if (data.error) {
      return { translatedText: text, error: data.error };
    }
    
    return { translatedText: data.translatedText };
  } catch (error) {
    console.error('Translation error:', error);
    return { translatedText: text, error: 'Translation service unavailable' };
  }
};

// Language detection function
export const detectLanguage = async (text: string): Promise<string> => {
  try {
    const response = await fetch("https://libretranslate.de/detect", {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        q: text,
      }),
    });

    const data = await response.json();
    if (data && data.length > 0) {
      return data[0].language;
    }
    return "en"; // Default to English if detection fails
  } catch (error) {
    console.error('Language detection error:', error);
    return "en";
  }
};