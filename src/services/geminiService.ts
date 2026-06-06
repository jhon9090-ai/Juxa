export interface MCQ {
  id: string;
  question: string;
  options: string[];
  correctAnswerIndex: number;
  explanation: string;
}

export interface EnhancedNote {
  title: string;
  htmlContent: string;
  mcqs: MCQ[];
}

export async function enhanceNote(rawNotes: string): Promise<EnhancedNote> {
  try {
    const response = await fetch("/api/enhance", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ rawNotes }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.error || `Server responded with status ${response.status}`
      );
    }

    const data: EnhancedNote = await response.json();
    return data;
  } catch (error: any) {
    console.error("Failed to enhance note through secure proxy:", error);
    throw new Error(
      error.message || "Could not transform your notes. Please make sure the server has been supplied with a valid API key config."
    );
  }
}
