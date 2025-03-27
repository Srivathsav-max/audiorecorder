import { Client, Storage, Databases, ID } from 'appwrite';

if (!process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT) throw new Error('NEXT_PUBLIC_APPWRITE_ENDPOINT is not defined');
if (!process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID) throw new Error('NEXT_PUBLIC_APPWRITE_PROJECT_ID is not defined');
if (!process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID) throw new Error('NEXT_PUBLIC_APPWRITE_DATABASE_ID is not defined');
if (!process.env.NEXT_PUBLIC_APPWRITE_COLLECTION_ID) throw new Error('NEXT_PUBLIC_APPWRITE_COLLECTION_ID is not defined');
if (!process.env.NEXT_PUBLIC_APPWRITE_STORAGE_BUCKET_ID) throw new Error('NEXT_PUBLIC_APPWRITE_STORAGE_BUCKET_ID is not defined');

const APPWRITE_ENDPOINT = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT as string;
const APPWRITE_PROJECT_ID = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID as string;
const APPWRITE_DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID as string;
const APPWRITE_COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_COLLECTION_ID as string;
const APPWRITE_STORAGE_BUCKET_ID = process.env.NEXT_PUBLIC_APPWRITE_STORAGE_BUCKET_ID as string;

// Create Appwrite client
const client = new Client();
client
  .setEndpoint(APPWRITE_ENDPOINT)
  .setProject(APPWRITE_PROJECT_ID);

// Create service instances
export const storage = new Storage(client);
export const databases = new Databases(client);

// Audio file types interfaces
export interface AudioFileDocument {
  $id: string;
  $createdAt: string;
  sessionId: string;
  microphoneAudioFileId: string;
  systemAudioFileId: string;
  combinedAudioFileId?: string;
}

export type CreateAudioDocument = Omit<AudioFileDocument, '$id' | '$createdAt'>;

// Storage service
export const storageService = {
  // Upload a file to Appwrite storage
  uploadFile: async (file: Blob, filename: string): Promise<string> => {
    try {
      // Convert Blob to File object (required by Appwrite)
      const fileObj = new File([file], filename, { type: file.type });
      
      const result = await storage.createFile(
        APPWRITE_STORAGE_BUCKET_ID,
        ID.unique(),
        fileObj
      );
      return result.$id;
    } catch (error) {
      console.error('Error uploading file to Appwrite:', error);
      throw error;
    }
  },

  // Get file view URL
  getFilePreview: (fileId: string): string => {
    return storage.getFileView(
      APPWRITE_STORAGE_BUCKET_ID,
      fileId
    ).href;
  },

  // Delete file from storage
  deleteFile: async (fileId: string): Promise<void> => {
    try {
      await storage.deleteFile(
        APPWRITE_STORAGE_BUCKET_ID,
        fileId
      );
    } catch (error) {
      console.error('Error deleting file from Appwrite:', error);
      throw error;
    }
  }
};

// Database service
export const databaseService = {
  // Create a new audio recording document
  createAudioDocument: async (data: CreateAudioDocument): Promise<string> => {
    try {
      const result = await databases.createDocument(
        APPWRITE_DATABASE_ID,
        APPWRITE_COLLECTION_ID,
        ID.unique(),
        data
      );
      return result.$id;
    } catch (error) {
      console.error('Error creating audio document in Appwrite:', error);
      throw error;
    }
  },

  // List all audio recordings
  listAudioDocuments: async (): Promise<AudioFileDocument[]> => {
    try {
      const result = await databases.listDocuments(
        APPWRITE_DATABASE_ID,
        APPWRITE_COLLECTION_ID
      );
      return result.documents as unknown as AudioFileDocument[];
    } catch (error) {
      console.error('Error listing audio documents from Appwrite:', error);
      throw error;
    }
  },

  // Delete audio document
  deleteAudioDocument: async (documentId: string): Promise<void> => {
    try {
      await databases.deleteDocument(
        APPWRITE_DATABASE_ID,
        APPWRITE_COLLECTION_ID,
        documentId
      );
    } catch (error) {
      console.error('Error deleting audio document from Appwrite:', error);
      throw error;
    }
  }
};

// Helper function to delete both document and associated files
export const deleteAudioRecording = async (documentId: string, document: AudioFileDocument): Promise<void> => {
  try {
    // Delete all files first
    if (document.microphoneAudioFileId) {
      await storageService.deleteFile(document.microphoneAudioFileId);
    }
    if (document.systemAudioFileId) {
      await storageService.deleteFile(document.systemAudioFileId);
    }
    if (document.combinedAudioFileId) {
      await storageService.deleteFile(document.combinedAudioFileId);
    }

    // Then delete the document
    await databaseService.deleteAudioDocument(documentId);
  } catch (error) {
    console.error('Error deleting audio recording:', error);
    throw error;
  }
};
