import { NextRequest, NextResponse } from 'next/server';
import { readdir } from 'fs/promises';
import { join } from 'path';
import { stat } from 'fs/promises';

interface RecordingInfo {
  filename: string;
  url: string;
  type: 'microphone' | 'system' | 'combined';
  timestamp: number;
  format: 'wav';
  size: number;
}

/**
 * API route to get all recordings stored on the server
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const cursor = searchParams.get('cursor') ? parseInt(searchParams.get('cursor')!) : Date.now();
  const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 10;
  try {
    // Path to the recordings directory
    const recordingsDir = join(process.cwd(), 'public', 'recordings');
    
    // Read all files in the directory
    const files = await readdir(recordingsDir);
    
    // Filter for audio files and parse metadata
    const recordings: RecordingInfo[] = [];
    
    // Process each file
    for (const file of files) {
      if (!file.endsWith('.wav') && !file.endsWith('.mp3')) continue;
      
      try {
        // Get file stats to retrieve size
        const fileStat = await stat(join(recordingsDir, file));
        
        // Parse filename to get metadata
        // Example filename format: microphone_2023-12-31_12-30-45_abc123.wav
        const parts = file.split('_');
        
        // Determine type
        let type: 'microphone' | 'system' | 'combined';
        if (file.startsWith('microphone_')) {
          type = 'microphone';
        } else if (file.startsWith('system_')) {
          type = 'system';
        } else if (file.startsWith('combined_')) {
          type = 'combined';
        } else {
          continue; // Skip files that don't match our naming convention
        }
        
        // Parse timestamp
        let timestamp = 0;
        if (parts.length >= 3) {
          // Extract date and time parts
          const datePart = parts[1]; // e.g., 2023-12-31
          const timePart = parts[2]; // e.g., 12-30-45
          
          if (datePart && timePart) {
            const dateStr = `${datePart.replace(/-/g, '/')} ${timePart.replace(/-/g, ':')}`;
            timestamp = new Date(dateStr).getTime();
          }
        }
        
        // Extract session ID
        const sessionId = parts.length >= 4 ? parts[3].split('.')[0] : '';
        
        // Define format based on file extension
        const format = file.endsWith('.mp3') ? 'mp3' as const : 'wav' as const;
        
        recordings.push({
          filename: file,
          url: `/recordings/${file}`,
          type,
          timestamp: timestamp || Date.now(), // Fallback to current time if parsing fails
          format: 'wav',
          size: fileStat.size
        });
      } catch (fileError) {
        console.error(`Error processing file ${file}:`, fileError);
      }
    }
    
    // Group recordings by session ID (timestamp + session ID)
    const groupedRecordings: Record<string, {
      microphone?: RecordingInfo,
      system?: RecordingInfo,
      combined?: RecordingInfo,
      timestamp: number
    }> = {};
    
    recordings.forEach(recording => {
      // Extract session info from filename
      const parts = recording.filename.split('_');
      if (parts.length < 4) return;
      
      const datePart = parts[1];
      const timePart = parts[2];
      const sessionId = parts[3].split('.')[0];
      const key = `${datePart}_${timePart}_${sessionId}`;
      
      if (!groupedRecordings[key]) {
        groupedRecordings[key] = {
          timestamp: recording.timestamp
        };
      }
      
      // Add recording to the appropriate category
      if (recording.type === 'microphone') {
        groupedRecordings[key].microphone = recording;
      } else if (recording.type === 'system') {
        groupedRecordings[key].system = recording;
      } else if (recording.type === 'combined') {
        groupedRecordings[key].combined = recording;
      }
    });
    
    // Convert to array and sort by timestamp (newest first)
    const result = Object.entries(groupedRecordings)
      .map(([id, data]) => ({
        id,
        microphoneAudio: data.microphone?.url || '',
        systemAudio: data.system?.url || '',
        combinedAudio: data.combined?.url || null,
        timestamp: data.timestamp,
        format: 'wav' as const
      }))
      .filter(rec => rec.microphoneAudio || rec.systemAudio) // Ensure at least one audio file exists
      .sort((a, b) => b.timestamp - a.timestamp); // Sort newest first
    
    // Apply pagination
    const paginatedResult = result.filter(rec => rec.timestamp < cursor).slice(0, limit);
    
    // Get the next cursor (timestamp of the last item)
    const nextCursor = paginatedResult.length > 0 
      ? paginatedResult[paginatedResult.length - 1].timestamp 
      : null;
    
    // Check if there are more items
    const hasMore = result.some(rec => rec.timestamp < (nextCursor || 0));

    return NextResponse.json({
      success: true,
      recordings: paginatedResult,
      nextCursor: hasMore ? nextCursor : null
    });
  } catch (error) {
    console.error('Error reading recordings directory:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve recordings' },
      { status: 500 }
    );
  }
}
