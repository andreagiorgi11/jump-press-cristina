'use client';
import {useEffect} from 'react';
// English pages declare their language to browsers, screen readers and the clipping viewer.
export default function EnglishDocument(){useEffect(()=>{document.documentElement.lang='en';},[]);return null;}
