'use client';
import {createBrowserClient} from '@supabase/ssr';
import {settings} from './config';
export function browserClient(){const {url,key}=settings();return createBrowserClient(url,key);}
