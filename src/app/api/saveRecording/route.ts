import { NextRequest, NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import { mkdir } from 'fs/promises';
import { join } from 'path';

/**
 * API route to save audio recordings
 */
export async function POST(request: NextRequest) {
  try {
    // Parse the multipart form data
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;
    
    if (!audioFile) {
      return NextResponse.json(
        { error: 'No audio file provided' },
        { status: 400 }
      );
    }
    
    // Create recordings directory if it doesn't exist
    const recordingsDir = join(process.cwd(), 'public', 'recordings');
    try {
      await mkdir(recordingsDir, { recursive: true });
    } catch (error) {
      console.error('Error creating recordings directory:', error);
    }
    
    // Get the file path
    const filePath = join(recordingsDir, audioFile.name);
    
    // Convert file to buffer
    const buffer = Buffer.from(await audioFile.arrayBuffer());
    
    // Write file to disk
    await writeFile(filePath, buffer);
    
    // Return the URL for the saved file
    const fileUrl = `/recordings/${audioFile.name}`;
    
    return NextResponse.json({ 
      success: true, 
      fileUrl,
      message: 'Recording saved successfully' 
    });
  } catch (error) {
    console.error('Error saving recording:', error);
    return NextResponse.json(
      { error: 'Failed to save recording' },
      { status: 500 }
    );
  }
}
