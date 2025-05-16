import { Buffer } from 'buffer';

// Set up Buffer for browser environments
if (typeof window !== 'undefined') {
  window.Buffer = window.Buffer || Buffer;
}