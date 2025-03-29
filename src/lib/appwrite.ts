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
export const APPWRITE_STORAGE_BUCKET_ID = process.env.NEXT_PUBLIC_APPWRITE_STORAGE_BUCKET_ID as string;

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
  uploadFile: async (file: File, filename: string): Promise<string> => {
    try {
      // Input validation
      if (!file) {
        throw new Error('Invalid file input: File is required');
      }

      // Validate file size (Appwrite has a 100MB limit by default)
      const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
      if (file.size > MAX_FILE_SIZE) {
        throw new Error(`File size exceeds maximum limit of ${MAX_FILE_SIZE} bytes`);
      }

      // Create unique ID for the file
      const fileId = ID.unique();

      // Server-side environment (Node.js/Next.js API route)
      if (typeof window === 'undefined') {
        try {
          // For Node.js environments, dynamically import node-appwrite
          const nodeAppwrite = await import('node-appwrite');
          const { Client: NodeClient, Storage: NodeStorage, InputFile } = nodeAppwrite;
          
          // Initialize node-appwrite client
          const nodeClient = new NodeClient()
            .setEndpoint(APPWRITE_ENDPOINT)
            .setProject(APPWRITE_PROJECT_ID);
            
          // Create storage instance
          const nodeStorage = new NodeStorage(nodeClient);
          
          // Convert the file to an ArrayBuffer and buffer
          const arrayBuffer = await file.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          
          // Create an InputFile instance from the buffer
          const inputFile = InputFile.fromBuffer(buffer, filename || file.name);
          
          // Upload the file using node-appwrite
          const result = await nodeStorage.createFile(
            APPWRITE_STORAGE_BUCKET_ID,
            fileId,
            inputFile
          );
          
          return result.$id;
        } catch (nodeError) {
          console.error('Error using node-appwrite for file upload:', nodeError);
          throw nodeError;
        }
      } else {
        // Client-side environment (browser)
        // Use the browser-side Appwrite SDK for client uploads
        const result = await storage.createFile(
          APPWRITE_STORAGE_BUCKET_ID,
          fileId,
          file
        );

        return result.$id;
      }
    } catch (error) {
      console.error('Error uploading file to Appwrite:', error);
      if (error instanceof Error) {
        throw new Error(`File upload failed: ${error.message}`);
      }
      throw new Error('Unknown error occurred during file upload');
    }
  },

  // Get file view URL
  getFilePreview: (fileId: string): string => {
    return storage.getFileView(
      APPWRITE_STORAGE_BUCKET_ID,
      fileId
    ).toString();
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