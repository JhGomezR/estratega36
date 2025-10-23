'use server';
import { config } from 'dotenv';
config();

import '@/ai/flows/analyze-campaign-data.ts';
import '@/ai/flows/generate-campaign-strategies.ts';
import '@/ai/flows/geocode-address.ts';
