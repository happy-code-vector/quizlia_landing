// Server-side Firebase utilities for ISR
// Uses Firebase REST API for server-side fetching without Admin SDK

import { StudyGuide } from "./studyGuide";

const FIREBASE_PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

if (!FIREBASE_PROJECT_ID) {
  console.warn("NEXT_PUBLIC_FIREBASE_PROJECT_ID not set");
}

// Fetch a single study guide from Firestore via REST API
export async function getStudyGuideServer(slug: string): Promise<StudyGuide | null> {
  if (!FIREBASE_PROJECT_ID) {
    console.warn("Firebase project ID not configured");
    return null;
  }

  try {
    const response = await fetch(
      `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/notes/${slug}`,
      {
        next: { revalidate: 3600 }, // Cache for 1 hour
      }
    );

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`Firebase API error: ${response.status}`);
    }

    const data = await response.json();

    if (!data.fields) {
      return null;
    }

    // Convert Firestore document format to our StudyGuide type
    return convertFirestoreDocument(data.fields);
  } catch (error) {
    console.error("Error fetching study guide:", error);
    return null;
  }
}

// Get all study guide slugs for static generation
export async function getAllStudyGuideSlugsServer(): Promise<string[]> {
  if (!FIREBASE_PROJECT_ID) {
    console.warn("Firebase project ID not configured");
    return [];
  }

  try {
    const response = await fetch(
      `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents:runQuery`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          structuredQuery: {
            from: [{ collectionId: "notes" }],
            select: {
              fields: [{ fieldPath: "slug" }],
            },
          },
        }),
        next: { revalidate: 3600 },
      }
    );

    if (!response.ok) {
      throw new Error(`Firebase API error: ${response.status}`);
    }

    const data = await response.json();

    if (!Array.isArray(data)) {
      return [];
    }

    return data
      .filter((doc: any) => doc.document?.fields?.slug?.stringValue)
      .map((doc: any) => doc.document.fields.slug.stringValue);
  } catch (error) {
    console.error("Error fetching study guide slugs:", error);
    return [];
  }
}

// Convert Firestore document format to TypeScript object
function convertFirestoreDocument(fields: Record<string, any>): StudyGuide {
  const result: any = {};

  for (const [key, value] of Object.entries(fields)) {
    result[key] = convertFirestoreValue(value);
  }

  return result as StudyGuide;
}

function convertFirestoreValue(value: any): any {
  if (value.stringValue !== undefined) {
    return value.stringValue;
  }
  if (value.integerValue !== undefined) {
    return parseInt(value.integerValue);
  }
  if (value.doubleValue !== undefined) {
    return parseFloat(value.doubleValue);
  }
  if (value.booleanValue !== undefined) {
    return value.booleanValue;
  }
  if (value.timestampValue !== undefined) {
    return value.timestampValue;
  }
  if (value.arrayValue?.values) {
    return value.arrayValue.values.map(convertFirestoreValue);
  }
  if (value.mapValue?.fields) {
    return convertFirestoreDocument(value.mapValue.fields);
  }
  return null;
}
