// SPDX-FileCopyrightText: 2024 LiveKit, Inc.
//
// SPDX-License-Identifier: Apache-2.0
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { type JobContext, WorkerOptions, cli, defineAgent, multimodal } from '@livekit/agents';
import * as openai from '@livekit/agents-plugin-openai';
import dotenv from 'dotenv';
import { z } from 'zod';


 const context = {
  teamHistory: {
    name: 'Unit A',
    description: 'Unit A is a young and ambitious group of developers with a passion for creating innovative solutions using cutting-edge technologies. Founded in 2022, the team initially came together to collaborate on projects aimed at improving education through technology.',
    mission: 'Unit A’s mission is to make learning accessible and enjoyable by developing interactive applications that integrate real-time AI functionalities. They are particularly focused on language learning and user engagement through seamless real-time experiences.',
    achievements: [
      'Developed a language learning app that helps users practice different English accents in real-time, receiving feedback from AI.',
      'Implemented an innovative chat-based learning system for helping users improve their conversational English skills.',
      'Collaborated with industry experts to fine-tune AI models for personalized learning experiences.'
    ],
    futureGoals: 'Unit A aims to expand its offerings to include support for other languages and dialects while continuing to leverage AI and real-time technologies to enhance educational outcomes.',
  }
};


const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, '../.env.local');
dotenv.config({ path: envPath });

export default defineAgent({
  entry: async (ctx: JobContext) => {
    await ctx.connect();

    console.log('waiting for participant');
    const participant = await ctx.waitForParticipant();

    console.log(`starting assistant example agent for ${participant.identity}`);

    const model = new openai.realtime.RealtimeModel({
      instructions: `You are a helpful AI assistant developed by ${context.teamHistory.name}, ${context.teamHistory.description}. Your primary goal is to assist users in learning various topics, providing educational and interactive guidance. You should be responsive, adaptive, and capable of offering personalized learning experiences based on real-time interactions. Incorporate examples, cultural insights, and offer detailed explanations to engage users effectively. Remember to align with ${context.teamHistory.name}'s mission: "${context.teamHistory.mission}", focusing on making learning accessible, enjoyable, and enhanced through real-time AI technology.`
    });

    const agent = new multimodal.MultimodalAgent({
      model,
      fncCtx: {
        weather: {
          description: 'Get the weather in a location',
          parameters: z.object({
            location: z.string().describe('The location to get the weather for'),
          }),
          execute: async ({ location }) => {
            console.debug(`executing weather function for ${location}`);
            return await fetch(`https://wttr.in/${location}?format=%C+%t`)
              .then((data) => data.text())
              .then((data) => `The weather in ${location} right now is ${data}.`);
          },
        },
      },
    });

    const session = await agent
      .start(ctx.room, participant)
      .then((session) => session as openai.realtime.RealtimeSession);

    session.conversation.item.create({
      type: 'message',
      role: 'user',
      content: [{ type: 'input_text', text: 'Say "How can I help you today?"' }],
    });
    session.response.create();
  },
});

cli.runApp(new WorkerOptions({ agent: fileURLToPath(import.meta.url) }));
