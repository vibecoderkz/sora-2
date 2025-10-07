import OpenAI from 'openai';
import dotenv from 'dotenv';
import { db } from './database.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function createVideo(userId, prompt, model = 'sora-2', seconds = '8', size = '1280x720', imageBuffer = null) {
  try {
    // Check if videos API exists in SDK
    if (!openai.videos) {
      // Use direct API call if SDK doesn't have videos yet

      if (imageBuffer) {
        // Use multipart/form-data for image-to-video with axios
        const FormData = (await import('form-data')).default;
        const formData = new FormData();

        formData.append('prompt', prompt);
        formData.append('model', model);
        formData.append('seconds', seconds);
        formData.append('size', size);
        formData.append('input_reference', imageBuffer, {
          filename: 'image.jpg',
          contentType: 'image/jpeg'
        });

        // Use axios for better multipart/form-data support
        const response = await axios.post('https://api.openai.com/v1/videos', formData, {
          headers: {
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
            ...formData.getHeaders()
          },
          maxContentLength: Infinity,
          maxBodyLength: Infinity
        });

        const video = response.data;

        // Save to database
        db.createVideo(userId, video.id, prompt, model);

        return video;
      } else {
        // Use JSON for text-to-video
        const requestBody = {
          model: model,
          prompt: prompt,
          seconds: seconds,
          size: size
        };

        const response = await fetch('https://api.openai.com/v1/videos', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(`API Error: ${error.error?.message || response.statusText}`);
        }

        const video = await response.json();

        // Save to database
        db.createVideo(userId, video.id, prompt, model);

        return video;
      }
    } else {
      // Use SDK if available (doesn't support image input yet in most SDKs)
      const requestBody = {
        model: model,
        prompt: prompt,
        seconds: seconds,
        size: size
      };

      const video = await openai.videos.create(requestBody);

      // Save to database
      db.createVideo(userId, video.id, prompt, model);

      return video;
    }
  } catch (error) {
    console.error('Error creating video:', error);

    // Handle axios errors
    if (error.response) {
      const errorMessage = error.response.data?.error?.message || error.response.statusText || 'Unknown error';
      throw new Error(`API Error: ${errorMessage}`);
    }

    throw error;
  }
}

export async function pollVideoStatus(videoId) {
  try {
    if (!openai.videos) {
      // Use direct API call
      const response = await fetch(`https://api.openai.com/v1/videos/${videoId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`API Error: ${error.error?.message || response.statusText}`);
      }

      const video = await response.json();

      // Update status in database
      db.updateVideoStatus(videoId, video.status);

      return video;
    } else {
      const video = await openai.videos.retrieve(videoId);

      // Update status in database
      db.updateVideoStatus(videoId, video.status);

      return video;
    }
  } catch (error) {
    console.error('Error polling video status:', error);
    throw error;
  }
}

export async function downloadVideo(videoId) {
  try {
    let arrayBuffer;

    if (!openai.videos) {
      // Use direct API call
      const response = await fetch(`https://api.openai.com/v1/videos/${videoId}/content`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`API Error: ${error.error?.message || response.statusText}`);
      }

      arrayBuffer = await response.arrayBuffer();
    } else {
      const content = await openai.videos.downloadContent(videoId);
      arrayBuffer = await content.arrayBuffer();
    }

    const buffer = Buffer.from(arrayBuffer);

    // Save to temp directory
    const videosDir = path.join(__dirname, '..', 'data', 'videos');
    if (!fs.existsSync(videosDir)) {
      fs.mkdirSync(videosDir, { recursive: true });
    }

    const filePath = path.join(videosDir, `${videoId}.mp4`);
    fs.writeFileSync(filePath, buffer);

    return filePath;
  } catch (error) {
    console.error('Error downloading video:', error);
    throw error;
  }
}

export async function createAndWaitForVideo(userId, prompt, model, progressCallback) {
  const video = await createVideo(userId, prompt, model);

  // Poll for completion
  let currentVideo = video;
  while (currentVideo.status === 'queued' || currentVideo.status === 'in_progress') {
    await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
    currentVideo = await pollVideoStatus(video.id);

    if (progressCallback) {
      progressCallback(currentVideo);
    }
  }

  if (currentVideo.status === 'completed') {
    const filePath = await downloadVideo(video.id);
    return { video: currentVideo, filePath };
  } else {
    throw new Error(`Video generation failed with status: ${currentVideo.status}`);
  }
}
