import { Client, Storage, Databases, ID, RealtimeResponseEvent } from 'appwrite';
import type { AudioFileDocument, CreateAudioDocument } from './appwrite';

class NetworkAwareClient {
  private client: Client;
  private isOffline = false;
  private requestQueue: Array<() => Promise<unknown>> = [];
  private maxRetries = 3;
  private retryDelay = 1000;

  constructor() {
    this.client = new Client();
    this.setupNetworkListeners();
  }

  setEndpoint(endpoint: string): this {
    this.client.setEndpoint(endpoint);
    return this;
  }

  setProject(project: string): this {
    this.client.setProject(project);
    return this;
  }

  private setupNetworkListeners() {
    if (typeof window !== 'undefined') {
      this.isOffline = !navigator.onLine;
      window.addEventListener('online', this.handleOnline);
      window.addEventListener('offline', this.handleOffline);
    }
  }

  private handleOnline = () => {
    this.isOffline = false;
    this.processQueue();
  };

  private handleOffline = () => {
    this.isOffline = true;
  };

  private async processQueue() {
    if (this.isOffline || this.requestQueue.length === 0) return;

    const requests = [...this.requestQueue];
    this.requestQueue = [];

    for (const request of requests) {
      try {
        await request();
      } catch (error) {
        console.error('Failed to process queued request:', error);
      }
    }
  }

  private async retryWithBackoff<T>(
    operation: () => Promise<T>,
    retries = this.maxRetries
  ): Promise<T> {
    try {
      return await operation();
    } catch (error: unknown) {
      const isNetworkError = (err: unknown): boolean => {
        if (err && typeof err === 'object') {
          const errObj = err as { code?: number | string; message?: string; type?: string };
          return (
            errObj.code === 0 ||
            errObj.code === 'network_error' ||
            (typeof errObj.message === 'string' && errObj.message.includes('Network')) ||
            errObj.type === 'NetworkError'
          );
        }
        return false;
      };

      if (retries > 0 && isNetworkError(error)) {
        await new Promise(resolve => 
          setTimeout(resolve, this.retryDelay * (this.maxRetries - retries + 1))
        );
        return this.retryWithBackoff(operation, retries - 1);
      }
      throw error;
    }
  }

  async call<T>(operation: () => Promise<T>): Promise<T> {
    if (this.isOffline) {
      return new Promise((_, reject) => {
        this.requestQueue.push(async () => {
          try {
            const result = await this.retryWithBackoff(operation);
            return result;
          } catch (error) {
            reject(error);
          }
        });
        reject(new Error('Application is offline. Request queued.'));
      });
    }

    return this.retryWithBackoff(operation);
  }

  getClient(): Client {
    return this.client;
  }

  subscribe<T>(
    channels: string[],
    callback: (response: RealtimeResponseEvent<T>) => void
  ): () => void {
    return this.client.subscribe(channels, callback);
  }
}

// Initialize network-aware client
const networkAwareClient = new NetworkAwareClient();
const client = networkAwareClient
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!)
  .getClient();

// Create instances with the base client
export const networkAwareStorage = new Storage(client);
export const networkAwareDatabases = new Databases(client);

// Wrap storage operations with network awareness
export const storageService = {
  uploadFile: async (file: Blob, filename: string): Promise<string> => {
    if (!navigator.onLine) {
      throw new Error('Cannot upload files while offline');
    }
    return networkAwareClient.call(async () => {
      const fileObj = new File([file], filename, { type: file.type });
      const result = await networkAwareStorage.createFile(
        process.env.NEXT_PUBLIC_APPWRITE_STORAGE_BUCKET_ID!,
        ID.unique(),
        fileObj
      );
      return result.$id;
    });
  },

  getFilePreview: (fileId: string): string => {
    return networkAwareStorage.getFileView(
      process.env.NEXT_PUBLIC_APPWRITE_STORAGE_BUCKET_ID!,
      fileId
    ).href;
  },

  deleteFile: async (fileId: string): Promise<void> => {
    return networkAwareClient.call(async () => {
      await networkAwareStorage.deleteFile(
        process.env.NEXT_PUBLIC_APPWRITE_STORAGE_BUCKET_ID!,
        fileId
      );
    });
  }
};

// Wrap database operations with network awareness
export const databaseService = {
  createAudioDocument: async (data: CreateAudioDocument): Promise<string> => {
    return networkAwareClient.call(async () => {
      const result = await networkAwareDatabases.createDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        process.env.NEXT_PUBLIC_APPWRITE_COLLECTION_ID!,
        ID.unique(),
        data
      );
      return result.$id;
    });
  },

  listAudioDocuments: async (): Promise<AudioFileDocument[]> => {
    return networkAwareClient.call(async () => {
      const result = await networkAwareDatabases.listDocuments(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        process.env.NEXT_PUBLIC_APPWRITE_COLLECTION_ID!
      );
      return result.documents as unknown as AudioFileDocument[];
    });
  },

  deleteAudioDocument: async (documentId: string): Promise<void> => {
    return networkAwareClient.call(async () => {
      await networkAwareDatabases.deleteDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        process.env.NEXT_PUBLIC_APPWRITE_COLLECTION_ID!,
        documentId
      );
    });
  }
};

// Re-export types and delete helper
export type { AudioFileDocument, CreateAudioDocument } from './appwrite';
export { deleteAudioRecording } from './appwrite';
export { ID } from 'appwrite';
