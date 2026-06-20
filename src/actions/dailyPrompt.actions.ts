"use server";

const DAILY_PROMPTS = [
  "What's the best Christopher Nolan movie?",
  "What is the saddest ending to a film you've ever seen?",
  "What is your favorite Telugu film?",
  "Which movie do you think is the most overrated?",
  "Which movie has the best sci-fi world-building?",
  "What's a movie that always makes you laugh out loud?",
  "Who is the greatest movie villain of all time?",
  "What is the most beautiful movie you've ever watched?",
  "Which movie soundtrack do you listen to the most?",
  "What's a movie you love that everyone else seems to hate?",
  "Which actor always delivers a 10/10 performance?",
  "What is the best plot twist in cinematic history?",
  "Which movie sequel is actually better than the original?",
  "What's your favorite animated movie?",
  "Which movie has the best opening scene?",
  "What's a movie that you can rewatch endlessly?",
  "Which director's filmography is completely flawless?",
  "What is the scariest movie you've ever seen?",
  "Which movie has the best action sequences?",
  "What's a movie that changed your perspective on life?",
  "Which movie adaptation was better than the book?",
  "What's the most underrated movie of the past decade?",
  "Which movie has the most satisfying ending?",
  "What's your favorite romantic movie?",
  "Which movie has the best costume design?",
  "What's a movie that you think everyone should watch at least once?",
  "Which movie makes you feel the most nostalgic?",
  "What's the best movie franchise of all time?",
  "Which movie has the most iconic dialogue?",
  "What's your favorite documentary?"
];

/**
 * Returns a daily prompt that changes every 24 hours (UTC).
 * Uses a deterministic hash based on the current date.
 */
export async function getDailyPrompt(): Promise<string> {
  // Number of days since UNIX epoch
  const daysSinceEpoch = Math.floor(Date.now() / (1000 * 60 * 60 * 24));
  const index = daysSinceEpoch % DAILY_PROMPTS.length;
  
  return DAILY_PROMPTS[index];
}
